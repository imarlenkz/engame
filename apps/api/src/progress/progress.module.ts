import { Controller, Get, Module, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthContext } from '../auth/auth.types';
import { ChildAccessService, ChildGuard } from '../auth/child.guard';
import { ActingChild, Auth, RequireParentMode } from '../auth/decorators';
import { ZodBody, type Infer } from '../common/zod';
import { PrismaService } from '../infra/infra.module';
import { AVATARS } from '../children/children.module';
import { ProgressService } from './progress.service';

const ProfileSchema = z.object({ avatar: z.enum(AVATARS) });

@ApiTags('progress')
@Controller()
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly access: ChildAccessService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(ChildGuard)
  @Get('child/dashboard')
  dashboard(@ActingChild() childId: string) {
    return this.progress.dashboard(childId);
  }

  /** The child may change their own avatar; nickname and age group are the parent's call. */
  @UseGuards(ChildGuard)
  @Patch('child/profile')
  async updateProfile(
    @ActingChild() childId: string,
    @ZodBody(ProfileSchema) body: Infer<typeof ProfileSchema>,
  ) {
    const child = await this.prisma.childProfile.update({
      where: { id: childId },
      data: { avatar: body.avatar },
    });
    return { id: child.id, nickname: child.nickname, avatar: child.avatar, ageGroup: child.ageGroup };
  }

  @UseGuards(ChildGuard)
  @Get('progress')
  own(@ActingChild() childId: string) {
    return this.progress.report(childId);
  }

  @UseGuards(ChildGuard)
  @Get('achievements')
  achievements(@ActingChild() childId: string) {
    return this.progress.achievements(childId);
  }

  /** Parent, teacher or admin view of one child's report. */
  @RequireParentMode()
  @Get('progress/children/:id')
  async child(@Auth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    await this.access.assertCanView(auth.user, id);
    return this.progress.report(id);
  }
}

@Module({ controllers: [ProgressController], providers: [ProgressService], exports: [ProgressService] })
export class ProgressModule {}
