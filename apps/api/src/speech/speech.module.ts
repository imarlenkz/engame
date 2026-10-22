import {
  Controller,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Logger,
  Module,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Prisma } from '@engame/database';
import { z } from 'zod';
import { AnalyticsService } from '../analytics/analytics.service';
import { ChildGuard } from '../auth/child.guard';
import { ActingChild } from '../auth/decorators';
import { Errors } from '../common/errors';
import { RateLimit } from '../common/rate-limit';
import { ZodBody, type Infer } from '../common/zod';
import { ENV, type Env } from '../config/env';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../infra/infra.module';
import { MasteryService } from '../learning/mastery.service';
import { RunService } from '../learning/run.service';
import { detectFileType, MAX_BYTES } from '../media/file-type';
import { createSpeechProvider, SPEECH, transcriptScore, type SpeechProvider } from './speech-provider';

const PASS_SCORE = 60;

const PronunciationSchema = z.object({
  runToken: z.string().max(20_000),
  itemId: z.string().max(200),
  clientId: z.string().min(8).max(64),
});

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  constructor(
    @Inject(SPEECH) private readonly provider: SpeechProvider | null,
    private readonly prisma: PrismaService,
    private readonly runs: RunService,
    private readonly content: ContentService,
    private readonly mastery: MasteryService,
    private readonly analytics: AnalyticsService,
  ) {}

  async voiceConsent(childId: string): Promise<boolean> {
    const latest = await this.prisma.consentRecord.findFirst({
      where: { childId, type: 'VOICE_PROCESSING' },
      orderBy: { createdAt: 'desc' },
    });
    return latest?.granted ?? false;
  }

  async capabilities(childId: string) {
    const consent = await this.voiceConsent(childId);
    return {
      provider: this.provider?.name ?? null,
      available: Boolean(this.provider) && consent,
      reason: !this.provider ? 'NOT_CONFIGURED' : !consent ? 'NO_CONSENT' : null,
      // Audio is sent to the provider for transcription and then discarded; nothing is written to storage.
      storesAudio: false,
      approximate: true,
    };
  }

  async assess(
    childId: string,
    body: Infer<typeof PronunciationSchema>,
    file: Express.Multer.File | undefined,
  ) {
    if (!this.provider)
      throw Errors.badRequest('SPEECH_NOT_CONFIGURED', 'Pronunciation checking is not enabled');
    if (!(await this.voiceConsent(childId)))
      throw Errors.forbidden('A parent has not allowed voice processing');
    if (!file?.buffer?.length) throw Errors.badRequest('AUDIO_REQUIRED');
    const type = detectFileType(file.buffer);
    if (!type || type.kind !== 'audio' || file.buffer.length > MAX_BYTES.audio)
      throw Errors.badRequest('AUDIO_INVALID');

    const run = this.runs.verify(body.runToken, childId);
    const existing = await this.prisma.attempt.findUnique({ where: { clientId: body.clientId } });
    if (existing) {
      if (existing.childId !== childId) throw Errors.conflict('CLIENT_ID_REUSED');
      return {
        itemId: body.itemId,
        score: existing.score ?? 0,
        correct: existing.correct,
        transcript: null,
        duplicate: true,
        approximate: true,
      };
    }
    const item = (await this.runs.steps(run)).flatMap((s) => s.items).find((i) => i.id === body.itemId);
    if (!item || item.view.kind !== 'speak') throw Errors.badRequest('ITEM_NOT_SPEAKABLE');
    const target = item.view.target;

    let transcript: string;
    try {
      transcript = (
        await this.provider.transcribe(file.buffer, type.mime, { language: 'en', prompt: target })
      ).text;
    } catch (err) {
      this.logger.warn({ err }, 'Speech provider failed');
      throw Errors.badRequest('SPEECH_UNAVAILABLE', 'Could not check pronunciation right now');
    } finally {
      // The recording lives only in this request's memory.
      file.buffer.fill(0);
    }
    const score = transcriptScore(target, transcript);
    const correct = score >= PASS_SCORE;
    const ids = await this.content.ids();
    const word = item.targets.find((t) => t.type === 'WORD');
    const phoneme = item.targets.find((t) => t.type === 'PHONEME');
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${childId}))`;
      await tx.attempt.create({
        data: {
          childId,
          clientId: body.clientId,
          runId: run.rid,
          exerciseId: run.ex.includes(item.id.slice(0, item.id.lastIndexOf(':')))
            ? item.id.slice(0, item.id.lastIndexOf(':'))
            : null,
          phonemeId: phoneme ? (ids.PHONEME.get(phoneme.key) ?? null) : null,
          wordId: word ? (ids.WORD.get(word.key) ?? null) : null,
          correct,
          score,
          // The transcript is model output about a word list item, kept short; no audio is stored.
          answer: {
            itemId: item.id,
            value: { kind: 'speech', transcript: transcript.slice(0, 120) },
            first: false,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      await this.mastery.observe(
        tx,
        childId,
        item.targets,
        { correct, quality: score, pronunciation: true },
        now,
      );
    });
    await this.analytics.track('pronunciation_attempt', { childId }, { score, provider: this.provider.name });
    return {
      itemId: item.id,
      score,
      correct,
      transcript: transcript.slice(0, 120),
      duplicate: false,
      approximate: true,
    };
  }
}

@ApiTags('pronunciation')
@UseGuards(ChildGuard)
@Controller('pronunciation')
export class SpeechController {
  constructor(private readonly speech: SpeechService) {}

  @Get('capabilities')
  capabilities(@ActingChild() childId: string) {
    return this.speech.capabilities(childId);
  }

  @HttpCode(200)
  @RateLimit({ name: 'pronunciation', limit: 30, windowSec: 60 })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: MAX_BYTES.audio, files: 1 } }))
  @Post('assess')
  assess(
    @ActingChild() childId: string,
    @ZodBody(PronunciationSchema) body: Infer<typeof PronunciationSchema>,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.speech.assess(childId, body, file);
  }
}

@Module({
  controllers: [SpeechController],
  providers: [
    SpeechService,
    { provide: SPEECH, inject: [ENV], useFactory: (env: Env) => createSpeechProvider(env) },
  ],
})
export class SpeechModule {}
