import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, RewardCurrency } from '@engame/database';
import {
  DEFAULT_REWARDS,
  levelForXp,
  missionProgress,
  newlyUnlocked,
  parseMissionRule,
  recordActivity,
  visibleStreak,
  type Metrics,
  type RewardSettings,
} from '@engame/game-engine';
import { AnalyticsService } from '../analytics/analytics.service';
import { ENV, type Env } from '../config/env';
import { localDate, startOfLocalDay } from '../common/time';
import { PrismaService } from '../infra/infra.module';

type Tx = Prisma.TransactionClient;

export interface UnlockedAchievement {
  slug: string;
  title: unknown;
  icon: string;
  xpReward: number;
  coinReward: number;
}

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async settings(): Promise<{ rewards: RewardSettings; xpPerLevelStep: number; heartsMax: number }> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['rewards', 'levels', 'hearts'] } },
    });
    const get = (k: string) => rows.find((r) => r.key === k)?.value as Record<string, unknown> | undefined;
    return {
      rewards: { ...DEFAULT_REWARDS, ...(get('rewards') as Partial<RewardSettings> | undefined) },
      xpPerLevelStep: Number(get('levels')?.xpPerLevelStep ?? 100),
      heartsMax: Number(get('hearts')?.max ?? 5),
    };
  }

  /** Serialises reward/progress writes for one child for the rest of the transaction. */
  async lock(tx: Tx, childId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${childId}))`;
  }

  /** Adds to the ledger and the running totals; recomputes the level. */

  async award(
    tx: Tx,
    childId: string,
    grants: { currency: RewardCurrency; amount: number }[],
    reason: string,
    ref?: { type: string; id: string },
  ) {
    const nonZero = grants.filter((g) => g.amount !== 0);
    if (nonZero.length === 0) return tx.childProfile.findUniqueOrThrow({ where: { id: childId } });
    await tx.rewardLedger.createMany({
      data: nonZero.map((g) => ({
        childId,
        currency: g.currency,
        amount: g.amount,
        reason,
        refType: ref?.type,
        refId: ref?.id,
      })),
    });
    const sum = (c: RewardCurrency) =>
      nonZero.filter((g) => g.currency === c).reduce((a, g) => a + g.amount, 0);
    const { xpPerLevelStep, heartsMax } = await this.settings();
    const child = await tx.childProfile.update({
      where: { id: childId },
      data: { xp: { increment: sum('XP') }, coins: { increment: sum('COINS') } },
    });
    const hearts = Math.max(0, Math.min(heartsMax, child.hearts + sum('HEARTS')));
    const level = levelForXp(child.xp, xpPerLevelStep).level;
    if (hearts !== child.hearts || level !== child.level) {
      return tx.childProfile.update({ where: { id: childId }, data: { hearts, level } });
    }
    return child;
  }

  /** Marks today as active; returns the streak after the update. */
  async touchStreak(tx: Tx, childId: string, now = new Date()) {
    const today = localDate(now, this.env.TIMEZONE);
    const row = await tx.streak.findUnique({ where: { childId } });
    const prev = {
      current: row?.current ?? 0,
      longest: row?.longest ?? 0,
      lastActiveDate: row?.lastActiveDate ? row.lastActiveDate.toISOString().slice(0, 10) : null,
    };
    const next = recordActivity(prev, today);
    if (next.changed) {
      await tx.streak.upsert({
        where: { childId },
        update: {
          current: next.current,
          longest: next.longest,
          lastActiveDate: new Date(`${today}T00:00:00Z`),
        },
        create: {
          childId,
          current: next.current,
          longest: next.longest,
          lastActiveDate: new Date(`${today}T00:00:00Z`),
        },
      });
      await this.analytics.track('streak_updated', { childId }, { current: next.current });
    }
    return next;
  }

  async currentStreak(childId: string, now = new Date()) {
    const row = await this.prisma.streak.findUnique({ where: { childId } });
    if (!row?.lastActiveDate) return { current: 0, longest: row?.longest ?? 0 };
    const state = {
      current: row.current,
      longest: row.longest,
      lastActiveDate: row.lastActiveDate.toISOString().slice(0, 10),
    };
    return { current: visibleStreak(state, localDate(now, this.env.TIMEZONE)), longest: row.longest };
  }

  async metrics(childId: string): Promise<Metrics> {
    const [child, lessons, perfect, streak, sounds, words, letters, games, correct] = await Promise.all([
      this.prisma.childProfile.findUniqueOrThrow({ where: { id: childId } }),
      this.prisma.lessonProgress.count({ where: { childId, status: 'COMPLETED' } }),
      this.prisma.lessonProgress.count({ where: { childId, bestScore: 100 } }),
      this.prisma.streak.findUnique({ where: { childId } }),
      this.prisma.mastery.count({ where: { childId, itemType: 'PHONEME', masteredAt: { not: null } } }),
      this.prisma.mastery.count({ where: { childId, itemType: 'WORD', masteredAt: { not: null } } }),
      this.prisma.mastery.count({ where: { childId, itemType: 'LETTER', masteredAt: { not: null } } }),
      this.prisma.gameSession.count({ where: { childId, endedAt: { not: null } } }),
      this.prisma.attempt.count({ where: { childId, correct: true } }),
    ]);
    return {
      lessons_completed: lessons,
      perfect_lessons: perfect,
      streak_days: Math.max(streak?.current ?? 0, streak?.longest ?? 0),
      xp_total: child.xp,
      sounds_mastered: sounds,
      words_mastered: words,
      letters_mastered: letters,
      games_played: games,
      correct_answers: correct,
      level_reached: child.level,
    };
  }

  /** Unlocks achievements whose rules are now met and pays their rewards. */
  async checkAchievements(childId: string): Promise<UnlockedAchievement[]> {
    const [achievements, owned, metrics] = await Promise.all([
      this.prisma.achievement.findMany({ where: { status: 'PUBLISHED' } }),
      this.prisma.userAchievement.findMany({ where: { childId }, select: { achievementId: true } }),
      this.metrics(childId),
    ]);
    const ownedIds = new Set(owned.map((o) => o.achievementId));
    const bySlug = new Map(achievements.map((a) => [a.slug, a]));
    const slugs = newlyUnlocked(
      achievements.map((a) => ({ slug: a.slug, rule: a.rule })),
      metrics,
      new Set(achievements.filter((a) => ownedIds.has(a.id)).map((a) => a.slug)),
    );
    const unlocked: UnlockedAchievement[] = [];
    for (const slug of slugs) {
      const a = bySlug.get(slug)!;
      const created = await this.prisma.$transaction(async (tx) => {
        const res = await tx.userAchievement.createMany({
          data: [{ childId, achievementId: a.id }],
          skipDuplicates: true,
        });
        if (res.count === 0) return false;
        await this.award(
          tx,
          childId,
          [
            { currency: 'XP', amount: a.xpReward },
            { currency: 'COINS', amount: a.coinReward },
          ],
          'achievement',
          { type: 'achievement', id: a.id },
        );
        return true;
      });
      if (created) {
        unlocked.push({ slug, title: a.title, icon: a.icon, xpReward: a.xpReward, coinReward: a.coinReward });
        await this.analytics.track('achievement_unlocked', { childId }, { achievement: slug });
      }
    }
    return unlocked;
  }

  private async todayMetrics(childId: string, now: Date): Promise<Metrics> {
    const since = startOfLocalDay(now, this.env.TIMEZONE);
    const [lessons, correct, games] = await Promise.all([
      this.prisma.rewardLedger.count({
        where: { childId, reason: 'lesson_complete', currency: 'XP', createdAt: { gte: since } },
      }),
      this.prisma.attempt.count({ where: { childId, correct: true, createdAt: { gte: since } } }),
      this.prisma.gameSession.count({ where: { childId, endedAt: { gte: since } } }),
    ]);
    return { lessons_completed: lessons, correct_answers: correct, games_played: games };
  }

  /** Today's missions with progress; completes and pays those that just reached their target. */
  async missions(childId: string, now = new Date()) {
    const date = new Date(`${localDate(now, this.env.TIMEZONE)}T00:00:00Z`);
    const [missions, today] = await Promise.all([
      this.prisma.dailyMission.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } }),
      this.todayMetrics(childId, now),
    ]);
    const out = [];
    for (const m of missions) {
      const rule = parseMissionRule(m.rule);
      if (!rule) continue;
      const { progress, done } = missionProgress(rule, today);
      const row = await this.prisma.childDailyMission.upsert({
        where: { childId_missionId_date: { childId, missionId: m.id, date } },
        update: { progress },
        create: { childId, missionId: m.id, date, progress, target: rule.target },
      });
      let completedAt = row.completedAt;
      let justCompleted = false;
      if (done && !completedAt) {
        // Conditional update makes payout exactly-once under concurrent requests.
        const claimed = await this.prisma.childDailyMission.updateMany({
          where: { childId, missionId: m.id, date, completedAt: null },
          data: { completedAt: now },
        });
        if (claimed.count === 1) {
          await this.prisma.$transaction((tx) =>
            this.award(
              tx,
              childId,
              [
                { currency: 'XP', amount: m.xpReward },
                { currency: 'COINS', amount: m.coinReward },
              ],
              'daily_mission',
              { type: 'daily_mission', id: m.id },
            ),
          );
          await this.analytics.track('daily_mission_completed', { childId }, { mission: m.slug });
          justCompleted = true;
        }
        completedAt = now;
      }
      out.push({
        slug: m.slug,
        title: m.title,
        progress,
        target: rule.target,
        xpReward: m.xpReward,
        coinReward: m.coinReward,
        completed: completedAt != null,
        justCompleted,
      });
    }
    return out;
  }
}
