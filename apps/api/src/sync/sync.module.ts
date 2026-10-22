import { Controller, HttpCode, Injectable, Logger, Module, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AnalyticsService } from '../analytics/analytics.service';
import { ChildGuard } from '../auth/child.guard';
import { ActingChild } from '../auth/decorators';
import { AppError } from '../common/errors';
import { RateLimit } from '../common/rate-limit';
import { ZodBody, type Infer } from '../common/zod';
import { AnswerValueSchema } from '../learning/learning.controller';
import { LearningService } from '../learning/learning.service';
import { RunService } from '../learning/run.service';

const MAX_SKEW_MS = 7 * 86_400_000;

const SyncSchema = z.object({
  runs: z
    .array(
      z.object({
        runToken: z.string().max(20_000),
        answers: z
          .array(
            z.object({
              itemId: z.string().max(200),
              clientId: z.string().min(8).max(64),
              answer: AnswerValueSchema,
              responseMs: z.number().int().min(0).max(3_600_000).optional(),
              answeredAt: z.coerce.date(),
            }),
          )
          .max(300),
        complete: z
          .object({
            durationSec: z.number().int().min(0).max(36_000).optional(),
            completedAt: z.coerce.date(),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(20),
});

/**
 * Offline play: the PWA stores answers in IndexedDB and replays them here. Answers are graded server-side from the
 * signed run token (never trusted from the client), deduplicated by clientId, and the run is completed once.
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly runs: RunService,
    private readonly learning: LearningService,
    private readonly analytics: AnalyticsService,
  ) {}

  private clamp(d: Date, now: Date) {
    // Client clocks are not trusted beyond a sane window.
    if (d > now) return now;
    if (now.getTime() - d.getTime() > MAX_SKEW_MS) return new Date(now.getTime() - MAX_SKEW_MS);
    return d;
  }

  async sync(childId: string, body: Infer<typeof SyncSchema>) {
    const now = new Date();
    const results = [];
    let answered = 0;
    for (const r of body.runs) {
      try {
        const run = this.runs.verify(r.runToken, childId);
        if (run.kind !== 'lesson' && run.kind !== 'review')
          throw new AppError('RUN_KIND', 400, 'Only lessons can be played offline');
        const steps = await this.runs.steps(run);
        const ordered = [...r.answers].sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime());
        for (const a of ordered) {
          await this.runs.answer(childId, run, { ...a, answeredAt: this.clamp(a.answeredAt, now) }, steps);
          answered++;
        }
        const completion = r.complete
          ? await this.learning.complete(childId, r.runToken, {
              durationSec: r.complete.durationSec,
              completedAt: this.clamp(r.complete.completedAt, now),
            })
          : null;
        results.push({ runId: run.rid, ok: true as const, answers: r.answers.length, completion });
      } catch (err) {
        const code = err instanceof AppError ? err.code : 'SYNC_FAILED';
        if (!(err instanceof AppError)) this.logger.error({ err }, 'Offline sync run failed');
        // Permanent errors (bad token, kind) tell the client to drop the run; others it should retry.
        results.push({ ok: false as const, code, retry: !(err instanceof AppError) });
      }
    }
    await this.analytics.track('offline_sync', { childId }, { runs: body.runs.length, answers: answered });
    return { results };
  }
}

@ApiTags('sync')
@UseGuards(ChildGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @HttpCode(200)
  @RateLimit({ name: 'sync', limit: 30, windowSec: 60 })
  @Post()
  run(@ActingChild() childId: string, @ZodBody(SyncSchema) body: Infer<typeof SyncSchema>) {
    return this.sync.sync(childId, body);
  }
}

@Module({ controllers: [SyncController], providers: [SyncService] })
export class SyncModule {}
