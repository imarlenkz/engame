/** Mastery scoring and spaced repetition (SM-2 variant) for letters, phonemes and words. */

export type MasteryBand = 'NEEDS_PRACTICE' | 'LEARNING' | 'GOOD' | 'MASTERED';

export interface MasteryState {
  score: number;
  attempts: number;
  correct: number;
  mistakes: number;
  avgResponseMs: number | null;
  pronunciationAvg: number | null;
  ease: number;
  intervalDays: number;
  streak: number;
  dueAt: Date;
  lastSeenAt: Date | null;
  masteredAt: Date | null;
}

export interface Observation {
  correct: boolean;
  responseMs?: number | null;
  /** 0–100 quality from a graded source other than right/wrong (pronunciation score, partial credit). */
  quality?: number | null;
  pronunciation?: boolean;
}

export const MASTERY = {
  learningRate: 0.3,
  fastResponseMs: 5000,
  minAttemptsForMastered: 5,
  weakScore: 40,
  minAttemptsForWeak: 3,
  passQuality: 60,
  relearnMinutes: 10,
  minEase: 130,
  maxEase: 300,
} as const;

export function emptyMastery(now: Date): MasteryState {
  return {
    score: 0,
    attempts: 0,
    correct: 0,
    mistakes: 0,
    avgResponseMs: null,
    pronunciationAvg: null,
    ease: 250,
    intervalDays: 0,
    streak: 0,
    dueAt: now,
    lastSeenAt: null,
    masteredAt: null,
  };
}

export function masteryBand(score: number): MasteryBand {
  if (score >= 90) return 'MASTERED';
  if (score >= 70) return 'GOOD';
  if (score >= 40) return 'LEARNING';
  return 'NEEDS_PRACTICE';
}

export function isWeak(state: Pick<MasteryState, 'score' | 'attempts'>): boolean {
  return state.attempts >= MASTERY.minAttemptsForWeak && state.score < MASTERY.weakScore;
}

function quality(obs: Observation): number {
  if (obs.quality != null) return Math.max(0, Math.min(100, obs.quality));
  if (!obs.correct) return 0;
  return obs.responseMs != null && obs.responseMs > MASTERY.fastResponseMs ? 85 : 100;
}

const DAY_MS = 86_400_000;

export function applyObservation(prev: MasteryState, obs: Observation, now: Date): MasteryState {
  const q = quality(obs);
  const next: MasteryState = { ...prev };
  next.attempts += 1;
  if (obs.correct) next.correct += 1;
  else next.mistakes += 1;
  next.score = Math.round(prev.score + MASTERY.learningRate * (q - prev.score));
  if (obs.responseMs != null && obs.responseMs > 0) {
    next.avgResponseMs =
      prev.avgResponseMs == null ? obs.responseMs : Math.round(prev.avgResponseMs * 0.8 + obs.responseMs * 0.2);
  }
  if (obs.pronunciation && obs.quality != null) {
    next.pronunciationAvg =
      prev.pronunciationAvg == null ? Math.round(obs.quality) : Math.round(prev.pronunciationAvg * 0.7 + obs.quality * 0.3);
  }

  if (q < MASTERY.passQuality) {
    next.streak = 0;
    next.intervalDays = 0;
    next.ease = Math.max(MASTERY.minEase, prev.ease - 20);
    next.dueAt = new Date(now.getTime() + MASTERY.relearnMinutes * 60_000);
  } else {
    next.streak = prev.streak + 1;
    next.intervalDays =
      next.streak === 1 ? 1 : next.streak === 2 ? 3 : Math.max(1, Math.round((prev.intervalDays * prev.ease) / 100));
    if (q >= 90) next.ease = Math.min(MASTERY.maxEase, prev.ease + 5);
    next.dueAt = new Date(now.getTime() + next.intervalDays * DAY_MS);
  }

  if (next.score >= 90 && next.attempts >= MASTERY.minAttemptsForMastered) next.masteredAt ??= now;
  else if (next.score < 70) next.masteredAt = null;
  next.lastSeenAt = now;
  return next;
}

/** Items to review now: due first, weakest first. */
export function pickReview<T extends { score: number; attempts: number; dueAt: Date }>(
  items: T[],
  now: Date,
  limit: number,
): T[] {
  return items
    .filter((i) => i.attempts > 0 && i.dueAt.getTime() <= now.getTime())
    .sort((a, b) => a.score - b.score || a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, limit);
}
