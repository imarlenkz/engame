import type { Answer, AnswerKey, ItemView } from './types';

/**
 * Local feedback for offline play; mirrors the server's generic grader. The server regrades on sync, so this only
 * decides what the child sees right away.
 */
export function gradeLocally(view: ItemView, key: AnswerKey, answer: Answer): { correct: boolean | null; score: number; expected?: AnswerKey } {
  switch (key.kind) {
    case 'none':
      return { correct: null, score: 0 };
    case 'choice': {
      const correct = answer.kind === 'choice' && answer.optionId === key.optionId;
      return { correct, score: correct ? 100 : 0, expected: correct ? undefined : key };
    }
    case 'order': {
      if (answer.kind !== 'order' || view.kind !== 'order') return { correct: false, score: 0, expected: key };
      const tiles = new Map(view.tiles.map((t) => [t.id, t.label]));
      const labels = answer.sequence.map((id) => tiles.get(id));
      const correct = labels.length === key.sequence.length && labels.every((l, i) => l === key.sequence[i]);
      const right = key.sequence.filter((l, i) => labels[i] === l).length;
      return { correct, score: correct ? 100 : Math.round((right / key.sequence.length) * 60), expected: correct ? undefined : key };
    }
    case 'match': {
      if (answer.kind !== 'match') return { correct: false, score: 0, expected: key };
      const norm = (p: [string, string]) => [...p].sort().join('|');
      const expected = new Set(key.pairs.map(norm));
      const given = new Set(answer.pairs.map(norm));
      const correct = expected.size === given.size && [...expected].every((p) => given.has(p));
      return { correct, score: correct ? Math.max(50, 100 - Math.max(0, answer.moves - key.pairs.length) * 5) : 0, expected: correct ? undefined : key };
    }
  }
}
