import { Inject, Injectable } from '@nestjs/common';
import { lessonOutcome } from '@engame/game-engine';
import { planPlacement, planReview, placementStart, type PlacementSection } from '@engame/phonics-engine';
import { randomUUID } from 'node:crypto';
import { AnalyticsService } from '../analytics/analytics.service';
import { ENV, type Env } from '../config/env';
import { Errors } from '../common/errors';
import { ContentService } from '../content/content.service';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../infra/infra.module';
import { CurriculumService } from './curriculum.service';
import { MasteryService } from './mastery.service';
import { RunService, type AnswerInput } from './run.service';
import { signRun, type RunPayload } from './run-token';

const MAX_LESSON_SECONDS = 30 * 60;

@Injectable()
export class LearningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
    private readonly curriculum: CurriculumService,
    private readonly runs: RunService,
    private readonly mastery: MasteryService,
    private readonly gamification: GamificationService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async worlds(childId: string) {
    const [worlds, state, progress] = await Promise.all([
      this.prisma.world.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { order: 'asc' },
        include: {
          levels: {
            where: { status: 'PUBLISHED' },
            orderBy: { order: 'asc' },
            include: {
              lessons: { where: { status: 'PUBLISHED' }, orderBy: { order: 'asc' }, select: { id: true } },
            },
          },
        },
      }),
      this.curriculum.unlockState(childId),
      this.prisma.lessonProgress.findMany({
        where: { childId },
        select: { lessonId: true, stars: true, status: true },
      }),
    ]);
    const stars = new Map(progress.map((p) => [p.lessonId, p.stars]));
    return worlds.map((w) => {
      const lessonIds = w.levels.flatMap((l) => l.lessons.map((x) => x.id));
      return {
        slug: w.slug,
        title: w.title,
        icon: w.icon,
        theme: w.theme,
        lessons: lessonIds.length,
        completed: lessonIds.filter((id) => state.done.has(id)).length,
        stars: lessonIds.reduce((a, id) => a + (stars.get(id) ?? 0), 0),
        unlocked: lessonIds.some((id) => state.unlocked.has(id)),
        current: state.current?.worldSlug === w.slug,
      };
    });
  }

  async world(childId: string, slug: string) {
    const world = await this.prisma.world.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        levels: {
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { status: 'PUBLISHED' },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                slug: true,
                title: true,
                kind: true,
                estimatedMinutes: true,
                xpReward: true,
              },
            },
          },
        },
      },
    });
    if (!world) throw Errors.notFound('World');
    const [state, progress] = await Promise.all([
      this.curriculum.unlockState(childId),
      this.prisma.lessonProgress.findMany({
        where: { childId, lessonId: { in: world.levels.flatMap((l) => l.lessons.map((x) => x.id)) } },
      }),
    ]);
    const byLesson = new Map(progress.map((p) => [p.lessonId, p]));
    return {
      slug: world.slug,
      title: world.title,
      icon: world.icon,
      theme: world.theme,
      levels: world.levels.map((lv) => ({
        slug: lv.slug,
        title: lv.title,
        lessons: lv.lessons.map((l) => ({
          ...l,
          unlocked: state.unlocked.has(l.id),
          current: state.current?.id === l.id,
          status: byLesson.get(l.id)?.status ?? 'NOT_STARTED',
          stars: byLesson.get(l.id)?.stars ?? 0,
        })),
      })),
    };
  }

  private async publishedLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, status: 'PUBLISHED' },
      include: {
        exercises: { orderBy: { order: 'asc' } },
        focusPhoneme: true,
        focusLetter: true,
        level: { include: { world: true } },
      },
    });
    if (!lesson) throw Errors.notFound('Lesson');
    return lesson;
  }

  /** Starts a lesson run: lesson exercises + a generated review of the child's weakest due items. */
  async startLesson(childId: string, lessonId: string, opts: { offline?: boolean } = {}) {
    const lesson = await this.publishedLesson(lessonId);
    const state = await this.curriculum.unlockState(childId);
    const assigned = await this.prisma.assignment.count({
      where: { lessonId, class: { members: { some: { childId } } } },
    });
    if (!state.unlocked.has(lessonId) && assigned === 0)
      throw Errors.forbidden('This lesson is still locked');

    const settings = await this.prisma.setting.findUnique({ where: { key: 'review' } });
    const maxReview = Number(
      (settings?.value as { maxItemsPerLesson?: number } | null)?.maxItemsPerLesson ?? 3,
    );
    const content = await this.content.index();
    const targets = await this.mastery.reviewTargets(null, childId, maxReview);
    const run: Omit<RunPayload, 'v' | 'iat'> = {
      rid: randomUUID(),
      cid: childId,
      kind: 'lesson',
      ref: lesson.id,
      seed: randomUUID(),
      ex: lesson.exercises.map((e) => e.id),
      gen: planReview(targets, content),
    };
    const token = signRun(this.env.APP_SECRET, run);
    const steps = await this.runs.steps({ ...run, v: 1, iat: Date.now() }, content);

    await this.prisma.lessonProgress.upsert({
      where: { childId_lessonId: { childId, lessonId } },
      update: {},
      create: { childId, lessonId, status: 'IN_PROGRESS' },
    });
    await this.analytics.track(
      'lesson_started',
      { childId },
      { lesson: lesson.slug, offline: Boolean(opts.offline) },
    );
    return {
      run: { id: run.rid, token, kind: run.kind },
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        kind: lesson.kind,
        estimatedMinutes: lesson.estimatedMinutes,
        world: {
          slug: lesson.level.world.slug,
          title: lesson.level.world.title,
          theme: lesson.level.world.theme,
        },
        focus: {
          phoneme: lesson.focusPhoneme
            ? {
                slug: lesson.focusPhoneme.slug,
                symbol: lesson.focusPhoneme.symbol,
                ipa: lesson.focusPhoneme.ipa,
              }
            : null,
          letter: lesson.focusLetter?.char ?? null,
        },
      },
      ...this.runs.toClient(steps, Boolean(opts.offline)),
    };
  }

  /** Standalone review from the Home screen. */
  async startReview(childId: string) {
    const content = await this.content.index();
    const targets = await this.mastery.reviewTargets(null, childId, 5);
    if (targets.length === 0) return { run: null, steps: [] };
    const run: Omit<RunPayload, 'v' | 'iat'> = {
      rid: randomUUID(),
      cid: childId,
      kind: 'review',
      seed: randomUUID(),
      ex: [],
      gen: planReview(targets, content),
    };
    const token = signRun(this.env.APP_SECRET, run);
    const steps = await this.runs.steps({ ...run, v: 1, iat: Date.now() }, content);
    return { run: { id: run.rid, token, kind: run.kind }, ...this.runs.toClient(steps, false) };
  }

  async reviewQueue(childId: string) {
    const targets = await this.mastery.reviewTargets(null, childId, 20);
    return { count: targets.length, items: targets };
  }

  async answer(childId: string, token: string, input: AnswerInput) {
    const run = this.runs.verify(token, childId);
    if (run.kind === 'game') throw Errors.badRequest('RUN_KIND', 'Use the game endpoints for games');
    return this.runs.answer(childId, run, input);
  }

  /** Finishes a lesson or review run: rewards, progress, streak, achievements, missions. Idempotent per run. */
  async complete(childId: string, token: string, opts: { durationSec?: number; completedAt?: Date } = {}) {
    const run = this.runs.verify(token, childId);
    if (run.kind !== 'lesson' && run.kind !== 'review')
      throw Errors.badRequest('RUN_KIND', 'Not a lesson run');
    const steps = await this.runs.steps(run);
    const res = await this.runs.results(childId, run, steps);
    const { rewards } = await this.gamification.settings();
    const outcome = lessonOutcome(res.graded, res.correct, rewards);
    const now = opts.completedAt && opts.completedAt < new Date() ? opts.completedAt : new Date();
    const duration = Math.min(
      MAX_LESSON_SECONDS,
      Math.max(0, Math.round(opts.durationSec ?? (now.getTime() - run.iat) / 1000)),
    );

    // Claim the run under a per-child lock so a double submit (or sync racing a retry) rewards once.
    const already = !(await this.prisma.$transaction(async (tx) => {
      await this.gamification.lock(tx, childId);
      if (await tx.rewardLedger.findFirst({ where: { childId, refType: 'run', refId: run.rid } }))
        return false;
      const reason = run.kind === 'lesson' ? 'lesson_complete' : 'review_complete';
      await this.gamification.award(
        tx,
        childId,
        [
          { currency: 'XP', amount: run.kind === 'lesson' ? outcome.xp.total : outcome.xp.answers },
          { currency: 'COINS', amount: run.kind === 'lesson' ? outcome.coins : 0 },
          { currency: 'STARS', amount: run.kind === 'lesson' ? outcome.stars : 0 },
          { currency: 'HEARTS', amount: outcome.perfect ? 1 : 0 },
        ],
        reason,
        { type: 'run', id: run.rid },
      );
      if (run.kind === 'lesson' && run.ref) {
        const prev = await tx.lessonProgress.findUnique({
          where: { childId_lessonId: { childId, lessonId: run.ref } },
        });
        await tx.lessonProgress.upsert({
          where: { childId_lessonId: { childId, lessonId: run.ref } },
          update: {
            status: 'COMPLETED',
            stars: Math.max(prev?.stars ?? 0, outcome.stars),
            bestScore: Math.max(prev?.bestScore ?? 0, outcome.accuracy),
            runs: { increment: 1 },
            timeSpentSec: { increment: duration },
            completedAt: prev?.completedAt ?? now,
          },
          create: {
            childId,
            lessonId: run.ref,
            status: 'COMPLETED',
            stars: outcome.stars,
            bestScore: outcome.accuracy,
            runs: 1,
            timeSpentSec: duration,
            completedAt: now,
          },
        });
        const child = await tx.childProfile.findUniqueOrThrow({ where: { id: childId } });
        if (!child.currentLessonId || child.currentLessonId === run.ref) {
          const next = await this.curriculum.nextAfter(run.ref);
          if (next) await tx.childProfile.update({ where: { id: childId }, data: { currentLessonId: next } });
        }
      }
      await this.gamification.touchStreak(tx, childId, now);
      // A run with no XP/coins/stars/hearts still needs a ledger marker to stay idempotent.
      await tx.rewardLedger.create({
        data: { childId, currency: 'XP', amount: 0, reason: 'run_claimed', refType: 'run', refId: run.rid },
      });
      return true;
    }));
    if (!already) {
      await this.analytics.track(
        'lesson_completed',
        { childId },
        {
          kind: run.kind,
          accuracy: outcome.accuracy,
          stars: outcome.stars,
          durationSec: duration,
        },
      );
    }

    const achievements = already ? [] : await this.gamification.checkAchievements(childId);
    const missions = await this.gamification.missions(childId, now);
    const child = await this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } });
    const streak = await this.gamification.currentStreak(childId);
    return {
      alreadyCompleted: Boolean(already),
      outcome,
      achievements,
      missions: missions.filter((m) => m.justCompleted),
      child: { xp: child.xp, coins: child.coins, level: child.level, hearts: child.hearts },
      streak,
      nextLessonId: child.currentLessonId,
    };
  }

  async placement(childId: string) {
    const content = await this.content.index();
    const plan = planPlacement(content);
    const run: Omit<RunPayload, 'v' | 'iat'> = {
      rid: randomUUID(),
      cid: childId,
      kind: 'placement',
      seed: randomUUID(),
      ex: [],
      gen: plan.map((p) => p.exercise),
      sections: Object.fromEntries(plan.map((p) => [p.exercise.id, p.section])),
    };
    const token = signRun(this.env.APP_SECRET, run);
    const steps = await this.runs.steps({ ...run, v: 1, iat: Date.now() }, content);
    return { run: { id: run.rid, token, kind: run.kind }, ...this.runs.toClient(steps, false) };
  }

  /** Scores the placement test from recorded answers and sets the child's starting lesson. */
  async submitPlacement(childId: string, token: string) {
    const run = this.runs.verify(token, childId);
    if (run.kind !== 'placement') throw Errors.badRequest('RUN_KIND', 'Not a placement test');
    const res = await this.runs.results(childId, run);
    const scores: Partial<Record<PlacementSection, number>> = {};
    for (const [exerciseId, agg] of res.perExercise) {
      const section = run.sections?.[exerciseId] as PlacementSection | undefined;
      if (section) scores[section] = agg.graded ? Math.round((agg.correct / agg.graded) * 100) : 0;
    }
    const start = placementStart(scores);
    const lessonId = await this.curriculum.firstLessonOfWorld(start);
    await this.prisma.$transaction([
      this.prisma.placementResult.upsert({
        where: { childId },
        update: { scores, startLessonId: lessonId, completedAt: new Date() },
        create: { childId, scores, startLessonId: lessonId },
      }),
      this.prisma.childProfile.update({
        where: { id: childId },
        data: { currentLessonId: lessonId, placementDoneAt: new Date() },
      }),
    ]);
    await this.analytics.track('placement_completed', { childId }, { start, ...scores });
    return { scores, startWorld: start, startLessonId: lessonId };
  }

  /** Skips the placement test and starts from the very first lesson. */
  async skipPlacement(childId: string) {
    const first = (await this.curriculum.ordered())[0]?.id ?? null;
    await this.prisma.childProfile.update({
      where: { id: childId },
      data: { currentLessonId: first, placementDoneAt: new Date() },
    });
    return { startLessonId: first };
  }
}
