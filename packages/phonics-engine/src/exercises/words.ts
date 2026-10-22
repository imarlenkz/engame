import { z } from 'zod';
import { requirePhoneme, requireWord, type WordRef } from '../content';
import { choice, optionId, pictureWords, resolveDistractorWords } from '../helpers';
import { phonemeAudioOnly, wordAudioOnly, wordMedia, wordPicture } from '../media';
import type { ExerciseType, MasteryTarget, Tile } from '../types';

const optionsCount = z.number().int().min(2).max(6).default(3);
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

/** Graphemes of a word, skipping continuation sounds that share the previous grapheme. */
function spelledParts(w: WordRef): string[] {
  return w.sounds.map((s) => s.grapheme).filter(Boolean);
}

function wordTargets(w: WordRef): MasteryTarget[] {
  return [{ type: 'WORD', key: w.text }, ...w.sounds.map((s) => ({ type: 'PHONEME' as const, key: s.phoneme }))];
}

/** Listen & Choose: hear a word, pick its picture. */
export const listenChoose: ExerciseType<{ words: string[]; distractors?: string[]; options: number }> = {
  key: 'listen_choose',
  label: 'exercise.listenChoose',
  skills: ['LISTENING'],
  configSchema: z.object({
    words: z.array(z.string()).min(1),
    distractors: z.array(z.string()).optional(),
    options: optionsCount,
  }),
  references: (c) => ({ words: [...c.words, ...(c.distractors ?? [])] }),
  build(c, content, rng) {
    const pool = resolveDistractorWords(content, c.distractors) ?? pictureWords(content, c.words);
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const built = choice(
        rng,
        'exercise.listenChoose.instruction',
        wordAudioOnly(w),
        { id: optionId.word(w.text), media: wordPicture(w) },
        pool.filter((d) => d.text !== w.text).map((d) => ({ id: optionId.word(d.text), media: wordPicture(d) })),
        c.options,
      );
      return { ...built, targets: [{ type: 'WORD' as const, key: w.text }] };
    });
  },
};

/** Word Builder: arrange letter (or grapheme) tiles to spell the pictured word. */
export const wordBuilder: ExerciseType<{ words: string[]; tiles: 'letters' | 'graphemes'; extraTiles: number }> = {
  key: 'word_builder',
  label: 'exercise.wordBuilder',
  skills: ['SPELLING', 'SEGMENTING'],
  configSchema: z.object({
    words: z.array(z.string()).min(1),
    tiles: z.enum(['letters', 'graphemes']).default('letters'),
    extraTiles: z.number().int().min(0).max(4).default(1),
  }),
  references: (c) => ({ words: c.words }),
  build(c, content, rng) {
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const parts = c.tiles === 'graphemes' ? spelledParts(w) : w.text.split('');
      const extras = rng.sample(
        ALPHABET.filter((l) => !parts.includes(l)),
        c.extraTiles,
      );
      const tiles: Tile[] = rng.shuffle([...parts, ...extras]).map((label, i) => ({ id: `t${i}`, label }));
      return {
        view: {
          kind: 'order' as const,
          instruction: 'exercise.wordBuilder.instruction',
          prompt: wordPicture(w),
          tiles,
          slots: parts.length,
        },
        key: { kind: 'order' as const, sequence: parts },
        targets: wordTargets(w),
      };
    });
  },
};

/** Segmenting: put the word's sounds in order (tiles are graphemes and play their sound). */
export const segment: ExerciseType<{ words: string[] }> = {
  key: 'segment',
  label: 'exercise.segment',
  skills: ['SEGMENTING'],
  configSchema: z.object({ words: z.array(z.string()).min(1) }),
  references: (c) => ({ words: c.words }),
  build(c, content, rng) {
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const parts = w.sounds
        .filter((s) => s.grapheme)
        .map((s) => ({ label: s.grapheme, audioUrl: requirePhoneme(content, s.phoneme).audioUrl }));
      const tiles: Tile[] = rng.shuffle(parts).map((tile, i) => ({ id: `t${i}`, ...tile }));
      return {
        view: {
          kind: 'order' as const,
          instruction: 'exercise.segment.instruction',
          prompt: wordMedia(w, { showText: false }),
          tiles,
          slots: parts.length,
        },
        key: { kind: 'order' as const, sequence: parts.map((p) => p.label) },
        targets: wordTargets(w),
      };
    });
  },
};

/** Blending: hear the sounds one by one (s-h-i-p), pick the word they make. */
export const blend: ExerciseType<{ words: string[]; distractors?: string[]; options: number }> = {
  key: 'blend',
  label: 'exercise.blend',
  skills: ['BLENDING'],
  configSchema: z.object({
    words: z.array(z.string()).min(1),
    distractors: z.array(z.string()).optional(),
    options: optionsCount,
  }),
  references: (c) => ({ words: [...c.words, ...(c.distractors ?? [])] }),
  build(c, content, rng) {
    const pool = resolveDistractorWords(content, c.distractors) ?? pictureWords(content, c.words);
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const sequence = w.sounds.map((s) => ({ ...phonemeAudioOnly(requirePhoneme(content, s.phoneme)), text: s.grapheme }));
      // Prefer distractors that share the first or last sound so the child has to blend, not guess.
      const near = pool.filter(
        (d) => d.text !== w.text && (d.sounds[0]?.phoneme === w.sounds[0]?.phoneme || d.sounds.at(-1)?.phoneme === w.sounds.at(-1)?.phoneme),
      );
      const others = near.length >= c.options - 1 ? near : pool.filter((d) => d.text !== w.text);
      const built = choice(
        rng,
        'exercise.blend.instruction',
        { sequence },
        { id: optionId.word(w.text), media: wordPicture(w) },
        others.map((d) => ({ id: optionId.word(d.text), media: wordPicture(d) })),
        c.options,
      );
      return { ...built, targets: wordTargets(w) };
    });
  },
};

/** Missing Letter: one grapheme of the word is hidden; pick it. */
export const missingLetter: ExerciseType<{ words: string[]; options: number }> = {
  key: 'missing_letter',
  label: 'exercise.missingLetter',
  skills: ['SPELLING', 'LETTER_SOUND'],
  configSchema: z.object({ words: z.array(z.string()).min(1), options: optionsCount }),
  references: (c) => ({ words: c.words }),
  build(c, content, rng) {
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const spelled = w.sounds.map((s, i) => i).filter((i) => w.sounds[i]?.grapheme);
      const idx = rng.pick(spelled);
      const hidden = w.sounds[idx];
      if (!hidden) throw new Error(`Word "${t}" has no phoneme breakdown`);
      const masked = w.sounds.map((s, i) => (i === idx ? '_'.repeat(s.grapheme.length) : s.grapheme)).join('');
      const otherGraphemes = [...content.phonemes.values()]
        .filter((p) => p.slug !== hidden.phoneme)
        .map((p) => p.symbol)
        .filter((g) => g !== hidden.grapheme && g.length === hidden.grapheme.length)
        .sort();
      const built = choice(
        rng,
        'exercise.missingLetter.instruction',
        { ...wordPicture(w), text: masked },
        { id: optionId.text(hidden.grapheme), media: { text: hidden.grapheme } },
        [...new Set(otherGraphemes)].map((g) => ({ id: optionId.text(g), media: { text: g } })),
        c.options,
      );
      return {
        ...built,
        targets: [
          { type: 'PHONEME' as const, key: hidden.phoneme },
          { type: 'WORD' as const, key: w.text },
        ],
      };
    });
  },
};

/** Sight words: hear a tricky word, pick its spelling among other sight words. */
export const sightWord: ExerciseType<{ words: string[]; distractors?: string[]; options: number }> = {
  key: 'sight_word',
  label: 'exercise.sightWord',
  skills: ['SIGHT_WORDS'],
  configSchema: z.object({
    words: z.array(z.string()).min(1),
    distractors: z.array(z.string()).optional(),
    options: optionsCount,
  }),
  references: (c) => ({ words: [...c.words, ...(c.distractors ?? [])] }),
  build(c, content, rng) {
    const pool =
      resolveDistractorWords(content, c.distractors) ??
      [...content.words.values()].filter((w) => w.isSightWord).sort((a, b) => a.text.localeCompare(b.text));
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const built = choice(
        rng,
        'exercise.sightWord.instruction',
        wordAudioOnly(w),
        { id: optionId.word(w.text), media: { text: w.text } },
        pool.filter((d) => d.text !== w.text).map((d) => ({ id: optionId.word(d.text), media: { text: d.text } })),
        c.options,
      );
      return { ...built, targets: [{ type: 'WORD' as const, key: w.text }] };
    });
  },
};

/** Read a word (text only, no audio), pick its picture. */
export const readWord: ExerciseType<{ words: string[]; distractors?: string[]; options: number }> = {
  key: 'read_word',
  label: 'exercise.readWord',
  skills: ['READING'],
  configSchema: z.object({
    words: z.array(z.string()).min(1),
    distractors: z.array(z.string()).optional(),
    options: optionsCount,
  }),
  references: (c) => ({ words: [...c.words, ...(c.distractors ?? [])] }),
  build(c, content, rng) {
    const pool = resolveDistractorWords(content, c.distractors) ?? pictureWords(content, c.words);
    return c.words.map((t) => {
      const w = requireWord(content, t);
      const built = choice(
        rng,
        'exercise.readWord.instruction',
        { text: w.text },
        { id: optionId.word(w.text), media: { emoji: w.emoji, imageUrl: w.imageUrl } },
        pool
          .filter((d) => d.text !== w.text)
          .map((d) => ({ id: optionId.word(d.text), media: { emoji: d.emoji, imageUrl: d.imageUrl } })),
        c.options,
      );
      return { ...built, targets: wordTargets(w) };
    });
  },
};

