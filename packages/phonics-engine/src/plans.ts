import type { ContentIndex } from './content';
import { pictureWords } from './helpers';
import type { MasteryTarget } from './types';

export interface PlannedExercise {
  id: string;
  type: string;
  config: unknown;
}

/**
 * Review block for weak/due items: Listen → Match → Word practice for sounds, Listen & Choose → Build for words,
 * Recognise for letters. Generated per run, so it changes as the child improves.
 */
export function planReview(targets: MasteryTarget[], content: ContentIndex): PlannedExercise[] {
  const out: PlannedExercise[] = [];
  targets.forEach((t, i) => {
    const id = `review-${i}`;
    if (t.type === 'PHONEME' && content.phonemes.has(t.key)) {
      const words = pictureWords(content, [], (w) => w.sounds.some((s) => s.phoneme === t.key))
        .slice(0, 2)
        .map((w) => w.text);
      out.push({ id: `${id}-listen`, type: 'listen', config: { phoneme: t.key, words } });
      out.push({ id: `${id}-match`, type: 'sound_to_letter', config: { phonemes: [t.key], options: 3 } });
      if (words.length > 0) {
        out.push({ id: `${id}-words`, type: 'sound_to_word', config: { phoneme: t.key, words: words.slice(0, 1), options: 3 } });
      }
    } else if (t.type === 'WORD' && content.words.has(t.key)) {
      out.push({ id: `${id}-listen`, type: 'listen_choose', config: { words: [t.key], options: 3 } });
      out.push({ id: `${id}-build`, type: 'word_builder', config: { words: [t.key], tiles: 'letters', extraTiles: 1 } });
    } else if (t.type === 'LETTER' && content.letters.has(t.key)) {
      out.push({ id: `${id}-letter`, type: 'letter_recognition', config: { letters: [t.key], options: 3 } });
    }
  });
  return out;
}

export const PLACEMENT_SECTIONS = [
  'alphabet',
  'letter_sounds',
  'phonemes',
  'blending',
  'cvc_reading',
  'listening',
  'reading',
] as const;
export type PlacementSection = (typeof PLACEMENT_SECTIONS)[number];

/** Start points in curriculum order; the API maps each to the first lesson of that world. */
export const PLACEMENT_START = ['alphabet-forest', 'sound-island', 'phonics-castle', 'word-space', 'reading-kingdom'] as const;
export type PlacementStart = (typeof PLACEMENT_START)[number];

function pick<T>(items: T[], n: number, step = 1): T[] {
  const out: T[] = [];
  for (let i = 0; i < items.length && out.length < n; i += step) out.push(items[i] as T);
  return out;
}

/** Short adaptive-free placement test (about 25 items) built from whatever content is published. */
export function planPlacement(content: ContentIndex): { section: PlacementSection; exercise: PlannedExercise }[] {
  const letters = [...content.letters.keys()].sort();
  const phonemes = [...content.phonemes.values()];
  const single = phonemes.filter((p) => p.symbol.length === 1).map((p) => p.slug);
  const multi = phonemes.filter((p) => p.symbol.length > 1).map((p) => p.slug);
  const words = [...content.words.values()].filter((w) => w.emoji || w.imageUrl);
  const cvc = words.filter((w) => w.pattern === 'CVC').map((w) => w.text);
  const harder = words.filter((w) => w.pattern !== 'CVC' && !w.isSightWord).map((w) => w.text);
  const sentences = [...content.sentences.values()];

  const plan: { section: PlacementSection; exercise: PlannedExercise }[] = [];
  const add = (section: PlacementSection, type: string, config: unknown) =>
    plan.push({ section, exercise: { id: `placement-${section}`, type, config } });

  if (letters.length >= 4) add('alphabet', 'letter_recognition', { letters: pick(letters, 4, 6), options: 4 });
  if (single.length >= 4) add('letter_sounds', 'letter_to_sound', { phonemes: pick(single, 4, 4), options: 3 });
  if (multi.length >= 3) add('phonemes', 'sound_to_letter', { phonemes: pick(multi, 4, 3), options: 3 });
  if (cvc.length >= 3) add('blending', 'blend', { words: pick(cvc, 3, 5), options: 3 });
  if (cvc.length >= 6) add('cvc_reading', 'read_word', { words: pick(cvc.slice(1), 3, 4), options: 3 });
  if (harder.length >= 3) add('listening', 'listen_choose', { words: pick(harder, 3, 3), options: 3 });
  const readable = sentences.filter((s) => s.words.some((t) => words.some((w) => w.text === t)));
  if (readable.length >= 1) {
    add('reading', 'read_sentence', {
      items: pick(readable, 2, 1).map((s) => ({
        sentence: s.text,
        answer: s.words.find((t) => words.some((w) => w.text === t)) as string,
      })),
      options: 3,
    });
  }
  return plan;
}

/** Where to start, from per-section accuracy (0–100). Missing sections count as not yet known. */
export function placementStart(scores: Partial<Record<PlacementSection, number>>): PlacementStart {
  const ok = (s: PlacementSection) => (scores[s] ?? 0) >= 70;
  if (!ok('alphabet')) return 'alphabet-forest';
  if (!ok('letter_sounds') || !ok('phonemes')) return 'sound-island';
  if (!ok('blending')) return 'phonics-castle';
  if (!ok('cvc_reading') || !ok('listening')) return 'word-space';
  return 'reading-kingdom';
}
