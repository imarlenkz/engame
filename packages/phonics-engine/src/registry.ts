import { ContentError, type ContentIndex } from './content';
import * as presentational from './exercises/presentational';
import * as soundChoice from './exercises/sound-choice';
import * as words from './exercises/words';
import * as lettersReading from './exercises/letters-reading';
import { createRng } from './rng';
import type { Answer, BuiltItem, ExerciseType, GradeResult, ItemView } from './types';

/**
 * Registry of exercise types. Adding a type = adding a file that exports an ExerciseType and listing it here.
 * Exercises store `type` + `config` in the database, so no schema change is needed.
 */
export class ExerciseRegistry {
  private readonly types = new Map<string, ExerciseType<any>>();

  register(type: ExerciseType<any>): this {
    if (this.types.has(type.key)) throw new Error(`Exercise type "${type.key}" is already registered`);
    this.types.set(type.key, type);
    return this;
  }

  get(key: string): ExerciseType<any> {
    const t = this.types.get(key);
    if (!t) throw new ContentError(`Unknown exercise type "${key}"`);
    return t;
  }

  has(key: string): boolean {
    return this.types.has(key);
  }

  list(): ExerciseType<any>[] {
    return [...this.types.values()];
  }

  /** Validates a config against the type's schema; throws a ZodError with field paths for the CMS. */
  parseConfig(key: string, config: unknown): unknown {
    return this.get(key).configSchema.parse(config);
  }

  /** Content keys referenced by a config that are missing from `content`. Used before publishing. */
  missingReferences(key: string, config: unknown, content: ContentIndex): string[] {
    const type = this.get(key);
    const refs = type.references(type.configSchema.parse(config));
    const missing: string[] = [];
    for (const p of refs.phonemes ?? []) if (!content.phonemes.has(p)) missing.push(`phoneme:${p}`);
    for (const w of refs.words ?? []) if (!content.words.has(w)) missing.push(`word:${w}`);
    for (const l of refs.letters ?? []) if (!content.letters.has(l.toUpperCase())) missing.push(`letter:${l}`);
    for (const s of refs.sentences ?? []) if (!content.sentences.has(s)) missing.push(`sentence:${s}`);
    return missing;
  }

  /**
   * Builds the items of one exercise. Deterministic for a given seed, so the server can rebuild exactly what
   * the client saw (online grading, offline sync) without storing items.
   */
  build(exercise: { id: string; type: string; config: unknown }, content: ContentIndex, seed: string): BuiltItem[] {
    const type = this.get(exercise.type);
    const config = type.configSchema.parse(exercise.config);
    const rng = createRng(`${seed}:${exercise.id}`);
    return type.build(config, content, rng).map((item, index) => ({
      ...item,
      id: `${exercise.id}:${index}`,
      type: type.key,
    }));
  }

  grade(item: BuiltItem, answer: Answer): GradeResult {
    const type = this.get(item.type);
    return type.grade ? type.grade(item, answer) : gradeGeneric(item, answer);
  }
}

export function gradeGeneric(item: BuiltItem, answer: Answer): GradeResult {
  const key = item.key;
  switch (key.kind) {
    case 'none':
      return { correct: null, score: 0 };
    case 'choice': {
      const correct = answer.kind === 'choice' && answer.optionId === key.optionId;
      return { correct, score: correct ? 100 : 0, expected: correct ? undefined : key };
    }
    case 'order': {
      if (answer.kind !== 'order' || item.view.kind !== 'order') return { correct: false, score: 0, expected: key };
      const tiles = new Map(item.view.tiles.map((t) => [t.id, t.label]));
      const labels = answer.sequence.map((id) => tiles.get(id));
      const correct =
        labels.length === key.sequence.length && labels.every((label, i) => label === key.sequence[i]);
      // Partial credit for letters in the right place, so mastery reflects near-misses.
      const right = key.sequence.filter((label, i) => labels[i] === label).length;
      return {
        correct,
        score: correct ? 100 : Math.round((right / key.sequence.length) * 60),
        expected: correct ? undefined : key,
      };
    }
    case 'match': {
      if (answer.kind !== 'match') return { correct: false, score: 0, expected: key };
      const norm = (p: [string, string]) => [...p].sort().join('|');
      const expected = new Set(key.pairs.map(norm));
      const given = new Set(answer.pairs.map(norm));
      const correct = expected.size === given.size && [...expected].every((p) => given.has(p));
      // Perfect play flips each pair once; extra moves lower the score but never below 50 for a finished board.
      const ideal = key.pairs.length;
      const score = correct ? Math.max(50, Math.round(100 - Math.max(0, answer.moves - ideal) * 5)) : 0;
      return { correct, score, expected: correct ? undefined : key };
    }
  }
}

/** Removes grading data before sending an item to the client. */
export function toClientItem(item: BuiltItem): { id: string; type: string; view: ItemView; graded: boolean } {
  return { id: item.id, type: item.type, view: item.view, graded: item.key.kind !== 'none' };
}

export function createDefaultRegistry(): ExerciseRegistry {
  const registry = new ExerciseRegistry();
  for (const module of [presentational, soundChoice, words, lettersReading]) {
    for (const value of Object.values(module)) {
      if (value && typeof value === 'object' && 'key' in value && 'build' in value) registry.register(value as ExerciseType);
    }
  }
  return registry;
}
