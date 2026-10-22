import { describe, expect, it } from 'vitest';
import { CURRICULUM, GAMES } from '../../database/prisma/data/curriculum';
import { PHONEMES } from '../../database/prisma/data/phonemes';
import { WORDS } from '../../database/prisma/data/words';
import {
  ContentError,
  createDefaultRegistry,
  createRng,
  planPlacement,
  planReview,
  placementStart,
  toClientItem,
  type BuiltItem,
} from '../src';
import { seedContent } from './fixture';

const registry = createDefaultRegistry();
const content = seedContent();

function correctAnswer(item: BuiltItem) {
  const key = item.key;
  if (key.kind === 'choice') return { kind: 'choice' as const, optionId: key.optionId };
  if (key.kind === 'order' && item.view.kind === 'order') {
    const free = [...item.view.tiles];
    const sequence = key.sequence.map((label) => {
      const i = free.findIndex((t) => t.label === label);
      const [tile] = free.splice(i, 1);
      return tile!.id;
    });
    return { kind: 'order' as const, sequence };
  }
  if (key.kind === 'match') return { kind: 'match' as const, pairs: key.pairs, moves: key.pairs.length };
  return { kind: 'ack' as const };
}

describe('seed data', () => {
  it('has exactly 44 phonemes with unique slugs and IPA', () => {
    expect(PHONEMES).toHaveLength(44);
    expect(new Set(PHONEMES.map((p) => p.slug)).size).toBe(44);
    expect(new Set(PHONEMES.map((p) => p.ipa)).size).toBe(44);
  });

  it('spells every word with graphemes the phoneme lists', () => {
    const graphemes = new Map(PHONEMES.map((p) => [p.slug, new Set(p.graphemes)]));
    for (const w of WORDS) {
      if (!w.breakdown) continue;
      const parts = w.breakdown.split(' ').map((t) => {
        const i = t.lastIndexOf(':');
        return [t.slice(0, i), t.slice(i + 1)] as const;
      });
      expect(parts.map(([g]) => g).join(''), w.text).toBe(w.text);
      for (const [g, slug] of parts) {
        expect(graphemes.has(slug), `${w.text}: phoneme ${slug}`).toBe(true);
        if (g) expect(graphemes.get(slug)!.has(g), `${w.text}: ${g} for /${slug}/`).toBe(true);
      }
    }
  });

  it('uses only existing words as phoneme examples', () => {
    const words = new Set(WORDS.map((w) => w.text));
    for (const p of PHONEMES) for (const e of p.examples) expect(words.has(e), `${p.slug}: ${e}`).toBe(true);
  });
});

describe('curriculum builds', () => {
  const lessons = CURRICULUM.flatMap((w) => w.levels.flatMap((l) => l.lessons));

  it('covers all 26 letters and all 44 sounds', () => {
    expect(lessons.filter((l) => l.kind === 'LETTER')).toHaveLength(26);
    expect(lessons.filter((l) => l.kind === 'SOUND')).toHaveLength(44);
  });

  for (const lesson of lessons) {
    it(`builds and grades ${lesson.slug}`, () => {
      expect(lesson.exercises.length).toBeGreaterThan(0);
      lesson.exercises.forEach((ex, i) => {
        const id = `${lesson.slug}-${i}`;
        expect(registry.missingReferences(ex.type, ex.config, content)).toEqual([]);
        const items = registry.build({ id, type: ex.type, config: ex.config }, content, 'seed-1');
        expect(items.length).toBeGreaterThan(0);
        for (const item of items) {
          if (item.view.kind === 'choice' && item.key.kind === 'choice') {
            const ids = item.view.options.map((o) => o.id);
            expect(new Set(ids).size).toBe(ids.length);
            expect(ids).toContain(item.key.optionId);
            expect(ids.length).toBeGreaterThanOrEqual(2);
          }
          const result = registry.grade(item, correctAnswer(item));
          if (item.key.kind === 'none') expect(result.correct).toBeNull();
          else expect(result, `${item.id}`).toMatchObject({ correct: true, score: expect.any(Number) });
        }
      });
    });
  }
});

describe('registry', () => {
  it('is deterministic for a seed and varies across seeds', () => {
    const ex = { id: 'x', type: 'sound_to_letter', config: { phonemes: ['s', 'ae', 't', 'i'], options: 4 } };
    const a = registry.build(ex, content, 'run-a');
    expect(registry.build(ex, content, 'run-a')).toEqual(a);
    const views = new Set(['b', 'c', 'd', 'e', 'f'].map((s) => JSON.stringify(registry.build(ex, content, s).map((i) => i.view))));
    expect(views.size).toBeGreaterThan(1);
  });

  it('never leaks the answer key to clients', () => {
    const [item] = registry.build({ id: 'x', type: 'blend', config: { words: ['ship'] } }, content, 's');
    const client = toClientItem(item!);
    expect(client).not.toHaveProperty('key');
    expect(client.graded).toBe(true);
  });

  it('rejects unknown types and invalid configs', () => {
    expect(() => registry.get('nope')).toThrow(ContentError);
    expect(() => registry.parseConfig('word_builder', { words: [] })).toThrow();
    expect(registry.missingReferences('listen_choose', { words: ['cat', 'zzz'] }, content)).toEqual(['word:zzz']);
  });

  it('marks a wrong choice wrong and reveals the expected answer', () => {
    const [item] = registry.build({ id: 'x', type: 'listen_choose', config: { words: ['cat'] } }, content, 's');
    const wrong = item!.view.kind === 'choice' ? item!.view.options.find((o) => o.id !== 'w:cat')!.id : '';
    expect(registry.grade(item!, { kind: 'choice', optionId: wrong })).toMatchObject({
      correct: false,
      score: 0,
      expected: { kind: 'choice', optionId: 'w:cat' },
    });
  });

  it('grades word builder by letters, accepting either copy of a repeated letter', () => {
    const [item] = registry.build({ id: 'x', type: 'word_builder', config: { words: ['egg'], extraTiles: 0 } }, content, 's');
    if (item!.view.kind !== 'order') throw new Error('expected order view');
    const g = item!.view.tiles.filter((t) => t.label === 'g').map((t) => t.id);
    const e = item!.view.tiles.find((t) => t.label === 'e')!.id;
    expect(registry.grade(item!, { kind: 'order', sequence: [e, g[1]!, g[0]!] }).correct).toBe(true);
    const partial = registry.grade(item!, { kind: 'order', sequence: [g[0]!, e, g[1]!] });
    expect(partial.correct).toBe(false);
    expect(partial.score).toBeGreaterThan(0);
  });

  it('builds x as one tile for two sounds', () => {
    const [item] = registry.build({ id: 'x', type: 'segment', config: { words: ['fox'] } }, content, 's');
    if (item!.view.kind !== 'order') throw new Error('expected order view');
    expect(item!.view.tiles.map((t) => t.label).sort()).toEqual(['f', 'o', 'x']);
  });

  it('scores memory by moves and hides pairs behind opaque ids', () => {
    const [item] = registry.build({ id: 'x', type: 'memory', config: { mode: 'letters', letters: ['A', 'B', 'C'] } }, content, 's');
    if (item!.view.kind !== 'match' || item!.key.kind !== 'match') throw new Error('expected match');
    expect(item!.view.cards.every((c) => /^c\d+$/.test(c.id))).toBe(true);
    expect(registry.grade(item!, { kind: 'match', pairs: item!.key.pairs, moves: 3 }).score).toBe(100);
    expect(registry.grade(item!, { kind: 'match', pairs: item!.key.pairs, moves: 9 }).score).toBe(70);
    expect(registry.grade(item!, { kind: 'match', pairs: [], moves: 3 }).correct).toBe(false);
  });
});

describe('plans', () => {
  it('builds a review block for weak sounds and words', () => {
    const plan = planReview(
      [
        { type: 'PHONEME', key: 'th-unvoiced' },
        { type: 'WORD', key: 'ship' },
        { type: 'LETTER', key: 'Q' },
      ],
      content,
    );
    expect(plan.map((p) => p.type)).toEqual([
      'listen',
      'sound_to_letter',
      'sound_to_word',
      'listen_choose',
      'word_builder',
      'letter_recognition',
    ]);
    for (const ex of plan) expect(registry.build(ex, content, 'r').length).toBeGreaterThan(0);
  });

  it('builds a placement test from content and maps scores to a start world', () => {
    const plan = planPlacement(content);
    expect(plan.map((p) => p.section)).toEqual([
      'alphabet',
      'letter_sounds',
      'phonemes',
      'blending',
      'cvc_reading',
      'listening',
      'reading',
    ]);
    for (const p of plan) expect(registry.build(p.exercise, content, 'p').length).toBeGreaterThan(0);
    expect(placementStart({})).toBe('alphabet-forest');
    expect(placementStart({ alphabet: 90, letter_sounds: 50, phonemes: 80 })).toBe('sound-island');
    expect(placementStart({ alphabet: 90, letter_sounds: 90, phonemes: 80, blending: 40 })).toBe('phonics-castle');
    expect(
      placementStart({ alphabet: 90, letter_sounds: 90, phonemes: 80, blending: 80, cvc_reading: 90, listening: 90 }),
    ).toBe('reading-kingdom');
  });
});

describe('game pools', () => {
  it('declares a known exercise type for each seeded game', () => {
    for (const g of GAMES) expect(registry.has(g.type), g.slug).toBe(true);
  });
});

describe('rng', () => {
  it('shuffles without losing items', () => {
    const rng = createRng('x');
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(rng.shuffle(items).sort()).toEqual(items);
  });
});
