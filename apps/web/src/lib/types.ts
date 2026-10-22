import type { ItemView, Media, AnswerKey, Answer } from '@engame/phonics-engine';
import type { LocalizedText } from '@engame/localization';

export type { ItemView, Media, AnswerKey, Answer, LocalizedText };

export type Role = 'ADMIN' | 'TEACHER' | 'PARENT' | 'CHILD';

export interface Me {
  user: { id: string; role: Role; displayName: string; email: string | null; locale: string; viaIdp: boolean };
  activeChildId: string | null;
  parentMode: { active: boolean; hasPin: boolean };
}

export interface ClientItem {
  id: string;
  type: string;
  view: ItemView;
  graded: boolean;
}

export interface Step {
  exerciseId: string;
  stage: string;
  type: string;
  items: ClientItem[];
}

export interface StartedRun {
  run: { id: string; token: string; kind: 'lesson' | 'review' | 'placement' | 'game' } | null;
  steps: Step[];
  keys?: Record<string, AnswerKey>;
  lesson?: {
    id: string;
    slug: string;
    title: LocalizedText;
    kind: string;
    estimatedMinutes: number;
    world: { slug: string; title: LocalizedText; theme: string };
    focus: { phoneme: { slug: string; symbol: string; ipa: string } | null; letter: string | null };
  };
  game?: { id: string; slug: string; type: string; title: LocalizedText; timed: boolean; timeLimitSec: number | null };
  hearts?: number;
}

export interface AnswerResult {
  itemId: string;
  correct: boolean | null;
  score: number;
  expected?: AnswerKey;
  firstAttempt: boolean;
  duplicate: boolean;
  hearts?: number;
}

export interface Achievement {
  slug: string;
  title: LocalizedText;
  icon: string;
  xpReward?: number;
  coinReward?: number;
}

export interface Mission {
  slug: string;
  title: LocalizedText;
  progress: number;
  target: number;
  xpReward: number;
  coinReward: number;
  completed: boolean;
  justCompleted?: boolean;
}

export interface CompleteResult {
  alreadyCompleted: boolean;
  outcome: { accuracy: number; stars: number; perfect: boolean; xp: { total: number; answers: number }; coins: number };
  achievements: Achievement[];
  missions: Mission[];
  child: { xp: number; coins: number; level: number; hearts: number };
  streak: { current: number; longest: number };
  nextLessonId: string | null;
}

export interface Dashboard {
  child: { id: string; nickname: string; avatar: string; ageGroup: string };
  level: { level: number; xpIntoLevel: number; xpForNext: number; xp: number };
  coins: number;
  hearts: number;
  streak: { current: number; longest: number };
  todayGoal: { minutes: number; doneMinutes: number };
  currentLesson: { id: string; slug: string; title: LocalizedText; kind: string; minutes: number; world: { slug: string; title: LocalizedText; icon: string } } | null;
  needsPlacement: boolean;
  missions: Mission[];
  review: { count: number };
  achievements: (Achievement & { unlockedAt: string })[];
  progress: { soundsMastered: number; soundsTotal: number; lessonsCompleted: number; lessonsTotal: number };
}

export interface Report {
  child: { id: string; nickname: string; avatar: string; level: number; xp: number; coins: number };
  learningTimeMinutes: number;
  lessonsCompleted: number;
  soundsMastered: number;
  soundsTotal: number;
  weakSounds: { slug: string; symbol: string; ipa: string; score: number }[];
  wordsLearned: { text: string; emoji: string | null }[];
  pronunciationScore: number | null;
  streak: { current: number; longest: number };
  weekly: { date: string; seconds: number; minutes: number; answers: number; correct: number }[];
  sounds: { slug: string; symbol: string; ipa: string; score: number; attempts: number; band: 'MASTERED' | 'GOOD' | 'LEARNING' | 'NEEDS_PRACTICE' | null; weak: boolean; pronunciation: number | null }[];
}

export interface ChildSummary {
  id: string;
  nickname: string;
  avatar: string;
  ageGroup: string;
  level: number;
  xp: number;
  hasOwnLogin: boolean;
  classes: { id: string; name: string }[];
  consents: { DATA_PROCESSING: boolean; VOICE_PROCESSING: boolean; VOICE_STORAGE: boolean };
}
