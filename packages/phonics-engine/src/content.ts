/** Read-only view of CMS content that exercise types build items from. */

export type Locale = 'en' | 'kk' | 'ru';
export type LocalizedText = { en: string; kk?: string; ru?: string };

export interface PhonemeRef {
  slug: string;
  symbol: string;
  ipa: string;
  category: string;
  voiced: boolean;
  graphemes: string[];
  audioUrl: string | null;
  mouthPosition: LocalizedText | Record<string, string>;
  mouthImageUrl: string | null;
}

export interface WordSound {
  phoneme: string; // phoneme slug
  /** Letters spelling this sound. Empty when one grapheme spells two sounds (the s of "x" in "fox"). */
  grapheme: string;
}

export interface WordRef {
  text: string;
  pattern: string;
  emoji: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  isSightWord: boolean;
  difficulty: number;
  translation: LocalizedText | Record<string, string>;
  sounds: WordSound[];
}

export interface LetterRef {
  char: string;
  name: string;
  isVowel: boolean;
  audioUrl: string | null;
  exampleWord: string | null;
}

export interface SentenceRef {
  id: string;
  text: string;
  audioUrl: string | null;
  translation: LocalizedText | Record<string, string>;
  words: string[];
}

export interface ContentIndex {
  phonemes: Map<string, PhonemeRef>;
  words: Map<string, WordRef>;
  letters: Map<string, LetterRef>;
  sentences: Map<string, SentenceRef>;
}

export function createContentIndex(input: {
  phonemes?: PhonemeRef[];
  words?: WordRef[];
  letters?: LetterRef[];
  sentences?: SentenceRef[];
}): ContentIndex {
  return {
    phonemes: new Map((input.phonemes ?? []).map((p) => [p.slug, p])),
    words: new Map((input.words ?? []).map((w) => [w.text, w])),
    letters: new Map((input.letters ?? []).map((l) => [l.char, l])),
    sentences: new Map((input.sentences ?? []).map((s) => [s.text, s])),
  };
}

export class ContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentError';
  }
}

export function requirePhoneme(content: ContentIndex, slug: string): PhonemeRef {
  const p = content.phonemes.get(slug);
  if (!p) throw new ContentError(`Unknown phoneme "${slug}"`);
  return p;
}

export function requireWord(content: ContentIndex, text: string): WordRef {
  const w = content.words.get(text);
  if (!w) throw new ContentError(`Unknown word "${text}"`);
  return w;
}

export function requireLetter(content: ContentIndex, char: string): LetterRef {
  const l = content.letters.get(char.toUpperCase());
  if (!l) throw new ContentError(`Unknown letter "${char}"`);
  return l;
}
