import { LETTERS } from '../../database/prisma/data/letters';
import { PHONEMES } from '../../database/prisma/data/phonemes';
import { SENTENCES, WORDS, sentenceTokens } from '../../database/prisma/data/words';
import { createContentIndex, type ContentIndex } from '../src';

/** Content index built from the real seed data, with fake audio URLs so audio-dependent paths are exercised. */
export function seedContent(): ContentIndex {
  const wordSet = new Set(WORDS.map((w) => w.text));
  return createContentIndex({
    phonemes: PHONEMES.map((p) => ({
      slug: p.slug,
      symbol: p.symbol,
      ipa: p.ipa,
      category: p.category,
      voiced: p.voiced,
      graphemes: p.graphemes,
      audioUrl: `/media/phonemes/${p.slug}.mp3`,
      mouthPosition: p.mouth,
      mouthImageUrl: null,
    })),
    words: WORDS.map((w) => ({
      text: w.text,
      pattern: w.pattern,
      emoji: w.emoji,
      imageUrl: null,
      audioUrl: null,
      isSightWord: w.pattern === 'SIGHT',
      difficulty: w.difficulty,
      translation: { en: w.text, kk: w.kk, ru: w.ru },
      sounds: w.breakdown
        ? w.breakdown.split(' ').map((t) => {
            const i = t.lastIndexOf(':');
            return { grapheme: t.slice(0, i), phoneme: t.slice(i + 1) };
          })
        : [],
    })),
    letters: LETTERS.map((l) => ({ char: l.char, name: l.name, isVowel: l.isVowel, audioUrl: null, exampleWord: l.example })),
    sentences: SENTENCES.map((s, i) => ({
      id: `s${i}`,
      text: s.text,
      audioUrl: null,
      translation: { en: s.text, kk: s.kk, ru: s.ru },
      words: sentenceTokens(s.text).filter((t) => wordSet.has(t)),
    })),
  });
}
