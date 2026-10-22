import { describe, expect, it } from 'vitest';
import { createDefaultRegistry, createRng } from '@engame/phonics-engine';
import { GAMES } from '../../database/prisma/data/curriculum';
import { seedContent } from '../../phonics-engine/test/fixture';
import {
  gameOutcome,
  levelForXp,
  lessonOutcome,
  localDate,
  missionProgress,
  newlyUnlocked,
  parseAchievementRule,
  planGame,
  recordActivity,
  starsFor,
  visibleStreak,
} from '../src';

describe('lesson rewards', () => {
  it('gives the documented XP: +5 per correct, +20 lesson, +30 perfect', () => {
    const perfect = lessonOutcome(6, 6);
    expect(perfect.xp).toEqual({ answers: 30, lesson: 20, perfect: 30, total: 80 });
    expect(perfect.stars).toBe(3);
    expect(perfect.coins).toBe(10);
    const ok = lessonOutcome(10, 7);
    expect(ok).toMatchObject({ accuracy: 70, stars: 1, perfect: false, coins: 5 });
    expect(ok.xp.total).toBe(55);
  });

  it('awards stars at 60/80/95%', () => {
    const t: [number, number, number] = [60, 80, 95];
    expect([59, 60, 79, 80, 94, 95].map((a) => starsFor(a, t))).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it('treats a lesson with nothing graded as complete', () => {
    expect(lessonOutcome(0, 0)).toMatchObject({ accuracy: 100, stars: 3, perfect: false });
  });

  it('scores games by correct answers', () => {
    expect(gameOutcome(7, 3)).toEqual({ score: 70, accuracy: 70, xp: 35, coins: 7 });
    expect(gameOutcome(0, 0).accuracy).toBe(0);
  });
});

describe('levels', () => {
  it('needs 100, then 200, then 300 XP per level', () => {
    expect(levelForXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 100 });
    expect(levelForXp(99).level).toBe(1);
    expect(levelForXp(100)).toEqual({ level: 2, xpIntoLevel: 0, xpForNext: 200 });
    expect(levelForXp(299).level).toBe(2);
    expect(levelForXp(300).level).toBe(3);
    expect(levelForXp(600).level).toBe(4);
  });
});

describe('streaks', () => {
  const empty = { current: 0, longest: 0, lastActiveDate: null };
  it('starts, continues, ignores same-day and resets after a gap', () => {
    const d1 = recordActivity(empty, '2026-03-01');
    expect(d1).toMatchObject({ current: 1, longest: 1, changed: true });
    expect(recordActivity(d1, '2026-03-01').changed).toBe(false);
    const d2 = recordActivity(d1, '2026-03-02');
    expect(d2.current).toBe(2);
    const d3 = recordActivity(d2, '2026-03-05');
    expect(d3).toMatchObject({ current: 1, longest: 2 });
  });

  it('crosses month boundaries', () => {
    expect(recordActivity({ current: 4, longest: 4, lastActiveDate: '2026-02-28' }, '2026-03-01').current).toBe(5);
  });

  it('shows 0 once a day is missed', () => {
    const s = { current: 5, longest: 5, lastActiveDate: '2026-03-01' };
    expect(visibleStreak(s, '2026-03-02')).toBe(5);
    expect(visibleStreak(s, '2026-03-03')).toBe(0);
  });

  it('uses the local calendar date', () => {
    const now = new Date('2026-03-01T20:30:00Z');
    expect(localDate(now, 'Asia/Almaty')).toBe('2026-03-02');
    expect(localDate(now, 'UTC')).toBe('2026-03-01');
  });
});

describe('achievements and missions', () => {
  const list = [
    { slug: 'first', rule: { metric: 'lessons_completed', gte: 1 } },
    { slug: 'ten', rule: { metric: 'lessons_completed', gte: 10 } },
    { slug: 'broken', rule: { metric: 'nope', gte: 1 } },
  ];
  it('unlocks only newly met rules and ignores invalid ones', () => {
    expect(newlyUnlocked(list, { lessons_completed: 1 }, new Set())).toEqual(['first']);
    expect(newlyUnlocked(list, { lessons_completed: 12 }, new Set(['first']))).toEqual(['ten']);
    expect(parseAchievementRule({ metric: 'nope', gte: 1 })).toBeNull();
  });

  it('caps mission progress at the target', () => {
    expect(missionProgress({ metric: 'correct_answers', target: 20 }, { correct_answers: 7 })).toEqual({ progress: 7, done: false });
    expect(missionProgress({ metric: 'correct_answers', target: 20 }, { correct_answers: 31 })).toEqual({ progress: 20, done: true });
  });
});

describe('games', () => {
  const content = seedContent();
  const registry = createDefaultRegistry();

  for (const g of GAMES) {
    it(`plans and builds ${g.slug}`, () => {
      const plan = planGame({ id: g.slug, type: g.type, config: g.config }, content, createRng('g'));
      const items = registry.build(plan, content, 'g');
      expect(items.length).toBeGreaterThan(0);
    });
  }

  it('puts weak items into the game', () => {
    const plan = planGame(
      { id: 'x', type: 'sound_to_letter', config: { pool: 'phonemes', items: 6 } },
      content,
      createRng('w'),
      ['th-unvoiced', 'not-in-pool'],
    );
    expect((plan.config as { phonemes: string[] }).phonemes).toContain('th-unvoiced');
  });
});
