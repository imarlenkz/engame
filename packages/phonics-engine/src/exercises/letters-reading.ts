import { z } from 'zod';
import { ContentError, requireLetter, requireWord } from '../content';
import { choice, optionId, pictureWords } from '../helpers';
import { sentenceMedia, wordPicture } from '../media';
import type { ExerciseType, MemoryCard } from '../types';

const optionsCount = z.number().int().min(2).max(6).default(3);

function sortedLetters(chars: Iterable<string>): string[] {
  return [...chars].sort();
}

/** Letter Match: see an upper-case letter, pick its lower-case partner (or the reverse). */
export const letterMatch: ExerciseType<{ letters: string[]; direction: 'upper_to_lower' | 'lower_to_upper'; options: number }> =
  {
    key: 'letter_match',
    label: 'exercise.letterMatch',
    skills: ['LETTER_RECOGNITION'],
    configSchema: z.object({
      letters: z.array(z.string().length(1)).min(1),
      direction: z.enum(['upper_to_lower', 'lower_to_upper']).default('upper_to_lower'),
      options: optionsCount,
    }),
    references: (c) => ({ letters: c.letters }),
    build(c, content, rng) {
      const all = sortedLetters(content.letters.keys());
      return c.letters.map((raw) => {
        const l = requireLetter(content, raw);
        const show = (ch: string) => (c.direction === 'upper_to_lower' ? ch.toLowerCase() : ch.toUpperCase());
        const built = choice(
          rng,
          'exercise.letterMatch.instruction',
          { text: c.direction === 'upper_to_lower' ? l.char : l.char.toLowerCase() },
          { id: optionId.letter(l.char), media: { text: show(l.char) } },
          all.filter((ch) => ch !== l.char).map((ch) => ({ id: optionId.letter(ch), media: { text: show(ch) } })),
          c.options,
        );
        return { ...built, targets: [{ type: 'LETTER' as const, key: l.char }] };
      });
    },
  };

/** Alphabet recognition: hear a letter name, pick the letter. */
export const letterRecognition: ExerciseType<{ letters: string[]; options: number }> = {
  key: 'letter_recognition',
  label: 'exercise.letterRecognition',
  skills: ['LETTER_RECOGNITION'],
  configSchema: z.object({ letters: z.array(z.string().length(1)).min(1), options: optionsCount }),
  references: (c) => ({ letters: c.letters }),
  build(c, content, rng) {
    const all = sortedLetters(content.letters.keys());
    return c.letters.map((raw) => {
      const l = requireLetter(content, raw);
      const built = choice(
        rng,
        'exercise.letterRecognition.instruction',
        { audioUrl: l.audioUrl, speak: l.char },
        { id: optionId.letter(l.char), media: { text: `${l.char}${l.char.toLowerCase()}` } },
        all
          .filter((ch) => ch !== l.char)
          .map((ch) => ({ id: optionId.letter(ch), media: { text: `${ch}${ch.toLowerCase()}` } })),
        c.options,
      );
      return { ...built, targets: [{ type: 'LETTER' as const, key: l.char }] };
    });
  },
};

/** Read a sentence and pick the picture it is about. */
export const readSentence: ExerciseType<{ items: { sentence: string; answer: string; distractors?: string[] }[]; options: number }> =
  {
    key: 'read_sentence',
    label: 'exercise.readSentence',
    skills: ['READING'],
    configSchema: z.object({
      items: z
        .array(z.object({ sentence: z.string(), answer: z.string(), distractors: z.array(z.string()).optional() }))
        .min(1),
      options: optionsCount,
    }),
    references: (c) => ({
      sentences: c.items.map((i) => i.sentence),
      words: c.items.flatMap((i) => [i.answer, ...(i.distractors ?? [])]),
    }),
    build(c, content, rng) {
      return c.items.map((it) => {
        const s = content.sentences.get(it.sentence);
        if (!s) throw new ContentError(`Unknown sentence "${it.sentence}"`);
        const answer = requireWord(content, it.answer);
        const pool = it.distractors?.length
          ? it.distractors.map((t) => requireWord(content, t))
          : pictureWords(content, s.words);
        const built = choice(
          rng,
          'exercise.readSentence.instruction',
          sentenceMedia(s),
          { id: optionId.word(answer.text), media: { emoji: answer.emoji, imageUrl: answer.imageUrl } },
          pool.map((d) => ({ id: optionId.word(d.text), media: { emoji: d.emoji, imageUrl: d.imageUrl } })),
          c.options,
        );
        return { ...built, targets: s.words.filter((t) => content.words.has(t)).map((t) => ({ type: 'WORD' as const, key: t })) };
      });
    },
  };

/** Memory: flip cards to find pairs (upper/lower letter or word/picture). */
export const memory: ExerciseType<{ mode: 'letters' | 'words'; letters?: string[]; words?: string[] }> = {
  key: 'memory',
  label: 'exercise.memory',
  skills: ['LETTER_RECOGNITION', 'READING'],
  configSchema: z
    .object({
      mode: z.enum(['letters', 'words']),
      letters: z.array(z.string().length(1)).max(8).optional(),
      words: z.array(z.string()).max(8).optional(),
    })
    .refine((c) => (c.mode === 'letters' ? (c.letters?.length ?? 0) >= 2 : (c.words?.length ?? 0) >= 2), {
      message: 'memory needs at least two pairs',
    }),
  references: (c) => ({ letters: c.letters, words: c.words }),
  build(c, content, rng) {
    const cards: MemoryCard[] = [];
    const pairs: [string, string][] = [];
    const targets: { type: 'LETTER' | 'WORD'; key: string }[] = [];
    if (c.mode === 'letters') {
      for (const raw of c.letters ?? []) {
        const l = requireLetter(content, raw);
        cards.push({ id: `${l.char}-u`, media: { text: l.char } }, { id: `${l.char}-l`, media: { text: l.char.toLowerCase() } });
        pairs.push([`${l.char}-u`, `${l.char}-l`]);
        targets.push({ type: 'LETTER', key: l.char });
      }
    } else {
      for (const t of c.words ?? []) {
        const w = requireWord(content, t);
        cards.push({ id: `${w.text}-t`, media: { text: w.text } }, { id: `${w.text}-p`, media: wordPicture(w) });
        pairs.push([`${w.text}-t`, `${w.text}-p`]);
        targets.push({ type: 'WORD', key: w.text });
      }
    }
    // Card ids reveal pairs, so the client receives opaque ids instead.
    const shuffled = rng.shuffle(cards).map((card, i) => ({ ...card, opaque: `c${i}` }));
    const map = new Map(shuffled.map((card) => [card.id, card.opaque]));
    return [
      {
        view: {
          kind: 'match',
          instruction: 'exercise.memory.instruction',
          cards: shuffled.map((card) => ({ id: card.opaque, media: card.media })),
        },
        key: { kind: 'match', pairs: pairs.map(([a, b]) => [map.get(a) as string, map.get(b) as string]) },
        targets,
      },
    ];
  },
};
