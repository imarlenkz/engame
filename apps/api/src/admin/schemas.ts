import { z } from 'zod';

/** CMS text in the three UI languages. English is required (it is the subject being taught); kk/ru may lag. */
export const LText = z.object({
  en: z.string().trim().min(1).max(300),
  kk: z.string().trim().max(300).optional(),
  ru: z.string().trim().max(300).optional(),
});
export const Status = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const id = z.string().uuid();
const nullableId = id.nullable().optional();

export const Paging = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  q: z.string().trim().max(100).optional(),
});

export const PhonemeUpdate = z.object({
  symbol: z.string().trim().min(1).max(8).optional(),
  mouthPosition: LText.optional(),
  tip: LText.nullable().optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  audioId: nullableId,
  mouthImageId: nullableId,
  graphemes: z
    .array(z.object({ grapheme: z.string().trim().min(1).max(6), isPrimary: z.boolean().default(false) }))
    .min(1)
    .max(12)
    .optional(),
  status: Status.optional(),
});

export const LetterUpdate = z.object({
  name: z.string().trim().min(1).max(12).optional(),
  exampleWordId: nullableId,
  audioId: nullableId,
  imageId: nullableId,
  status: Status.optional(),
});

const WordPattern = z.enum(['CVC', 'CCVC', 'CVCC', 'CCVCC', 'DIGRAPH', 'SIGHT', 'OTHER']);
/** Sound-by-sound spelling; the graphemes must spell the word. Empty only for sight words. */
const Breakdown = z
  .array(z.object({ phoneme: z.string().min(1).max(40), grapheme: z.string().max(6) }))
  .max(20);
export const WordCreate = z.object({
  text: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(40)
    .regex(/^[a-z']+$/, 'Lower-case English letters only'),
  pattern: WordPattern,
  emoji: z.string().max(16).nullable().optional(),
  translation: z.object({ kk: z.string().max(100).optional(), ru: z.string().max(100).optional() }),
  difficulty: z.number().int().min(1).max(5).default(1),
  isSightWord: z.boolean().default(false),
  breakdown: Breakdown,
  audioId: nullableId,
  imageId: nullableId,
  status: Status.default('DRAFT'),
});
export const WordUpdate = WordCreate.omit({ text: true }).partial();
export const WordQuery = Paging.extend({ status: Status.optional(), pattern: WordPattern.optional() });

export const SentenceCreate = z.object({
  text: z.string().trim().min(1).max(200),
  translation: z.object({ kk: z.string().max(300).optional(), ru: z.string().max(300).optional() }),
  difficulty: z.number().int().min(1).max(5).default(1),
  audioId: nullableId,
  imageId: nullableId,
  status: Status.default('DRAFT'),
});
export const SentenceUpdate = SentenceCreate.partial();

export const WorldCreate = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  order: z.number().int().min(0),
  title: LText,
  theme: z.string().max(30).default('forest'),
  icon: z.string().max(16).default('🌳'),
  status: Status.default('DRAFT'),
});
export const WorldUpdate = WorldCreate.omit({ slug: true }).partial();

export const LevelCreate = z.object({
  worldId: id,
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  order: z.number().int().min(0),
  title: LText,
  status: Status.default('DRAFT'),
});
export const LevelUpdate = LevelCreate.omit({ slug: true, worldId: true }).partial();

const LessonKind = z.enum(['LETTER', 'SOUND', 'BLEND', 'WORD', 'SENTENCE', 'READING', 'REVIEW']);
export const LessonCreate = z.object({
  levelId: id,
  slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  order: z.number().int().min(0),
  kind: LessonKind,
  title: LText,
  focusPhonemeId: nullableId,
  focusLetterId: nullableId,
  estimatedMinutes: z.number().int().min(1).max(30).default(7),
  xpReward: z.number().int().min(0).max(500).default(20),
  coinReward: z.number().int().min(0).max(500).default(5),
});
export const LessonUpdate = LessonCreate.omit({ slug: true }).partial().extend({ status: Status.optional() });

const Stage = z.enum([
  'INTRO',
  'TEACH',
  'LISTEN',
  'WATCH',
  'REPEAT',
  'PRACTICE',
  'GAME',
  'QUIZ',
  'REVIEW',
  'REWARD',
]);
export const ExerciseCreate = z.object({
  stage: Stage,
  type: z.string().min(1).max(60),
  config: z.record(z.unknown()).default({}),
});
export const ExerciseUpdate = ExerciseCreate.partial();
export const Reorder = z.object({ ids: z.array(id).min(1).max(100) });

export const GameCreate = z.object({
  slug: z.string().regex(/^[a-z0-9-]{2,60}$/),
  type: z.string().min(1).max(60),
  title: LText,
  levelId: nullableId,
  config: z.record(z.unknown()).default({}),
  timed: z.boolean().default(false),
  timeLimitSec: z.number().int().min(10).max(600).nullable().optional(),
  status: Status.default('DRAFT'),
});
export const GameUpdate = GameCreate.omit({ slug: true }).partial();

export const AchievementCreate = z.object({
  slug: z.string().regex(/^[a-z0-9-_]{2,60}$/),
  title: LText,
  description: LText,
  icon: z.string().min(1).max(16),
  rule: z.object({ metric: z.string(), gte: z.number().int().min(1) }),
  xpReward: z.number().int().min(0).max(1000).default(0),
  coinReward: z.number().int().min(0).max(1000).default(0),
  status: Status.default('DRAFT'),
});
export const AchievementUpdate = AchievementCreate.omit({ slug: true }).partial();

export const MissionCreate = z.object({
  slug: z.string().regex(/^[a-z0-9-_]{2,60}$/),
  title: LText,
  rule: z.object({ metric: z.string(), target: z.number().int().min(1) }),
  xpReward: z.number().int().min(0).max(1000).default(50),
  coinReward: z.number().int().min(0).max(1000).default(10),
  active: z.boolean().default(true),
});
export const MissionUpdate = MissionCreate.omit({ slug: true }).partial();

export const MediaMeta = z.object({
  caption: z.string().max(200).optional(),
  altEn: z.string().max(200).optional(),
  altKk: z.string().max(200).optional(),
  altRu: z.string().max(200).optional(),
});

export const UserQuery = Paging.extend({ role: z.enum(['ADMIN', 'TEACHER', 'PARENT', 'CHILD']).optional() });
export const UserUpdate = z.object({
  role: z.enum(['ADMIN', 'TEACHER', 'PARENT']).optional(),
  status: z.enum(['ACTIVE', 'DISABLED']).optional(),
});

export const SubscriptionCreate = z.object({
  ownerId: id,
  plan: z.string().trim().min(1).max(40),
  status: z.enum(['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED']),
  seats: z.number().int().min(1).max(10_000).default(1),
  currentPeriodEnd: z.coerce.date().nullable().optional(),
});
export const SubscriptionUpdate = SubscriptionCreate.omit({ ownerId: true }).partial();

export const AnalyticsQuery = z.object({ days: z.coerce.number().int().min(1).max(365).default(30) });
