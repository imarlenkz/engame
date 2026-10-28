/**
 * Starter curriculum: 5 worlds, their levels, lessons and exercises.
 * Generated from the letter/phoneme/word seeds so the first install is complete; after that the CMS owns it.
 */
import { LETTERS } from './letters';
import { PHONEMES } from './phonemes';
import { SENTENCES, SIGHT_WORDS, WORDS, type WordSeed } from './words';

type L10n = { en: string; kk: string; ru: string };
type Stage = 'INTRO' | 'TEACH' | 'LISTEN' | 'WATCH' | 'REPEAT' | 'PRACTICE' | 'GAME' | 'QUIZ' | 'REVIEW' | 'REWARD';
type Kind = 'LETTER' | 'SOUND' | 'BLEND' | 'WORD' | 'SENTENCE' | 'READING' | 'REVIEW';

export interface ExerciseSeed {
  stage: Stage;
  type: string;
  config: Record<string, unknown>;
}
export interface LessonSeed {
  slug: string;
  kind: Kind;
  title: L10n;
  focusPhoneme?: string;
  focusLetter?: string;
  minutes: number;
  exercises: ExerciseSeed[];
}
export interface LevelSeed {
  slug: string;
  title: L10n;
  lessons: LessonSeed[];
}
export interface WorldSeed {
  slug: string;
  icon: string;
  theme: string;
  title: L10n;
  levels: LevelSeed[];
}

const word = new Map(WORDS.map((w) => [w.text, w]));
const hasPicture = (t: string) => Boolean(word.get(t)?.emoji);
const pictured = (texts: string[]) => texts.filter(hasPicture);

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ── World 1: Alphabet Forest ──
const letterGroups = [LETTERS.slice(0, 5), LETTERS.slice(5, 10), LETTERS.slice(10, 15), LETTERS.slice(15, 20), LETTERS.slice(20)];

const alphabetForest: WorldSeed = {
  slug: 'alphabet-forest',
  icon: '🌳',
  theme: 'forest',
  title: { en: 'Alphabet Forest', kk: 'Әліпби орманы', ru: 'Алфавитный лес' },
  levels: letterGroups.map((group, gi) => {
    const range = `${group[0]!.char}–${group[group.length - 1]!.char}`;
    return {
      slug: `alphabet-${gi + 1}`,
      title: { en: `Letters ${range}`, kk: `${range} әріптері`, ru: `Буквы ${range}` },
      lessons: group.map((l, li) => {
        const seen = LETTERS.slice(0, gi * 5 + li + 1).map((x) => x.char);
        const recent = seen.slice(-3);
        const memoryLetters = group.map((x) => x.char);
        const exercises: ExerciseSeed[] = [
          { stage: 'INTRO', type: 'teach_letter', config: { letter: l.char } },
        ];
        if (hasPicture(l.example)) exercises.push({ stage: 'LISTEN', type: 'listen_choose', config: { words: [l.example], options: 3 } });
        exercises.push(
          { stage: 'PRACTICE', type: 'letter_match', config: { letters: recent, direction: 'upper_to_lower', options: 3 } },
          { stage: 'GAME', type: 'memory', config: { mode: 'letters', letters: memoryLetters.slice(0, 4) } },
          { stage: 'QUIZ', type: 'letter_recognition', config: { letters: recent, options: 4 } },
        );
        return {
          slug: `letter-${l.char.toLowerCase()}`,
          kind: 'LETTER' as const,
          title: { en: `Letter ${l.char}`, kk: `${l.char} әрпі`, ru: `Буква ${l.char}` },
          focusLetter: l.char,
          minutes: 5,
          exercises,
        };
      }),
    };
  }),
};

// ── World 2: Sound Island ──
const soundGroups = chunk(PHONEMES, 6);
const soundIsland: WorldSeed = {
  slug: 'sound-island',
  icon: '🏝️',
  theme: 'island',
  title: { en: 'Sound Island', kk: 'Дыбыстар аралы', ru: 'Остров звуков' },
  levels: soundGroups.map((group, gi) => ({
    slug: `sounds-${gi + 1}`,
    title: {
      en: `Sounds: ${group.map((p) => p.symbol).join(' ')}`,
      kk: `Дыбыстар: ${group.map((p) => p.symbol).join(' ')}`,
      ru: `Звуки: ${group.map((p) => p.symbol).join(' ')}`,
    },
    lessons: group.map((p, pi) => {
      const idx = gi * 6 + pi;
      const examples = p.examples;
      const pics = pictured(examples);
      const previous = PHONEMES.slice(Math.max(0, idx - 2), idx).map((x) => x.slug);
      const exercises: ExerciseSeed[] = [
        { stage: 'INTRO', type: 'teach_sound', config: { phoneme: p.slug, words: examples.slice(0, 3) } },
        { stage: 'LISTEN', type: 'listen', config: { phoneme: p.slug, words: examples.slice(0, 3) } },
        { stage: 'WATCH', type: 'watch_mouth', config: { phoneme: p.slug } },
        { stage: 'REPEAT', type: 'repeat', config: { phoneme: p.slug, words: examples.slice(0, 2) } },
      ];
      if (pics.length > 0) exercises.push({ stage: 'PRACTICE', type: 'sound_to_word', config: { phoneme: p.slug, words: pics.slice(0, 2), options: 3 } });
      if (pics.length > 0) exercises.push({ stage: 'GAME', type: 'word_builder', config: { words: pics.slice(0, 1), tiles: 'letters', extraTiles: 1 } });
      exercises.push({ stage: 'QUIZ', type: 'sound_to_letter', config: { phonemes: [p.slug, ...previous], options: 3 } });
      if (pics.length > 0) exercises.push({ stage: 'QUIZ', type: 'read_word', config: { words: pics.slice(0, 1), options: 3 } });
      return {
        slug: `sound-${p.slug}`,
        kind: 'SOUND' as const,
        title: { en: `${p.symbol} /${p.ipa}/`, kk: `${p.symbol} /${p.ipa}/ дыбысы`, ru: `Звук ${p.symbol} /${p.ipa}/` },
        focusPhoneme: p.slug,
        minutes: 7,
        exercises,
      };
    }),
  })),
};

// ── World 3: Phonics Castle (blending) ──
const vowelOf = (w: WordSeed) => w.breakdown.split(' ').map((x) => x.split(':')[1]);
const cvcBy = (v: string) => WORDS.filter((w) => w.pattern === 'CVC' && w.emoji && vowelOf(w).includes(v)).map((w) => w.text);
const digraphWords = (slugs: string[]) =>
  WORDS.filter((w) => w.emoji && w.pattern === 'DIGRAPH' && vowelOf(w).some((s) => slugs.includes(s as string))).map((w) => w.text);

function blendLesson(slug: string, title: L10n, words: string[], kind: Kind = 'BLEND'): LessonSeed {
  const ws = words.slice(0, 6);
  return {
    slug,
    kind,
    title,
    minutes: 8,
    exercises: [
      { stage: 'LISTEN', type: 'listen_choose', config: { words: ws.slice(0, 2), options: 3 } },
      { stage: 'PRACTICE', type: 'blend', config: { words: ws.slice(0, 3), options: 3 } },
      { stage: 'PRACTICE', type: 'segment', config: { words: ws.slice(3, 5).length ? ws.slice(3, 5) : ws.slice(0, 2) } },
      { stage: 'GAME', type: 'word_builder', config: { words: ws.slice(1, 3), tiles: 'letters', extraTiles: 2 } },
      { stage: 'QUIZ', type: 'missing_letter', config: { words: ws.slice(0, 3), options: 3 } },
      { stage: 'QUIZ', type: 'read_word', config: { words: ws.slice(2, 4).length ? ws.slice(2, 4) : ws.slice(0, 2), options: 3 } },
    ],
  };
}

const phonicsCastle: WorldSeed = {
  slug: 'phonics-castle',
  icon: '🏰',
  theme: 'castle',
  title: { en: 'Phonics Castle', kk: 'Фоника қамалы', ru: 'Замок фоники' },
  levels: [
    {
      slug: 'blend-cvc',
      title: { en: 'Blending CVC words', kk: 'CVC сөздерін құрау', ru: 'Слияние слов CVC' },
      lessons: [
        ['ae', 'a'],
        ['i', 'i'],
        ['e', 'e'],
        ['o', 'o'],
        ['u', 'u'],
      ].map(([v, letter]) =>
        blendLesson(
          `blend-short-${letter}`,
          { en: `Blend with short ${letter}`, kk: `Қысқа ${letter} бар сөздер`, ru: `Слова с коротким ${letter}` },
          cvcBy(v as string),
        ),
      ),
    },
    {
      slug: 'blend-digraphs',
      title: { en: 'Digraph words', kk: 'Диграф сөздер', ru: 'Слова с диграфами' },
      lessons: [
        blendLesson('blend-sh-ch', { en: 'sh and ch words', kk: 'sh және ch сөздері', ru: 'Слова с sh и ch' }, digraphWords(['sh', 'ch'])),
        blendLesson('blend-th-ng', { en: 'th and ng words', kk: 'th және ng сөздері', ru: 'Слова с th и ng' }, digraphWords(['th-unvoiced', 'th-voiced', 'ng'])),
        blendLesson('blend-long-vowels', { en: 'Long vowel words', kk: 'Созылыңқы дауысты сөздер', ru: 'Слова с долгими гласными' }, digraphWords(['ee', 'ai', 'oa', 'ie', 'oo-long'])),
        blendLesson('blend-ar-or-er', { en: 'ar, or and er words', kk: 'ar, or және er сөздері', ru: 'Слова с ar, or, er' }, digraphWords(['ar', 'or', 'er'])),
        // Added later: new lessons go at the end so existing installs keep their order.
        blendLesson('blend-ow-oi', { en: 'ow and oi words', kk: 'ow және oi сөздері', ru: 'Слова с ow и oi' }, digraphWords(['ow', 'oi'])),
        blendLesson('blend-short-oo', { en: 'Short oo words: book, cook', kk: 'Қысқа oo сөздері: book, cook', ru: 'Слова с коротким oo: book, cook' }, digraphWords(['oo-short'])),
        blendLesson('blend-air-ear', { en: 'air and ear words', kk: 'air және ear сөздері', ru: 'Слова с air и ear' }, digraphWords(['air', 'ear'])),
        blendLesson('blend-sh-ch-2', { en: 'More sh and ch words', kk: 'Тағы sh және ch сөздері', ru: 'Ещё слова с sh и ch' }, digraphWords(['sh', 'ch']).slice(6)),
      ],
    },
  ],
};

// ── World 4: Word Space ──
const byPattern = (p: string) => WORDS.filter((w) => w.pattern === p && w.emoji).map((w) => w.text);
/** Pictured multi-syllable words of a difficulty (OTHER pattern, three or more sounds). */
const longWords = (difficulty: number) =>
  WORDS.filter((w) => w.pattern === 'OTHER' && w.emoji && w.difficulty === difficulty && w.breakdown.split(' ').length >= 4).map((w) => w.text);
function sightLesson(slug: string, title: L10n, words: string[]): LessonSeed {
  return {
    slug,
    kind: 'WORD',
    title,
    minutes: 6,
    exercises: [
      { stage: 'TEACH', type: 'sight_word', config: { words: words.slice(0, 4), options: 3 } },
      { stage: 'PRACTICE', type: 'word_builder', config: { words: words.slice(0, 3), tiles: 'letters', extraTiles: 1 } },
      { stage: 'QUIZ', type: 'sight_word', config: { words: words.slice(4, 8).length ? words.slice(4, 8) : words.slice(0, 3), options: 4 } },
    ],
  };
}
const wordSpace: WorldSeed = {
  slug: 'word-space',
  icon: '🚀',
  theme: 'space',
  title: { en: 'Word Space', kk: 'Сөздер ғарышы', ru: 'Космос слов' },
  levels: [
    {
      slug: 'words-clusters',
      title: { en: 'Consonant clusters', kk: 'Дауыссыз тіркестер', ru: 'Сочетания согласных' },
      lessons: [
        blendLesson('words-ccvc', { en: 'CCVC words: frog, flag', kk: 'CCVC сөздері: frog, flag', ru: 'Слова CCVC: frog, flag' }, byPattern('CCVC'), 'WORD'),
        blendLesson('words-cvcc', { en: 'CVCC words: tent, hand', kk: 'CVCC сөздері: tent, hand', ru: 'Слова CVCC: tent, hand' }, byPattern('CVCC'), 'WORD'),
        blendLesson('words-ccvc-2', { en: 'CCVC words: clock, truck', kk: 'CCVC сөздері: clock, truck', ru: 'Слова CCVC: clock, truck' }, byPattern('CCVC').slice(6), 'WORD'),
        blendLesson('words-cvcc-2', { en: 'CVCC words: pink, wind', kk: 'CVCC сөздері: pink, wind', ru: 'Слова CVCC: pink, wind' }, byPattern('CVCC').slice(6), 'WORD'),
        blendLesson('words-ccvcc', { en: 'Big clusters: drink, scarf', kk: 'Үлкен тіркестер: drink, scarf', ru: 'Большие сочетания: drink, scarf' }, byPattern('CCVCC'), 'WORD'),
      ],
    },
    {
      slug: 'words-sight',
      title: { en: 'Sight words', kk: 'Көзбен танылатын сөздер', ru: 'Слова-исключения' },
      lessons: chunk(SIGHT_WORDS, 8).map((ws, i) =>
        sightLesson(`sight-words-${i + 1}`, { en: `Sight words ${i + 1}`, kk: `Жаттайтын сөздер ${i + 1}`, ru: `Слова для запоминания ${i + 1}` }, ws),
      ),
    },
    {
      slug: 'words-long',
      title: { en: 'Longer words', kk: 'Ұзын сөздер', ru: 'Длинные слова' },
      lessons: [
        blendLesson('words-two-syllables', { en: 'Two-part words: rabbit, panda', kk: 'Екі буынды сөздер: rabbit, panda', ru: 'Слова из двух слогов: rabbit, panda' }, longWords(2), 'WORD'),
        blendLesson('words-two-syllables-2', { en: 'Two-part words: lemon, robot', kk: 'Екі буынды сөздер: lemon, robot', ru: 'Слова из двух слогов: lemon, robot' }, longWords(2).slice(6), 'WORD'),
        blendLesson('words-big', { en: 'Big words: elephant, umbrella', kk: 'Үлкен сөздер: elephant, umbrella', ru: 'Большие слова: elephant, umbrella' }, longWords(3), 'WORD'),
      ],
    },
  ],
};

// ── World 5: Reading Kingdom ──
const readingKingdom: WorldSeed = {
  slug: 'reading-kingdom',
  icon: '📖',
  theme: 'kingdom',
  title: { en: 'Reading Kingdom', kk: 'Оқу патшалығы', ru: 'Королевство чтения' },
  levels: [1, 2, 3].map((d) => {
    const sentences = SENTENCES.filter((s) => s.difficulty === d);
    return {
      slug: `reading-${d}`,
      title: { en: `Reading ${d}`, kk: `Оқу ${d}`, ru: `Чтение ${d}` },
      // The first lesson keeps the original sentences; sentences added later get a lesson of their own.
      lessons: [sentences.filter((s) => !s.added), sentences.filter((s) => s.added)]
        .filter((group) => group.length >= 2)
        .map((group, i) => ({
          slug: i === 0 ? `reading-sentences-${d}` : `reading-sentences-${d}-more`,
          kind: 'READING' as const,
          title:
            i === 0
              ? { en: `Read sentences ${d}`, kk: `Сөйлем оқу ${d}`, ru: `Читаем предложения ${d}` }
              : { en: `More sentences ${d}`, kk: `Тағы сөйлемдер ${d}`, ru: `Ещё предложения ${d}` },
          minutes: 8,
          exercises: [
            { stage: 'PRACTICE' as const, type: 'read_word', config: { words: group.map((s) => s.key).slice(0, 3), options: 3 } },
            {
              stage: 'QUIZ' as const,
              type: 'read_sentence',
              config: { items: group.map((s) => ({ sentence: s.text, answer: s.key })), options: 3 },
            },
          ],
        })),
    };
  }),
};

export const CURRICULUM: WorldSeed[] = [alphabetForest, soundIsland, phonicsCastle, wordSpace, readingKingdom];

export const ACHIEVEMENTS = [
  { slug: 'first-lesson', icon: '🌱', rule: { metric: 'lessons_completed', gte: 1 }, xp: 10, coins: 5,
    title: { en: 'First step', kk: 'Алғашқы қадам', ru: 'Первый шаг' },
    description: { en: 'Finish your first lesson', kk: 'Алғашқы сабақты аяқта', ru: 'Пройди первый урок' } },
  { slug: 'ten-lessons', icon: '📚', rule: { metric: 'lessons_completed', gte: 10 }, xp: 50, coins: 20,
    title: { en: 'Bookworm', kk: 'Кітапқұмар', ru: 'Книжный червь' },
    description: { en: 'Finish 10 lessons', kk: '10 сабақты аяқта', ru: 'Пройди 10 уроков' } },
  { slug: 'perfect-lesson', icon: '💯', rule: { metric: 'perfect_lessons', gte: 1 }, xp: 20, coins: 10,
    title: { en: 'Perfect!', kk: 'Мінсіз!', ru: 'Идеально!' },
    description: { en: 'Finish a lesson with no mistakes', kk: 'Сабақты қатесіз аяқта', ru: 'Пройди урок без ошибок' } },
  { slug: 'streak-3', icon: '🔥', rule: { metric: 'streak_days', gte: 3 }, xp: 30, coins: 15,
    title: { en: '3-day streak', kk: '3 күн қатарынан', ru: '3 дня подряд' },
    description: { en: 'Learn 3 days in a row', kk: '3 күн қатарынан оқы', ru: 'Занимайся 3 дня подряд' } },
  { slug: 'streak-7', icon: '🏅', rule: { metric: 'streak_days', gte: 7 }, xp: 70, coins: 30,
    title: { en: 'Week champion', kk: 'Апта чемпионы', ru: 'Чемпион недели' },
    description: { en: 'Learn 7 days in a row', kk: '7 күн қатарынан оқы', ru: 'Занимайся 7 дней подряд' } },
  { slug: 'sounds-10', icon: '🔊', rule: { metric: 'sounds_mastered', gte: 10 }, xp: 50, coins: 20,
    title: { en: 'Sound explorer', kk: 'Дыбыс зерттеушісі', ru: 'Исследователь звуков' },
    description: { en: 'Master 10 sounds', kk: '10 дыбысты меңгер', ru: 'Освой 10 звуков' } },
  { slug: 'sounds-44', icon: '👑', rule: { metric: 'sounds_mastered', gte: 44 }, xp: 200, coins: 100,
    title: { en: 'Sound master', kk: 'Дыбыс шебері', ru: 'Мастер звуков' },
    description: { en: 'Master all 44 sounds', kk: '44 дыбыстың бәрін меңгер', ru: 'Освой все 44 звука' } },
  { slug: 'words-25', icon: '🧩', rule: { metric: 'words_mastered', gte: 25 }, xp: 60, coins: 25,
    title: { en: 'Word builder', kk: 'Сөз құрастырушы', ru: 'Строитель слов' },
    description: { en: 'Master 25 words', kk: '25 сөзді меңгер', ru: 'Освой 25 слов' } },
  { slug: 'games-10', icon: '🎮', rule: { metric: 'games_played', gte: 10 }, xp: 30, coins: 15,
    title: { en: 'Player', kk: 'Ойыншы', ru: 'Игрок' },
    description: { en: 'Play 10 games', kk: '10 ойын ойна', ru: 'Сыграй 10 игр' } },
  { slug: 'level-5', icon: '🚀', rule: { metric: 'level_reached', gte: 5 }, xp: 0, coins: 50,
    title: { en: 'Level 5', kk: '5-деңгей', ru: 'Уровень 5' },
    description: { en: 'Reach level 5', kk: '5-деңгейге жет', ru: 'Достигни 5 уровня' } },
];

export const DAILY_MISSIONS = [
  { slug: 'daily-lesson', rule: { metric: 'lessons_completed', target: 1 }, xp: 50, coins: 10,
    title: { en: 'Finish 1 lesson', kk: '1 сабақ аяқта', ru: 'Пройди 1 урок' } },
  { slug: 'daily-correct-20', rule: { metric: 'correct_answers', target: 20 }, xp: 50, coins: 10,
    title: { en: 'Give 20 correct answers', kk: '20 дұрыс жауап бер', ru: 'Дай 20 правильных ответов' } },
  { slug: 'daily-games-2', rule: { metric: 'games_played', target: 2 }, xp: 50, coins: 10,
    title: { en: 'Play 2 games', kk: '2 ойын ойна', ru: 'Сыграй 2 игры' } },
];

export const GAMES = [
  { slug: 'sound-match', type: 'sound_to_letter', timed: false,
    title: { en: 'Sound Match', kk: 'Дыбысты тап', ru: 'Найди звук' },
    config: { pool: 'phonemes', items: 8, options: 3 } },
  { slug: 'letter-match', type: 'letter_match', timed: false,
    title: { en: 'Letter Match', kk: 'Әріп жұбы', ru: 'Пары букв' },
    config: { pool: 'letters', items: 8, options: 4 } },
  { slug: 'listen-choose', type: 'listen_choose', timed: false,
    title: { en: 'Listen & Choose', kk: 'Тыңда да таңда', ru: 'Слушай и выбирай' },
    config: { pool: 'words', items: 8, options: 3 } },
  { slug: 'memory', type: 'memory', timed: false,
    title: { en: 'Memory', kk: 'Есте сақта', ru: 'Память' },
    config: { pool: 'letters', items: 6 } },
  { slug: 'word-builder', type: 'word_builder', timed: false,
    title: { en: 'Word Builder', kk: 'Сөз құрастыр', ru: 'Собери слово' },
    config: { pool: 'cvc_words', items: 6, extraTiles: 1 } },
  { slug: 'missing-letter', type: 'missing_letter', timed: false,
    title: { en: 'Missing Letter', kk: 'Жоқ әріп', ru: 'Пропущенная буква' },
    config: { pool: 'cvc_words', items: 8, options: 3 } },
  { slug: 'blending', type: 'blend', timed: false,
    title: { en: 'Blending Game', kk: 'Дыбыстарды қос', ru: 'Слияние звуков' },
    config: { pool: 'cvc_words', items: 8, options: 3 } },
  { slug: 'speed-challenge', type: 'sound_to_letter', timed: true, timeLimitSec: 60,
    title: { en: 'Speed Challenge', kk: 'Жылдамдық сынағы', ru: 'Скоростной вызов' },
    config: { pool: 'phonemes', items: 20, options: 3 } },
];
