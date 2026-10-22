import { z } from 'zod';
import { requireLetter, requirePhoneme, requireWord } from '../content';
import { letterMedia, phonemeMedia, wordMedia } from '../media';
import type { ExerciseType } from '../types';

const NONE = { kind: 'none' } as const;

/** INTRO/TEACH for a letter: big letter, its name, and an example word. */
export const teachLetter: ExerciseType<{ letter: string }> = {
  key: 'teach_letter',
  label: 'exercise.teachLetter',
  skills: ['LETTER_RECOGNITION'],
  configSchema: z.object({ letter: z.string().length(1) }),
  references: (c) => ({ letters: [c.letter] }),
  build(c, content) {
    const l = requireLetter(content, c.letter);
    const example = l.exampleWord ? content.words.get(l.exampleWord) : undefined;
    return [
      {
        view: {
          kind: 'present',
          instruction: 'exercise.teachLetter.instruction',
          focus: letterMedia(l),
          details: example ? [wordMedia(example)] : undefined,
        },
        key: NONE,
        targets: [],
      },
    ];
  },
};

/** TEACH for a sound: spelling(s), IPA, and example words. */
export const teachSound: ExerciseType<{ phoneme: string; words: string[] }> = {
  key: 'teach_sound',
  label: 'exercise.teachSound',
  skills: ['LETTER_SOUND'],
  configSchema: z.object({ phoneme: z.string(), words: z.array(z.string()).max(4).default([]) }),
  references: (c) => ({ phonemes: [c.phoneme], words: c.words }),
  build(c, content) {
    const p = requirePhoneme(content, c.phoneme);
    return [
      {
        view: {
          kind: 'present',
          instruction: 'exercise.teachSound.instruction',
          focus: { ...phonemeMedia(p), caption: { en: p.graphemes.join(', ') } },
          details: c.words.map((t) => wordMedia(requireWord(content, t))),
        },
        key: NONE,
        targets: [],
      },
    ];
  },
};

/** LISTEN: the sound on its own, then inside words. */
export const listen: ExerciseType<{ phoneme: string; words: string[] }> = {
  key: 'listen',
  label: 'exercise.listen',
  skills: ['LISTENING'],
  configSchema: z.object({ phoneme: z.string(), words: z.array(z.string()).max(6).default([]) }),
  references: (c) => ({ phonemes: [c.phoneme], words: c.words }),
  build(c, content) {
    const p = requirePhoneme(content, c.phoneme);
    return [
      { view: { kind: 'present', instruction: 'exercise.listen.sound', focus: phonemeMedia(p) }, key: NONE, targets: [] },
      ...c.words.map((t) => ({
        view: {
          kind: 'present' as const,
          instruction: 'exercise.listen.word',
          focus: wordMedia(requireWord(content, t)),
        },
        key: NONE,
        targets: [],
      })),
    ];
  },
};

/** WATCH: mouth position for the sound (picture/animation uploaded in the CMS, plus a description). */
export const watchMouth: ExerciseType<{ phoneme: string }> = {
  key: 'watch_mouth',
  label: 'exercise.watchMouth',
  skills: ['SPEAKING'],
  configSchema: z.object({ phoneme: z.string() }),
  references: (c) => ({ phonemes: [c.phoneme] }),
  build(c, content) {
    const p = requirePhoneme(content, c.phoneme);
    return [
      {
        view: {
          kind: 'present',
          instruction: 'exercise.watchMouth.instruction',
          focus: { ...phonemeMedia(p), imageUrl: p.mouthImageUrl, caption: p.mouthPosition },
        },
        key: NONE,
        targets: [],
      },
    ];
  },
};

/**
 * REPEAT: the child says the sound/words. Scoring happens only through POST /pronunciation/analyze when a
 * speech provider is configured; inside the lesson the step is acknowledged, never auto-marked correct.
 */
export const repeat: ExerciseType<{ phoneme?: string; words: string[] }> = {
  key: 'repeat',
  label: 'exercise.repeat',
  skills: ['SPEAKING'],
  configSchema: z.object({ phoneme: z.string().optional(), words: z.array(z.string()).min(1).max(5) }),
  references: (c) => ({ phonemes: c.phoneme ? [c.phoneme] : [], words: c.words }),
  build(c, content) {
    return c.words.map((t) => {
      const w = requireWord(content, t);
      return {
        view: { kind: 'speak' as const, instruction: 'exercise.repeat.instruction', prompt: wordMedia(w), target: w.text },
        key: NONE,
        targets: [],
      };
    });
  },
};
