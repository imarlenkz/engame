import { Inject, Injectable } from '@nestjs/common';
import type { LessonStage, Prisma } from '@engame/database';
import {
  toClientItem,
  type Answer,
  type AnswerKey,
  type BuiltItem,
  type ContentIndex,
  type GradeResult,
} from '@engame/phonics-engine';
import { AnalyticsService } from '../analytics/analytics.service';
import { ENV, type Env } from '../config/env';
import { Errors } from '../common/errors';
import { ContentService } from '../content/content.service';
import { PrismaService } from '../infra/infra.module';
import { MasteryService } from './mastery.service';
import { verifyRun, type RunPayload } from './run-token';

export interface RunStep {
  exerciseId: string;
  stage: LessonStage | 'REVIEW' | 'PLACEMENT' | 'GAME';
  type: string;
  items: BuiltItem[];
}

export interface AnswerInput {
  itemId: string;
  answer: Answer;
  responseMs?: number | null;
  clientId: string;
  answeredAt?: Date;
}

export interface AnswerResult extends GradeResult {
  itemId: string;
  firstAttempt: boolean;
  duplicate: boolean;
}

interface StoredAnswer {
  itemId: string;
  value: Answer;
  first: boolean;
}

@Injectable()
export class RunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly mastery: MasteryService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  verify(token: string, childId: string): RunPayload {
    const run = verifyRun(this.env.APP_SECRET, token, childId);
    if (!run) throw Errors.badRequest('RUN_INVALID', 'This activity expired. Please start it again.');
    return run;
  }

  /** Rebuilds the run's items deterministically from its token. */
  async steps(run: RunPayload, index?: ContentIndex): Promise<RunStep[]> {
    const content = index ?? (await this.content.index());
    const dbExercises = run.ex.length
      ? await this.prisma.exercise.findMany({ where: { id: { in: run.ex } } })
      : [];
    const byId = new Map(dbExercises.map((e) => [e.id, e]));
    const steps: RunStep[] = [];
    for (const id of run.ex) {
      const e = byId.get(id);
      if (!e) continue; // removed in the CMS after the run started
      steps.push({
        exerciseId: e.id,
        stage: e.stage,
        type: e.type,
        items: this.content.registry.build(e, content, run.seed),
      });
    }
    const genStage = run.kind === 'placement' ? 'PLACEMENT' : run.kind === 'game' ? 'GAME' : 'REVIEW';
    for (const g of run.gen) {
      steps.push({
        exerciseId: g.id,
        stage: genStage,
        type: g.type,
        items: this.content.registry.build(g, content, run.seed),
      });
    }
    // Lessons end with REVIEW; keep generated review before nothing else, DB stages are already ordered.
    return steps;
  }

  toClient(steps: RunStep[], withKeys: boolean) {
    const keys: Record<string, AnswerKey> = {};
    const out = steps.map((s) => ({
      exerciseId: s.exerciseId,
      stage: s.stage,
      type: s.type,
      items: s.items.map((item) => {
        if (withKeys) keys[item.id] = item.key;
        return toClientItem(item);
      }),
    }));
    return withKeys ? { steps: out, keys } : { steps: out };
  }

  /** Grades and records one answer. Idempotent by clientId; only the first attempt per item counts. */
  async answer(
    childId: string,
    run: RunPayload,
    input: AnswerInput,
    steps?: RunStep[],
  ): Promise<AnswerResult> {
    const existing = await this.prisma.attempt.findUnique({ where: { clientId: input.clientId } });
    const allSteps = steps ?? (await this.steps(run));
    const item = allSteps.flatMap((s) => s.items).find((i) => i.id === input.itemId);
    if (!item) throw Errors.badRequest('ITEM_NOT_IN_RUN', 'Unknown item for this activity');
    const grade = this.content.registry.grade(item, input.answer);

    if (existing) {
      if (existing.childId !== childId) throw Errors.conflict('CLIENT_ID_REUSED');
      const stored = existing.answer as unknown as StoredAnswer | null;
      return { ...grade, itemId: item.id, firstAttempt: stored?.first ?? false, duplicate: true };
    }
    if (grade.correct === null) return { ...grade, itemId: item.id, firstAttempt: false, duplicate: false };

    const now = input.answeredAt && input.answeredAt < new Date() ? input.answeredAt : new Date();
    const exerciseId = item.id.slice(0, item.id.lastIndexOf(':'));
    const isDbExercise = run.ex.includes(exerciseId);
    const phoneme = item.targets.find((t) => t.type === 'PHONEME');
    const word = item.targets.find((t) => t.type === 'WORD');
    const ids = await this.content.ids();

    const firstAttempt = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${childId}))`;
      const prior = await tx.attempt.count({
        where: { childId, runId: run.rid, answer: { path: ['itemId'], equals: item.id } },
      });
      await tx.attempt.create({
        data: {
          childId,
          clientId: input.clientId,
          runId: run.rid,
          exerciseId: isDbExercise ? exerciseId : null,
          gameSessionId: run.kind === 'game' ? run.rid : null,
          phonemeId: phoneme ? (ids.PHONEME.get(phoneme.key) ?? null) : null,
          wordId: word ? (ids.WORD.get(word.key) ?? null) : null,
          correct: grade.correct === true,
          score: grade.score,
          responseMs: input.responseMs ? Math.min(Math.round(input.responseMs), 600_000) : null,
          answer: {
            itemId: item.id,
            value: input.answer,
            first: prior === 0,
          } as unknown as Prisma.InputJsonValue,
          createdAt: now,
        },
      });
      if (prior === 0) {
        await this.mastery.observe(
          tx,
          childId,
          item.targets,
          {
            correct: grade.correct === true,
            responseMs: input.responseMs,
            quality: item.key.kind === 'order' ? grade.score : null,
          },
          now,
        );
      }
      return prior === 0;
    });
    await this.analytics.track(
      grade.correct ? 'answer_correct' : 'answer_wrong',
      { childId },
      { type: item.type, kind: run.kind },
    );
    return { ...grade, itemId: item.id, firstAttempt, duplicate: false };
  }

  /** First-attempt results of a run against all its graded items (skipped items count as wrong). */
  async results(childId: string, run: RunPayload, steps?: RunStep[]) {
    const allSteps = steps ?? (await this.steps(run));
    const graded = allSteps.flatMap((s) => s.items).filter((i) => i.key.kind !== 'none');
    const attempts = await this.prisma.attempt.findMany({
      where: { childId, runId: run.rid },
      orderBy: { createdAt: 'asc' },
    });
    const firstByItem = new Map<string, boolean>();
    for (const a of attempts) {
      const stored = a.answer as unknown as StoredAnswer | null;
      if (stored?.itemId && !firstByItem.has(stored.itemId)) firstByItem.set(stored.itemId, a.correct);
    }
    const perExercise = new Map<string, { graded: number; correct: number }>();
    let correct = 0;
    for (const item of graded) {
      const ex = item.id.slice(0, item.id.lastIndexOf(':'));
      const agg = perExercise.get(ex) ?? { graded: 0, correct: 0 };
      agg.graded += 1;
      if (firstByItem.get(item.id)) {
        agg.correct += 1;
        correct += 1;
      }
      perExercise.set(ex, agg);
    }
    return { graded: graded.length, correct, perExercise };
  }
}
