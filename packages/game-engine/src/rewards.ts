/** XP, coins, stars, levels and streaks. Pure functions; the API persists the results. */

export interface RewardSettings {
  correctAnswerXp: number;
  lessonXp: number;
  perfectLessonBonusXp: number;
  dailyMissionXp: number;
  lessonCoins: number;
  perfectLessonBonusCoins: number;
  gameCoinsPerCorrect: number;
  /** Accuracy (%) needed for 1, 2 and 3 stars. */
  starThresholds: [number, number, number];
}

export const DEFAULT_REWARDS: RewardSettings = {
  correctAnswerXp: 5,
  lessonXp: 20,
  perfectLessonBonusXp: 30,
  dailyMissionXp: 50,
  lessonCoins: 5,
  perfectLessonBonusCoins: 5,
  gameCoinsPerCorrect: 1,
  starThresholds: [60, 80, 95],
};

export function starsFor(accuracy: number, thresholds: RewardSettings['starThresholds']): 0 | 1 | 2 | 3 {
  if (accuracy >= thresholds[2]) return 3;
  if (accuracy >= thresholds[1]) return 2;
  if (accuracy >= thresholds[0]) return 1;
  return 0;
}

export interface LessonOutcome {
  graded: number;
  correct: number;
  accuracy: number;
  stars: 0 | 1 | 2 | 3;
  perfect: boolean;
  xp: { answers: number; lesson: number; perfect: number; total: number };
  coins: number;
}

/**
 * Rewards for a finished lesson run. A lesson with no graded items (all presentational) still counts as complete
 * with full stars, since there was nothing to get wrong.
 */
export function lessonOutcome(graded: number, correct: number, s: RewardSettings = DEFAULT_REWARDS): LessonOutcome {
  const accuracy = graded === 0 ? 100 : Math.round((correct / graded) * 100);
  const perfect = graded > 0 && correct === graded;
  const stars = starsFor(accuracy, s.starThresholds);
  const xp = {
    answers: correct * s.correctAnswerXp,
    lesson: s.lessonXp,
    perfect: perfect ? s.perfectLessonBonusXp : 0,
    total: 0,
  };
  xp.total = xp.answers + xp.lesson + xp.perfect;
  return {
    graded,
    correct,
    accuracy,
    stars,
    perfect,
    xp,
    coins: s.lessonCoins + (perfect ? s.perfectLessonBonusCoins : 0),
  };
}

export function gameOutcome(correct: number, wrong: number, s: RewardSettings = DEFAULT_REWARDS) {
  const total = correct + wrong;
  return {
    score: correct * 10,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    xp: correct * s.correctAnswerXp,
    coins: correct * s.gameCoinsPerCorrect,
  };
}

/** Level n → n+1 costs step × n XP, so total XP to reach level L is step × L(L−1)/2. */
export function levelForXp(xp: number, step = 100): { level: number; xpIntoLevel: number; xpForNext: number } {
  let level = 1;
  let floor = 0;
  while (xp >= floor + step * level) {
    floor += step * level;
    level += 1;
  }
  return { level, xpIntoLevel: xp - floor, xpForNext: step * level };
}

export interface StreakState {
  current: number;
  longest: number;
  /** YYYY-MM-DD in the child's timezone. */
  lastActiveDate: string | null;
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

/** Records activity on `today`. Same day = no change; next day = +1; a gap resets to 1. */
export function recordActivity(prev: StreakState, today: string): StreakState & { changed: boolean } {
  if (prev.lastActiveDate === today) return { ...prev, changed: false };
  const gap = prev.lastActiveDate ? dayNumber(today) - dayNumber(prev.lastActiveDate) : null;
  const current = gap === 1 ? prev.current + 1 : 1;
  return { current, longest: Math.max(prev.longest, current), lastActiveDate: today, changed: true };
}

/** Streak to display: it is broken once a whole day has passed without activity. */
export function visibleStreak(state: StreakState, today: string): number {
  if (!state.lastActiveDate) return 0;
  return dayNumber(today) - dayNumber(state.lastActiveDate) <= 1 ? state.current : 0;
}

/** Calendar date (YYYY-MM-DD) of `now` in an IANA timezone. */
export function localDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
