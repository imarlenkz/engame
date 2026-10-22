import { Inject, Injectable } from '@nestjs/common';
import { levelForXp } from '@engame/game-engine';
import { isWeak, masteryBand } from '@engame/phonics-engine';
import { ENV, type Env } from '../config/env';
import { daysAgo, localDate, startOfLocalDay } from '../common/time';
import { GamificationService } from '../gamification/gamification.service';
import { PrismaService } from '../infra/infra.module';
import { CurriculumService } from '../learning/curriculum.service';
import { MasteryService } from '../learning/mastery.service';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: GamificationService,
    private readonly curriculum: CurriculumService,
    private readonly mastery: MasteryService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Seconds spent learning per local day for the last `days` days (lessons + games). */
  async activity(childId: string, days: number, now = new Date()) {
    const since = daysAgo(now, days - 1, this.env.TIMEZONE);
    const [lessonEvents, games, attempts] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: { childId, name: 'lesson_completed', createdAt: { gte: since } },
        select: { createdAt: true, props: true },
      }),
      this.prisma.gameSession.findMany({
        where: { childId, endedAt: { gte: since } },
        select: { startedAt: true, endedAt: true },
      }),
      this.prisma.attempt.findMany({
        where: { childId, createdAt: { gte: since } },
        select: { createdAt: true, correct: true },
      }),
    ]);
    const buckets = new Map<string, { date: string; seconds: number; answers: number; correct: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const date = localDate(new Date(now.getTime() - i * 86_400_000), this.env.TIMEZONE);
      buckets.set(date, { date, seconds: 0, answers: 0, correct: 0 });
    }
    const at = (d: Date) => buckets.get(localDate(d, this.env.TIMEZONE));
    for (const e of lessonEvents) {
      const b = at(e.createdAt);
      if (b) b.seconds += Number((e.props as { durationSec?: number }).durationSec ?? 0);
    }
    for (const g of games) {
      const b = at(g.endedAt!);
      if (b) b.seconds += Math.min(1800, Math.round((g.endedAt!.getTime() - g.startedAt.getTime()) / 1000));
    }
    for (const a of attempts) {
      const b = at(a.createdAt);
      if (b) {
        b.answers += 1;
        if (a.correct) b.correct += 1;
      }
    }
    return [...buckets.values()];
  }

  async dashboard(childId: string, now = new Date()) {
    const [
      child,
      streak,
      missions,
      state,
      recentAchievements,
      masteredSounds,
      totalSounds,
      reviewTargets,
      goalSetting,
      placement,
    ] = await Promise.all([
      this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } }),
      this.gamification.currentStreak(childId, now),
      this.gamification.missions(childId, now),
      this.curriculum.unlockState(childId),
      this.prisma.userAchievement.findMany({
        where: { childId },
        orderBy: { unlockedAt: 'desc' },
        take: 3,
        include: { achievement: { select: { slug: true, title: true, icon: true } } },
      }),
      this.prisma.mastery.count({ where: { childId, itemType: 'PHONEME', masteredAt: { not: null } } }),
      this.prisma.phoneme.count({ where: { status: 'PUBLISHED' } }),
      this.mastery.reviewTargets(null, childId, 20, now),
      this.prisma.setting.findUnique({ where: { key: 'dailyGoal' } }),
      this.prisma.placementResult.findUnique({ where: { childId } }),
    ]);
    const { xpPerLevelStep } = await this.gamification.settings();
    const today = (await this.activity(childId, 1, now))[0]!;
    const goalMinutes = Number((goalSetting?.value as { minutes?: number } | null)?.minutes ?? 10);
    const current = state.current
      ? await this.prisma.lesson.findUnique({
          where: { id: state.current.id },
          select: {
            id: true,
            slug: true,
            title: true,
            kind: true,
            estimatedMinutes: true,
            level: { select: { world: { select: { slug: true, title: true, icon: true } } } },
          },
        })
      : null;
    return {
      child: { id: child.id, nickname: child.nickname, avatar: child.avatar, ageGroup: child.ageGroup },
      level: { ...levelForXp(child.xp, xpPerLevelStep), xp: child.xp },
      coins: child.coins,
      hearts: child.hearts,
      streak,
      todayGoal: { minutes: goalMinutes, doneMinutes: Math.floor(today.seconds / 60) },
      currentLesson: current
        ? {
            id: current.id,
            slug: current.slug,
            title: current.title,
            kind: current.kind,
            minutes: current.estimatedMinutes,
            world: current.level.world,
          }
        : null,
      needsPlacement: !child.placementDoneAt && !placement,
      missions,
      review: { count: reviewTargets.length },
      achievements: recentAchievements.map((a) => ({ ...a.achievement, unlockedAt: a.unlockedAt })),
      progress: {
        soundsMastered: masteredSounds,
        soundsTotal: totalSounds,
        lessonsCompleted: state.done.size,
        lessonsTotal: state.ordered.length,
      },
    };
  }

  /** Full progress report for parents/teachers (and the child's Progress screen). */
  async report(childId: string, now = new Date()) {
    const [child, phonemes, masteryRows, lessonsDone, lessonTime, gameTime, wordsMastered, streak, weekly] =
      await Promise.all([
        this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } }),
        this.prisma.phoneme.findMany({
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          select: { id: true, slug: true, symbol: true, ipa: true },
        }),
        this.prisma.mastery.findMany({ where: { childId } }),
        this.prisma.lessonProgress.count({ where: { childId, status: 'COMPLETED' } }),
        this.prisma.lessonProgress.aggregate({ where: { childId }, _sum: { timeSpentSec: true } }),
        this.prisma.gameSession.findMany({
          where: { childId, endedAt: { not: null } },
          select: { startedAt: true, endedAt: true },
        }),
        this.prisma.mastery.findMany({
          where: { childId, itemType: 'WORD', masteredAt: { not: null } },
          select: { itemId: true },
        }),
        this.gamification.currentStreak(childId, now),
        this.activity(childId, 7, now),
      ]);
    const byItem = new Map(masteryRows.map((m) => [`${m.itemType}:${m.itemId}`, m]));
    const sounds = phonemes.map((p) => {
      const m = byItem.get(`PHONEME:${p.id}`);
      return {
        slug: p.slug,
        symbol: p.symbol,
        ipa: p.ipa,
        score: m?.score ?? 0,
        attempts: m?.attempts ?? 0,
        band: m && m.attempts > 0 ? masteryBand(m.score) : null,
        weak: m ? isWeak(m) : false,
        pronunciation: m?.pronunciationAvg ?? null,
      };
    });
    const pron = sounds.map((s) => s.pronunciation).filter((x): x is number => x != null);
    const words = wordsMastered.length
      ? await this.prisma.word.findMany({
          where: { id: { in: wordsMastered.map((w) => w.itemId) } },
          select: { text: true, emoji: true },
        })
      : [];
    const gameSeconds = gameTime.reduce(
      (a, g) => a + Math.min(1800, (g.endedAt!.getTime() - g.startedAt.getTime()) / 1000),
      0,
    );
    return {
      child: {
        id: child.id,
        nickname: child.nickname,
        avatar: child.avatar,
        level: child.level,
        xp: child.xp,
        coins: child.coins,
      },
      learningTimeMinutes: Math.round(((lessonTime._sum.timeSpentSec ?? 0) + gameSeconds) / 60),
      lessonsCompleted: lessonsDone,
      soundsMastered: sounds.filter((s) => s.band === 'MASTERED').length,
      soundsTotal: sounds.length,
      weakSounds: sounds
        .filter((s) => s.weak)
        .map(({ slug, symbol, ipa, score }) => ({ slug, symbol, ipa, score })),
      wordsLearned: words,
      pronunciationScore: pron.length ? Math.round(pron.reduce((a, b) => a + b, 0) / pron.length) : null,
      streak,
      weekly: weekly.map((d) => ({ ...d, minutes: Math.round(d.seconds / 60) })),
      sounds,
      since: startOfLocalDay(now, this.env.TIMEZONE),
    };
  }

  async achievements(childId: string) {
    const [all, owned] = await Promise.all([
      this.prisma.achievement.findMany({ where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' } }),
      this.prisma.userAchievement.findMany({ where: { childId } }),
    ]);
    const unlocked = new Map(owned.map((o) => [o.achievementId, o.unlockedAt]));
    const metrics = await this.gamification.metrics(childId);
    return all.map((a) => {
      const rule = a.rule as { metric?: string; gte?: number };
      return {
        slug: a.slug,
        title: a.title,
        description: a.description,
        icon: a.icon,
        unlockedAt: unlocked.get(a.id) ?? null,
        progress: rule.metric
          ? Math.min(rule.gte ?? 0, (metrics as Record<string, number>)[rule.metric] ?? 0)
          : 0,
        target: rule.gte ?? 0,
      };
    });
  }
}
