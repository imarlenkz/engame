import { z } from 'zod';
import { requirePhoneme, requireWord } from '../content';
import { choice, optionId, phonemeDistractors, pictureWords, resolveDistractorWords, wordHasPhoneme } from '../helpers';
import { phonemeAudioOnly, phonemeMedia, wordMedia, wordPicture } from '../media';
import type { ExerciseType } from '../types';

const optionsCount = z.number().int().min(2).max(6).default(3);

/** Letter → Sound: see a spelling, pick the sound it makes. */
export const letterToSound: ExerciseType<{ phonemes: string[]; options: number }> = {
  key: 'letter_to_sound',
  label: 'exercise.letterToSound',
  skills: ['LETTER_SOUND'],
  configSchema: z.object({ phonemes: z.array(z.string()).min(1), options: optionsCount }),
  references: (c) => ({ phonemes: c.phonemes }),
  build(c, content, rng) {
    return c.phonemes.map((slug) => {
      const p = requirePhoneme(content, slug);
      const distractors = phonemeDistractors(content, [slug], p.category).map((d) => ({
        id: optionId.phoneme(d.slug),
        media: phonemeAudioOnly(d),
      }));
      const built = choice(
        rng,
        'exercise.letterToSound.instruction',
        { text: p.symbol },
        { id: optionId.phoneme(slug), media: phonemeAudioOnly(p) },
        distractors,
        c.options,
      );
      return { ...built, targets: [{ type: 'PHONEME' as const, key: slug }] };
    });
  },
};

/** Sound → Letter: hear a sound, pick its spelling. Also used by the Sound Match game. */
export const soundToLetter: ExerciseType<{ phonemes: string[]; options: number }> = {
  key: 'sound_to_letter',
  label: 'exercise.soundToLetter',
  skills: ['SOUND_LETTER'],
  configSchema: z.object({ phonemes: z.array(z.string()).min(1), options: optionsCount }),
  references: (c) => ({ phonemes: c.phonemes }),
  build(c, content, rng) {
    return c.phonemes.map((slug) => {
      const p = requirePhoneme(content, slug);
      const distractors = phonemeDistractors(content, [slug], p.category)
        .filter((d) => d.symbol !== p.symbol)
        .map((d) => ({ id: optionId.phoneme(d.slug), media: { text: d.symbol } }));
      const built = choice(
        rng,
        'exercise.soundToLetter.instruction',
        phonemeAudioOnly(p),
        { id: optionId.phoneme(slug), media: { text: p.symbol } },
        distractors,
        c.options,
      );
      return { ...built, targets: [{ type: 'PHONEME' as const, key: slug }] };
    });
  },
};

/** Sound → Word: hear a sound, pick the picture whose word contains it. */
export const soundToWord: ExerciseType<{ phoneme: string; words: string[]; distractors?: string[]; options: number }> = {
  key: 'sound_to_word',
  label: 'exercise.soundToWord',
  skills: ['SOUND_WORD'],
  configSchema: z.object({
    phoneme: z.string(),
    words: z.array(z.string()).min(1),
    distractors: z.array(z.string()).optional(),
    options: optionsCount,
  }),
  references: (c) => ({ phonemes: [c.phoneme], words: [...c.words, ...(c.distractors ?? [])] }),
  build(c, content, rng) {
    const p = requirePhoneme(content, c.phoneme);
    const pool =
      resolveDistractorWords(content, c.distractors) ??
      pictureWords(content, c.words, (w) => !wordHasPhoneme(w, c.phoneme));
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const built = choice(
        rng,
        'exercise.soundToWord.instruction',
        phonemeMedia(p, { showText: false }),
        { id: optionId.word(w.text), media: wordPicture(w) },
        pool.map((d) => ({ id: optionId.word(d.text), media: wordPicture(d) })),
        c.options,
      );
      return {
        ...built,
        targets: [
          { type: 'PHONEME' as const, key: c.phoneme },
          { type: 'WORD' as const, key: w.text },
        ],
      };
    });
  },
};

/** Word → Sound: see a word (picture + text), pick its first sound. */
export const wordToSound: ExerciseType<{ words: string[]; options: number }> = {
  key: 'word_to_sound',
  label: 'exercise.wordToSound',
  skills: ['WORD_SOUND'],
  configSchema: z.object({ words: z.array(z.string()).min(1), options: optionsCount }),
  references: (c) => ({ words: c.words }),
  build(c, content, rng) {
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const first = w.sounds[0];
      if (!first) throw new Error(`Word "${t}" has no phoneme breakdown`);
      const p = requirePhoneme(content, first.phoneme);
      const built = choice(
        rng,
        'exercise.wordToSound.instruction',
        wordMedia(w),
        { id: optionId.phoneme(p.slug), media: phonemeMedia(p) },
        phonemeDistractors(content, [p.slug], p.category).map((d) => ({
          id: optionId.phoneme(d.slug),
          media: phonemeMedia(d),
        })),
        c.options,
      );
      return {
        ...built,
        targets: [
          { type: 'PHONEME' as const, key: p.slug },
          { type: 'WORD' as const, key: w.text },
        ],
      };
    });
  },
};
