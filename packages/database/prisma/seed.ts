/**
 * Idempotent starter-content seed. It only creates records that do not exist yet, so running it again after
 * admins have edited content in the CMS never overwrites their changes.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { ACHIEVEMENTS, CURRICULUM, DAILY_MISSIONS, GAMES } from './data/curriculum';
import { LETTERS } from './data/letters';
import { PHONEMES } from './data/phonemes';
import { SENTENCES, WORDS, sentenceTokens } from './data/words';
import { DEFAULT_SETTINGS } from './data/settings';

const prisma = new PrismaClient();

function parseBreakdown(text: string, breakdown: string): { grapheme: string; phoneme: string }[] {
  if (!breakdown) return [];
  const parts = breakdown.split(' ').map((token) => {
    const i = token.lastIndexOf(':');
    return { grapheme: token.slice(0, i), phoneme: token.slice(i + 1) };
  });
  const spelled = parts.map((p) => p.grapheme).join('');
  if (spelled !== text) throw new Error(`Breakdown of "${text}" spells "${spelled}"`);
  return parts;
}

async function seedPhonemes(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const [order, p] of PHONEMES.entries()) {
    const existing = await prisma.phoneme.findUnique({ where: { slug: p.slug } });
    const row =
      existing ??
      (await prisma.phoneme.create({
        data: {
          slug: p.slug,
          symbol: p.symbol,
          ipa: p.ipa,
          category: p.category,
          voiced: p.voiced,
          mouthPosition: p.mouth,
          difficulty: p.difficulty,
          order: order + 1,
          status: 'PUBLISHED',
          graphemes: { create: p.graphemes.map((g, i) => ({ grapheme: g, isPrimary: i === 0 })) },
        },
      }));
    ids.set(p.slug, row.id);
  }
  return ids;
}

async function seedWords(phonemeIds: Map<string, string>): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const w of WORDS) {
    const sounds = parseBreakdown(w.text, w.breakdown);
    const existing = await prisma.word.findUnique({ where: { text: w.text } });
    const row =
      existing ??
      (await prisma.word.create({
        data: {
          text: w.text,
          pattern: w.pattern,
          emoji: w.emoji,
          translation: { en: w.text, kk: w.kk, ru: w.ru },
          difficulty: w.difficulty,
          isSightWord: w.pattern === 'SIGHT',
          status: 'PUBLISHED',
          phonemes: {
            create: sounds.map((s, position) => {
              const phonemeId = phonemeIds.get(s.phoneme);
              if (!phonemeId) throw new Error(`Word "${w.text}" uses unknown phoneme "${s.phoneme}"`);
              return { position, grapheme: s.grapheme, phonemeId };
            }),
          },
        },
      }));
    ids.set(w.text, row.id);
  }
  return ids;
}

async function seedLetters(wordIds: Map<string, string>) {
  for (const [order, l] of LETTERS.entries()) {
    const existing = await prisma.letter.findUnique({ where: { char: l.char } });
    if (existing) continue;
    await prisma.letter.create({
      data: {
        char: l.char,
        name: l.name,
        order: order + 1,
        isVowel: l.isVowel,
        exampleWordId: wordIds.get(l.example) ?? null,
        status: 'PUBLISHED',
      },
    });
  }
}

async function seedSentences(wordIds: Map<string, string>) {
  for (const s of SENTENCES) {
    const existing = await prisma.sentence.findFirst({ where: { text: s.text } });
    if (existing) continue;
    const tokens = sentenceTokens(s.text);
    await prisma.sentence.create({
      data: {
        text: s.text,
        translation: { en: s.text, kk: s.kk, ru: s.ru },
        difficulty: s.difficulty,
        status: 'PUBLISHED',
        words: {
          create: tokens.flatMap((t, position) => {
            const wordId = wordIds.get(t);
            return wordId ? [{ position, wordId }] : [];
          }),
        },
      },
    });
  }
}

async function seedCurriculum(phonemeIds: Map<string, string>) {
  const letterIds = new Map((await prisma.letter.findMany()).map((l) => [l.char, l.id]));
  for (const [wi, world] of CURRICULUM.entries()) {
    const w =
      (await prisma.world.findUnique({ where: { slug: world.slug } })) ??
      (await prisma.world.create({
        data: { slug: world.slug, order: wi + 1, title: world.title, icon: world.icon, theme: world.theme, status: 'PUBLISHED' },
      }));
    for (const [li, level] of world.levels.entries()) {
      const lv =
        (await prisma.level.findUnique({ where: { slug: level.slug } })) ??
        (await prisma.level.create({
          data: { slug: level.slug, worldId: w.id, order: li + 1, title: level.title, status: 'PUBLISHED' },
        }));
      for (const [oi, lesson] of level.lessons.entries()) {
        if (await prisma.lesson.findUnique({ where: { slug: lesson.slug } })) continue;
        await prisma.lesson.create({
          data: {
            slug: lesson.slug,
            levelId: lv.id,
            order: oi + 1,
            kind: lesson.kind,
            title: lesson.title,
            focusPhonemeId: lesson.focusPhoneme ? phonemeIds.get(lesson.focusPhoneme) : undefined,
            focusLetterId: lesson.focusLetter ? letterIds.get(lesson.focusLetter) : undefined,
            estimatedMinutes: lesson.minutes,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            exercises: {
              create: lesson.exercises.map((e, order) => ({
                order: order + 1,
                stage: e.stage,
                type: e.type,
                config: e.config as Prisma.InputJsonValue,
              })),
            },
          },
        });
      }
    }
  }
}

async function seedGamification() {
  for (const a of ACHIEVEMENTS) {
    if (await prisma.achievement.findUnique({ where: { slug: a.slug } })) continue;
    await prisma.achievement.create({
      data: {
        slug: a.slug,
        title: a.title,
        description: a.description,
        icon: a.icon,
        rule: a.rule,
        xpReward: a.xp,
        coinReward: a.coins,
        status: 'PUBLISHED',
      },
    });
  }
  for (const m of DAILY_MISSIONS) {
    if (await prisma.dailyMission.findUnique({ where: { slug: m.slug } })) continue;
    await prisma.dailyMission.create({
      data: { slug: m.slug, title: m.title, rule: m.rule, xpReward: m.xp, coinReward: m.coins },
    });
  }
  for (const g of GAMES) {
    if (await prisma.game.findUnique({ where: { slug: g.slug } })) continue;
    await prisma.game.create({
      data: {
        slug: g.slug,
        type: g.type,
        title: g.title,
        config: g.config,
        timed: g.timed,
        timeLimitSec: 'timeLimitSec' in g ? g.timeLimitSec : null,
        status: 'PUBLISHED',
      },
    });
  }
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: value as Prisma.InputJsonValue } });
  }
}

async function main() {
  const phonemeIds = await seedPhonemes();
  const wordIds = await seedWords(phonemeIds);
  await seedLetters(wordIds);
  await seedSentences(wordIds);
  await seedCurriculum(phonemeIds);
  await seedGamification();
  const counts = {
    phonemes: await prisma.phoneme.count(),
    letters: await prisma.letter.count(),
    words: await prisma.word.count(),
    sentences: await prisma.sentence.count(),
    worlds: await prisma.world.count(),
    levels: await prisma.level.count(),
    lessons: await prisma.lesson.count(),
    exercises: await prisma.exercise.count(),
    games: await prisma.game.count(),
    achievements: await prisma.achievement.count(),
  };
  console.log(JSON.stringify({ msg: 'seed complete', ...counts }));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
