import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { AuthContext } from '../auth/auth.types';
import { Auth, Roles } from '../auth/decorators';
import { AuditService } from '../common/audit';
import { Errors } from '../common/errors';
import { ZodBody, ZodQuery, type Infer } from '../common/zod';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../infra/infra.module';
import { MAX_BYTES } from '../media/file-type';
import { MediaService } from '../media/media.module';
import { ContentAdminService } from './content-admin.service';
import { OpsAdminService } from './ops-admin.service';
import * as S from './schemas';

type Id = string;
const uuid = new ParseUUIDPipe();

@ApiTags('admin: content')
@Roles('ADMIN')
@Controller('admin')
export class ContentAdminController {
  constructor(
    private readonly cms: ContentAdminService,
    private readonly content: ContentService,
  ) {}

  /** Exercise types the engine knows, with JSON schemas for the CMS config editor. */
  @Get('exercise-types')
  types() {
    return this.content.registry.list().map((t) => ({
      key: t.key,
      label: t.label,
      skills: t.skills,
      configSchema: (zodToJsonSchema as (s: unknown, o: object) => unknown)(t.configSchema, {
        target: 'openApi3',
        $refStrategy: 'none',
      }),
    }));
  }

  @Get('phonemes')
  phonemes() {
    return this.cms.listPhonemes();
  }
  @Patch('phonemes/:id')
  updatePhoneme(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.PhonemeUpdate) b: Infer<typeof S.PhonemeUpdate>,
  ) {
    return this.cms.updatePhoneme(a.user.id, id, b);
  }

  @Get('letters')
  letters() {
    return this.cms.listLetters();
  }
  @Patch('letters/:id')
  updateLetter(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.LetterUpdate) b: Infer<typeof S.LetterUpdate>,
  ) {
    return this.cms.updateLetter(a.user.id, id, b);
  }

  @Get('words')
  words(@ZodQuery(S.WordQuery) q: Infer<typeof S.WordQuery>) {
    return this.cms.listWords(q);
  }
  @Post('words')
  createWord(@Auth() a: AuthContext, @ZodBody(S.WordCreate) b: Infer<typeof S.WordCreate>) {
    return this.cms.createWord(a.user.id, b);
  }
  @Patch('words/:id')
  updateWord(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.WordUpdate) b: Infer<typeof S.WordUpdate>,
  ) {
    return this.cms.updateWord(a.user.id, id, b);
  }
  @Delete('words/:id')
  deleteWord(@Auth() a: AuthContext, @Param('id', uuid) id: Id) {
    return this.cms.deleteWord(a.user.id, id);
  }

  @Get('sentences')
  sentences() {
    return this.cms.listSentences();
  }
  @Post('sentences')
  createSentence(@Auth() a: AuthContext, @ZodBody(S.SentenceCreate) b: Infer<typeof S.SentenceCreate>) {
    return this.cms.createSentence(a.user.id, b);
  }
  @Patch('sentences/:id')
  updateSentence(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.SentenceUpdate) b: Infer<typeof S.SentenceUpdate>,
  ) {
    return this.cms.updateSentence(a.user.id, id, b);
  }
  @Delete('sentences/:id')
  deleteSentence(@Auth() a: AuthContext, @Param('id', uuid) id: Id) {
    return this.cms.deleteSentence(a.user.id, id);
  }

  @Get('curriculum')
  tree() {
    return this.cms.tree();
  }
  @Post('worlds')
  createWorld(@Auth() a: AuthContext, @ZodBody(S.WorldCreate) b: Infer<typeof S.WorldCreate>) {
    return this.cms.createWorld(a.user.id, b);
  }
  @Patch('worlds/:id')
  updateWorld(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.WorldUpdate) b: Infer<typeof S.WorldUpdate>,
  ) {
    return this.cms.updateWorld(a.user.id, id, b);
  }
  @Post('levels')
  createLevel(@Auth() a: AuthContext, @ZodBody(S.LevelCreate) b: Infer<typeof S.LevelCreate>) {
    return this.cms.createLevel(a.user.id, b);
  }
  @Patch('levels/:id')
  updateLevel(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.LevelUpdate) b: Infer<typeof S.LevelUpdate>,
  ) {
    return this.cms.updateLevel(a.user.id, id, b);
  }

  @Get('lessons/:id')
  lesson(@Param('id', uuid) id: Id) {
    return this.cms.lesson(id);
  }
  @Post('lessons')
  createLesson(@Auth() a: AuthContext, @ZodBody(S.LessonCreate) b: Infer<typeof S.LessonCreate>) {
    return this.cms.createLesson(a.user.id, b);
  }
  @Patch('lessons/:id')
  updateLesson(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.LessonUpdate) b: Infer<typeof S.LessonUpdate>,
  ) {
    return this.cms.updateLesson(a.user.id, id, b);
  }
  @Get('lessons/:id/validate')
  async validate(@Param('id', uuid) id: Id) {
    return { problems: await this.cms.validateLesson(id) };
  }
  @HttpCode(200)
  @Post('lessons/:id/preview')
  preview(@Param('id', uuid) id: Id) {
    return this.cms.preview(id);
  }
  @Post('lessons/:id/exercises')
  addExercise(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.ExerciseCreate) b: Infer<typeof S.ExerciseCreate>,
  ) {
    return this.cms.addExercise(a.user.id, id, b);
  }
  @Put('lessons/:id/exercises/order')
  reorder(@Auth() a: AuthContext, @Param('id', uuid) id: Id, @ZodBody(S.Reorder) b: Infer<typeof S.Reorder>) {
    return this.cms.reorderExercises(a.user.id, id, b.ids);
  }
  @Patch('exercises/:id')
  updateExercise(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.ExerciseUpdate) b: Infer<typeof S.ExerciseUpdate>,
  ) {
    return this.cms.updateExercise(a.user.id, id, b);
  }
  @Delete('exercises/:id')
  deleteExercise(@Auth() a: AuthContext, @Param('id', uuid) id: Id) {
    return this.cms.deleteExercise(a.user.id, id);
  }

  @Get('games')
  games() {
    return this.cms.listGames();
  }
  @Post('games')
  createGame(@Auth() a: AuthContext, @ZodBody(S.GameCreate) b: Infer<typeof S.GameCreate>) {
    return this.cms.createGame(a.user.id, b);
  }
  @Patch('games/:id')
  updateGame(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.GameUpdate) b: Infer<typeof S.GameUpdate>,
  ) {
    return this.cms.updateGame(a.user.id, id, b);
  }

  @Get('achievements')
  achievements() {
    return this.cms.listAchievements();
  }
  @Post('achievements')
  createAchievement(
    @Auth() a: AuthContext,
    @ZodBody(S.AchievementCreate) b: Infer<typeof S.AchievementCreate>,
  ) {
    return this.cms.createAchievement(a.user.id, b);
  }
  @Patch('achievements/:id')
  updateAchievement(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.AchievementUpdate) b: Infer<typeof S.AchievementUpdate>,
  ) {
    return this.cms.updateAchievement(a.user.id, id, b);
  }

  @Get('missions')
  missions() {
    return this.cms.listMissions();
  }
  @Post('missions')
  createMission(@Auth() a: AuthContext, @ZodBody(S.MissionCreate) b: Infer<typeof S.MissionCreate>) {
    return this.cms.createMission(a.user.id, b);
  }
  @Patch('missions/:id')
  updateMission(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.MissionUpdate) b: Infer<typeof S.MissionUpdate>,
  ) {
    return this.cms.updateMission(a.user.id, id, b);
  }
}

@ApiTags('admin: media')
@Roles('ADMIN')
@Controller('admin/media')
export class MediaAdminController {
  constructor(
    private readonly media: MediaService,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('audio')
  async audio() {
    const rows = await this.prisma.audioAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map((r) => ({ ...r, url: this.media.url(r.storageKey) }));
  }

  @Get('images')
  async images() {
    const rows = await this.prisma.imageAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map((r) => ({ ...r, url: this.media.url(r.storageKey) }));
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES.audio, files: 1 } }))
  @Post('audio')
  async uploadAudio(
    @Auth() a: AuthContext,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
  ) {
    if (!file) throw Errors.badRequest('FILE_REQUIRED');
    const meta = S.MediaMeta.parse(body ?? {});
    const asset = await this.media.upload('audio', file, {
      uploadedById: a.user.id,
      caption: meta.caption ?? null,
    });
    await this.audit.log(a.user.id, 'media.upload', 'audio', asset.id);
    return { ...asset, url: this.media.url(asset.storageKey) };
  }

  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES.image, files: 1 } }))
  @Post('images')
  async uploadImage(
    @Auth() a: AuthContext,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: unknown,
  ) {
    if (!file) throw Errors.badRequest('FILE_REQUIRED');
    const meta = S.MediaMeta.parse(body ?? {});
    const alt = {
      en: meta.altEn ?? '',
      ...(meta.altKk ? { kk: meta.altKk } : {}),
      ...(meta.altRu ? { ru: meta.altRu } : {}),
    };
    const asset = await this.media.upload('image', file, { uploadedById: a.user.id, alt });
    await this.audit.log(a.user.id, 'media.upload', 'image', asset.id);
    return { ...asset, url: this.media.url(asset.storageKey) };
  }

  /** Deletes an unused asset (file and record). Assets still linked to content cannot be deleted. */
  @Delete(':kind/:id')
  async remove(@Auth() a: AuthContext, @Param('kind') kind: string, @Param('id', uuid) id: Id) {
    if (kind === 'audio') {
      const asset = await this.prisma.audioAsset.findUnique({
        where: { id },
        include: { _count: { select: { letters: true, phonemes: true, words: true, sentences: true } } },
      });
      if (!asset) throw Errors.notFound('Media');
      if (Object.values(asset._count).some((n) => n > 0))
        throw Errors.badRequest('IN_USE', 'Unlink the file from content first');
      await this.prisma.audioAsset.delete({ where: { id } });
      await this.media.remove(asset.storageKey);
    } else if (kind === 'images') {
      const asset = await this.prisma.imageAsset.findUnique({
        where: { id },
        include: { _count: { select: { letters: true, phonemes: true, words: true, sentences: true } } },
      });
      if (!asset) throw Errors.notFound('Media');
      if (Object.values(asset._count).some((n) => n > 0))
        throw Errors.badRequest('IN_USE', 'Unlink the file from content first');
      await this.prisma.imageAsset.delete({ where: { id } });
      await this.media.remove(asset.storageKey);
    } else {
      throw Errors.notFound('Media');
    }
    await this.audit.log(a.user.id, 'media.delete', kind, id);
    return { ok: true };
  }
}

@ApiTags('admin: operations')
@Roles('ADMIN')
@Controller('admin')
export class OpsAdminController {
  constructor(private readonly ops: OpsAdminService) {}

  @Get('overview')
  overview() {
    return this.ops.overview();
  }

  @Get('analytics')
  analytics(@ZodQuery(S.AnalyticsQuery) q: Infer<typeof S.AnalyticsQuery>) {
    return this.ops.analytics(q.days);
  }

  @Get('users')
  users(@ZodQuery(S.UserQuery) q: Infer<typeof S.UserQuery>) {
    return this.ops.users(q);
  }
  @Patch('users/:id')
  updateUser(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.UserUpdate) b: Infer<typeof S.UserUpdate>,
  ) {
    return this.ops.updateUser(a.user.id, id, b);
  }
  @HttpCode(200)
  @Post('users/:id/revoke-sessions')
  revoke(@Auth() a: AuthContext, @Param('id', uuid) id: Id) {
    return this.ops.revokeSessions(a.user.id, id);
  }

  @Get('subscriptions')
  subscriptions() {
    return this.ops.subscriptions();
  }
  @Post('subscriptions')
  createSubscription(
    @Auth() a: AuthContext,
    @ZodBody(S.SubscriptionCreate) b: Infer<typeof S.SubscriptionCreate>,
  ) {
    return this.ops.createSubscription(a.user.id, b);
  }
  @Patch('subscriptions/:id')
  updateSubscription(
    @Auth() a: AuthContext,
    @Param('id', uuid) id: Id,
    @ZodBody(S.SubscriptionUpdate) b: Infer<typeof S.SubscriptionUpdate>,
  ) {
    return this.ops.updateSubscription(a.user.id, id, b);
  }

  @Get('settings')
  settings() {
    return this.ops.settings();
  }
  @Put('settings/:key')
  updateSetting(@Auth() a: AuthContext, @Param('key') key: string, @Body() body: unknown) {
    return this.ops.updateSetting(a.user.id, key, body);
  }

  @Get('audit')
  audit(@ZodQuery(S.Paging) q: Infer<typeof S.Paging>) {
    return this.ops.auditLog(q);
  }
}

@Module({
  controllers: [ContentAdminController, MediaAdminController, OpsAdminController],
  providers: [ContentAdminService, OpsAdminService],
})
export class AdminModule {}
