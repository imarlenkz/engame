import {
  Controller,
  Delete,
  Get,
  Global,
  HttpCode,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ConsentType } from '@engame/database';
import { z } from 'zod';
import { AnalyticsService } from '../analytics/analytics.service';
import type { AuthContext } from '../auth/auth.types';
import { Auth, RequireParentMode, Roles } from '../auth/decorators';
import { AuditService } from '../common/audit';
import { Errors } from '../common/errors';
import { ZodBody, type Infer } from '../common/zod';
import { PrismaService } from '../infra/infra.module';

export const AVATARS = [
  'fox',
  'owl',
  'bear',
  'cat',
  'rabbit',
  'panda',
  'lion',
  'penguin',
  'frog',
  'unicorn',
] as const;
/** Bump when the consent wording shown to parents changes; old records stay as history. */
export const CONSENT_VERSION = '2026-10';
const MAX_CHILDREN = 6;

const AgeGroup = z.enum(['AGE_4_5', 'AGE_6_7', 'AGE_8_9', 'AGE_10_11']);
const Nickname = z
  .string()
  .trim()
  .min(1)
  .max(24)
  // Nicknames only: letters (any script), digits, spaces, dashes. Keeps free text from children out of the DB.
  .regex(/^[\p{L}\p{N} '-]+$/u);

const CreateChildSchema = z.object({
  nickname: Nickname,
  avatar: z.enum(AVATARS).default('fox'),
  ageGroup: AgeGroup,
  consents: z.object({
    dataProcessing: z.literal(true, { errorMap: () => ({ message: 'Parental consent is required' }) }),
    voiceProcessing: z.boolean().default(false),
  }),
});
const UpdateChildSchema = z.object({
  nickname: Nickname.optional(),
  avatar: z.enum(AVATARS).optional(),
  ageGroup: AgeGroup.optional(),
});
const ConsentSchema = z.object({ type: z.enum(['VOICE_PROCESSING', 'VOICE_STORAGE']), granted: z.boolean() });

@Injectable()
export class ChildrenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly audit: AuditService,
  ) {}

  async consents(childId: string): Promise<Record<ConsentType, boolean>> {
    const rows = await this.prisma.consentRecord.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
    });
    const latest = (type: ConsentType) => rows.find((r) => r.type === type)?.granted ?? false;
    return {
      DATA_PROCESSING: latest('DATA_PROCESSING'),
      VOICE_PROCESSING: latest('VOICE_PROCESSING'),
      VOICE_STORAGE: latest('VOICE_STORAGE'),
    };
  }

  async assertGuardian(parentId: string, childId: string) {
    const link = await this.prisma.guardianship.findUnique({
      where: { parentId_childId: { parentId, childId } },
      include: { child: true },
    });
    if (!link || link.child.deletedAt) throw Errors.notFound('Child');
    return link.child;
  }

  async list(parentId: string) {
    const links = await this.prisma.guardianship.findMany({
      where: { parentId, child: { deletedAt: null } },
      include: {
        child: {
          include: {
            streak: true,
            classMemberships: { include: { class: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(
      links.map(async ({ child }) => ({
        id: child.id,
        nickname: child.nickname,
        avatar: child.avatar,
        ageGroup: child.ageGroup,
        level: child.level,
        xp: child.xp,
        hasOwnLogin: child.userId != null,
        classes: child.classMemberships.map((m) => m.class),
        consents: await this.consents(child.id),
      })),
    );
  }

  async create(parentId: string, body: Infer<typeof CreateChildSchema>) {
    const count = await this.prisma.guardianship.count({ where: { parentId, child: { deletedAt: null } } });
    if (count >= MAX_CHILDREN)
      throw Errors.badRequest('CHILD_LIMIT', `At most ${MAX_CHILDREN} children per parent`);
    const child = await this.prisma.$transaction(async (tx) => {
      await tx.parentProfile.upsert({
        where: { userId: parentId },
        update: {},
        create: { userId: parentId },
      });
      const c = await tx.childProfile.create({
        data: { nickname: body.nickname, avatar: body.avatar, ageGroup: body.ageGroup },
      });
      await tx.guardianship.create({ data: { parentId, childId: c.id } });
      await tx.consentRecord.createMany({
        data: [
          { parentId, childId: c.id, type: 'DATA_PROCESSING', granted: true, version: CONSENT_VERSION },
          {
            parentId,
            childId: c.id,
            type: 'VOICE_PROCESSING',
            granted: body.consents.voiceProcessing,
            version: CONSENT_VERSION,
          },
        ],
      });
      return c;
    });
    await this.analytics.track(
      'child_created',
      { userId: parentId, childId: child.id },
      { ageGroup: child.ageGroup },
    );
    await this.audit.log(parentId, 'child.create', 'child', child.id);
    return {
      id: child.id,
      nickname: child.nickname,
      avatar: child.avatar,
      ageGroup: child.ageGroup,
      consents: await this.consents(child.id),
    };
  }

  async update(parentId: string, childId: string, body: Infer<typeof UpdateChildSchema>) {
    await this.assertGuardian(parentId, childId);
    const c = await this.prisma.childProfile.update({ where: { id: childId }, data: body });
    return { id: c.id, nickname: c.nickname, avatar: c.avatar, ageGroup: c.ageGroup };
  }

  /** Deletes the child and all of their learning data. Irreversible; the UI asks for confirmation. */
  async remove(parentId: string, childId: string) {
    const child = await this.assertGuardian(parentId, childId);
    const others = await this.prisma.guardianship.count({ where: { childId, parentId: { not: parentId } } });
    if (others > 0 || child.userId) {
      // Shared with another guardian, or a school (iMARLEN) account: only unlink this parent.
      await this.prisma.guardianship.delete({ where: { parentId_childId: { parentId, childId } } });
      await this.audit.log(parentId, 'child.unlink', 'child', childId);
      return { deleted: false, unlinked: true };
    }
    await this.prisma.$transaction([
      this.prisma.session.updateMany({ where: { activeChildId: childId }, data: { activeChildId: null } }),
      this.prisma.analyticsEvent.deleteMany({ where: { childId } }),
      this.prisma.childProfile.delete({ where: { id: childId } }),
    ]);
    await this.audit.log(parentId, 'child.delete', 'child', childId);
    return { deleted: true, unlinked: true };
  }

  async select(auth: AuthContext, childId: string) {
    await this.assertGuardian(auth.user.id, childId);
    // A child must not be able to leave their profile and reach parent screens, so a lock is required first.
    const profile = await this.prisma.parentProfile.findUnique({ where: { userId: auth.user.id } });
    if (!profile?.pinHash && !auth.user.passwordHash)
      throw Errors.badRequest('PIN_REQUIRED', 'Set a parent PIN first');
    await this.prisma.session.update({
      where: { id: auth.session.id },
      data: { activeChildId: childId, parentModeUntil: null },
    });
    return { activeChildId: childId };
  }

  async exit(auth: AuthContext) {
    await this.prisma.session.update({
      where: { id: auth.session.id },
      data: { activeChildId: null, parentModeUntil: null },
    });
    return { activeChildId: null };
  }

  async setConsent(parentId: string, childId: string, body: Infer<typeof ConsentSchema>) {
    await this.assertGuardian(parentId, childId);
    await this.prisma.parentProfile.upsert({
      where: { userId: parentId },
      update: {},
      create: { userId: parentId },
    });
    await this.prisma.consentRecord.create({
      data: { parentId, childId, type: body.type, granted: body.granted, version: CONSENT_VERSION },
    });
    await this.audit.log(parentId, body.granted ? 'consent.grant' : 'consent.revoke', 'child', childId, {
      type: body.type,
    });
    return this.consents(childId);
  }
}

@ApiTags('children')
@Roles('PARENT')
@RequireParentMode()
@Controller('children')
export class ChildrenController {
  constructor(private readonly children: ChildrenService) {}

  @Get()
  list(@Auth() auth: AuthContext) {
    return this.children.list(auth.user.id);
  }

  @Post()
  create(@Auth() auth: AuthContext, @ZodBody(CreateChildSchema) body: Infer<typeof CreateChildSchema>) {
    return this.children.create(auth.user.id, body);
  }

  @Patch(':id')
  update(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateChildSchema) body: Infer<typeof UpdateChildSchema>,
  ) {
    return this.children.update(auth.user.id, id, body);
  }

  @Delete(':id')
  remove(@Auth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.children.remove(auth.user.id, id);
  }

  /** Hand the device to this child. Parent screens lock until the PIN/password is entered again. */
  @HttpCode(200)
  @Post(':id/select')
  select(@Auth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.children.select(auth, id);
  }

  @HttpCode(200)
  @Post('exit')
  exit(@Auth() auth: AuthContext) {
    return this.children.exit(auth);
  }

  @Get(':id/consents')
  async consents(@Auth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    await this.children.assertGuardian(auth.user.id, id);
    return this.children.consents(id);
  }

  @Put(':id/consents')
  setConsent(
    @Auth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ConsentSchema) body: Infer<typeof ConsentSchema>,
  ) {
    return this.children.setConsent(auth.user.id, id, body);
  }
}

@Global()
@Module({ controllers: [ChildrenController], providers: [ChildrenService], exports: [ChildrenService] })
export class ChildrenModule {}
