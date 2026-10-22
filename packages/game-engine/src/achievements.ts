/** Achievement and daily-mission rules, stored as JSON in the CMS and evaluated against child metrics. */

export const METRICS = [
  'lessons_completed',
  'perfect_lessons',
  'streak_days',
  'xp_total',
  'sounds_mastered',
  'words_mastered',
  'letters_mastered',
  'games_played',
  'correct_answers',
  'level_reached',
] as const;
export type Metric = (typeof METRICS)[number];
export type Metrics = Partial<Record<Metric, number>>;

export interface AchievementRule {
  metric: Metric;
  gte: number;
}

export interface MissionRule {
  metric: Metric;
  target: number;
}

export function isMetric(value: unknown): value is Metric {
  return typeof value === 'string' && (METRICS as readonly string[]).includes(value);
}

export function parseAchievementRule(rule: unknown): AchievementRule | null {
  if (!rule || typeof rule !== 'object') return null;
  const r = rule as Record<string, unknown>;
  return isMetric(r.metric) && typeof r.gte === 'number' && r.gte > 0 ? { metric: r.metric, gte: r.gte } : null;
}

export function parseMissionRule(rule: unknown): MissionRule | null {
  if (!rule || typeof rule !== 'object') return null;
  const r = rule as Record<string, unknown>;
  return isMetric(r.metric) && typeof r.target === 'number' && r.target > 0 ? { metric: r.metric, target: r.target } : null;
}

/** Slugs of achievements whose rule is now met and that are not unlocked yet. */
export function newlyUnlocked(
  achievements: { slug: string; rule: unknown }[],
  metrics: Metrics,
  unlocked: ReadonlySet<string>,
): string[] {
  return achievements
    .filter((a) => !unlocked.has(a.slug))
    .filter((a) => {
      const rule = parseAchievementRule(a.rule);
      return rule != null && (metrics[rule.metric] ?? 0) >= rule.gte;
    })
    .map((a) => a.slug);
}

/** Today's progress for a mission, from the metric's increase since the day began. */
export function missionProgress(rule: MissionRule, todayDelta: Metrics): { progress: number; done: boolean } {
  const progress = Math.min(rule.target, Math.max(0, todayDelta[rule.metric] ?? 0));
  return { progress, done: progress >= rule.target };
}
