import type { PlannedExercise } from '@engame/phonics-engine';
import { signPayload, verifyPayload } from '../common/crypto';

export type RunKind = 'lesson' | 'review' | 'placement' | 'game';

/**
 * Everything needed to rebuild a run's items: which exercises, with what seed. Signed, so the server stays
 * stateless (any instance, or a sync hours later offline, can grade answers) and the client cannot alter it.
 */
export interface RunPayload {
  v: 1;
  rid: string;
  cid: string;
  kind: RunKind;
  /** Lesson id (lesson runs) or game id (game runs). */
  ref?: string;
  seed: string;
  /** Exercise ids from the database, in order. */
  ex: string[];
  /** Generated exercises (review, placement, games), carried in the token. */
  gen: PlannedExercise[];
  /** Placement section of each generated exercise. */
  sections?: Record<string, string>;
  iat: number;
}

const MAX_AGE_MS = 7 * 86_400_000;

export function signRun(secret: string, payload: Omit<RunPayload, 'v' | 'iat'>): string {
  return signPayload(secret, { v: 1, iat: Date.now(), ...payload });
}

export function verifyRun(secret: string, token: string, childId: string): RunPayload | null {
  const p = verifyPayload<RunPayload>(secret, token);
  if (!p || p.v !== 1 || p.cid !== childId || Date.now() - p.iat > MAX_AGE_MS) return null;
  return p;
}
