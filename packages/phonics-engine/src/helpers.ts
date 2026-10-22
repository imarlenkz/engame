import { requireWord, type ContentIndex, type PhonemeRef, type WordRef } from './content';
import type { Rng } from './rng';
import type { AnswerKey, ChoiceOption, ItemView, Media } from './types';

export const optionId = {
  phoneme: (slug: string) => `p:${slug}`,
  word: (text: string) => `w:${text}`,
  letter: (char: string) => `l:${char}`,
  text: (value: string) => `t:${value}`,
};

/** Shuffled choice with one correct option. */
export function choice(
  rng: Rng,
  instruction: string,
  prompt: Media,
  correct: ChoiceOption,
  distractors: ChoiceOption[],
  optionCount: number,
): { view: ItemView; key: AnswerKey } {
  const unique = distractors.filter((d, i, all) => d.id !== correct.id && all.findIndex((x) => x.id === d.id) === i);
  const picked = rng.sample(unique, Math.max(1, optionCount - 1));
  return {
    view: { kind: 'choice', instruction, prompt, options: rng.shuffle([correct, ...picked]) },
    key: { kind: 'choice', optionId: correct.id },
  };
}

function sortedValues<T>(map: Map<string, T>): T[] {
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

/** Phonemes other than `exclude`, preferring ones of the same category so options are plausible. */
export function phonemeDistractors(content: ContentIndex, exclude: string[], preferCategory?: string): PhonemeRef[] {
  const all = sortedValues(content.phonemes).filter((p) => !exclude.includes(p.slug));
  if (!preferCategory) return all;
  const same = all.filter((p) => p.category === preferCategory);
  return same.length >= 3 ? same : all;
}

/** Words with a picture, excluding the given ones, optionally filtered. */
export function pictureWords(
  content: ContentIndex,
  exclude: string[],
  filter: (w: WordRef) => boolean = () => true,
): WordRef[] {
  return sortedValues(content.words).filter(
    (w) => !exclude.includes(w.text) && (w.emoji || w.imageUrl) && filter(w),
  );
}

export function wordHasPhoneme(w: WordRef, slug: string): boolean {
  return w.sounds.some((s) => s.phoneme === slug);
}

export function resolveDistractorWords(content: ContentIndex, texts: string[] | undefined): WordRef[] | null {
  if (!texts || texts.length === 0) return null;
  return texts.map((t) => requireWord(content, t));
}
