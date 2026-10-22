import type { ZodType, ZodTypeDef } from 'zod';
import type { ContentIndex, LocalizedText } from './content';
import type { Rng } from './rng';

/** Something the child sees or hears. Clients render whichever fields are present. */
export interface Media {
  text?: string;
  ipa?: string;
  emoji?: string | null;
  imageUrl?: string | null;
  /** Recorded clip. When absent and `speak` is set, clients may use the browser's speech synthesis. */
  audioUrl?: string | null;
  /** Text the client may read aloud with speech synthesis when no recording exists (words, sentences). */
  speak?: string;
  /** Localised supporting text, e.g. a mouth-position description or translation. */
  caption?: LocalizedText | Record<string, string>;
  /** Sounds played one after another (blending prompts). */
  sequence?: Media[];
}

export interface ChoiceOption {
  id: string;
  media: Media;
}

export interface Tile {
  id: string;
  label: string;
  audioUrl?: string | null;
}

export interface MemoryCard {
  id: string;
  media: Media;
}

/** What the client renders. `instruction` is an i18n key. */
export type ItemView =
  | { kind: 'present'; instruction: string; focus: Media; details?: Media[] }
  | { kind: 'choice'; instruction: string; prompt: Media; options: ChoiceOption[] }
  | { kind: 'order'; instruction: string; prompt: Media; tiles: Tile[]; slots: number }
  | { kind: 'speak'; instruction: string; prompt: Media; target: string }
  | { kind: 'match'; instruction: string; cards: MemoryCard[] };

/** Server-only grading data. Never sent to the client during an online run. */
export type AnswerKey =
  | { kind: 'none' }
  | { kind: 'choice'; optionId: string }
  | { kind: 'order'; sequence: string[] }
  | { kind: 'match'; pairs: [string, string][] };

export type Answer =
  | { kind: 'ack' }
  | { kind: 'choice'; optionId: string }
  | { kind: 'order'; sequence: string[] }
  | { kind: 'match'; pairs: [string, string][]; moves: number };

export type MasteryItemType = 'LETTER' | 'PHONEME' | 'WORD';

export interface MasteryTarget {
  type: MasteryItemType;
  /** Letter char, phoneme slug or word text. */
  key: string;
}

export interface BuiltItem {
  id: string;
  type: string;
  view: ItemView;
  key: AnswerKey;
  /** What a correct/incorrect answer says about the child's knowledge. Empty for presentational steps. */
  targets: MasteryTarget[];
}

export interface GradeResult {
  /** null for ungraded steps (present, speak acknowledgements). */
  correct: boolean | null;
  /** 0–100. */
  score: number;
  /** Shown after a wrong answer so the child can learn from it. */
  expected?: AnswerKey;
}

export type Skill =
  | 'LETTER_RECOGNITION'
  | 'LETTER_SOUND'
  | 'SOUND_LETTER'
  | 'SOUND_WORD'
  | 'WORD_SOUND'
  | 'LISTENING'
  | 'BLENDING'
  | 'SEGMENTING'
  | 'DIGRAPH'
  | 'SPELLING'
  | 'SIGHT_WORDS'
  | 'READING'
  | 'SPEAKING';

export interface ExerciseType<C = unknown> {
  key: string;
  /** i18n key for the CMS label. */
  label: string;
  skills: Skill[];
  /** Output type is the parsed config; input may omit defaulted fields. */
  configSchema: ZodType<C, ZodTypeDef, unknown>;
  /** Content references in the config, so the CMS can verify they exist before publishing. */
  references(config: C): { phonemes?: string[]; words?: string[]; letters?: string[]; sentences?: string[] };
  build(config: C, content: ContentIndex, rng: Rng): Omit<BuiltItem, 'id' | 'type'>[];
  /** Optional custom grading; defaults to the generic grader for the item's answer key. */
  grade?(item: BuiltItem, answer: Answer): GradeResult;
}
