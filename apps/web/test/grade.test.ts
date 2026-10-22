import { describe, expect, it } from 'vitest';
import { gradeLocally } from '@/lib/grade';
import type { AnswerKey, ItemView } from '@/lib/types';

const orderView = {
  kind: 'order',
  instruction: 'exercise.blend',
  slots: 3,
  tiles: [
    { id: 't1', label: 'a' },
    { id: 't2', label: 'c' },
    { id: 't3', label: 't' },
  ],
} as unknown as ItemView;

describe('gradeLocally (offline feedback)', () => {
  it('grades a choice by option id', () => {
    const key: AnswerKey = { kind: 'choice', optionId: 'o2' };
    expect(gradeLocally(orderView, key, { kind: 'choice', optionId: 'o2' }).correct).toBe(true);
    const wrong = gradeLocally(orderView, key, { kind: 'choice', optionId: 'o1' });
    expect(wrong.correct).toBe(false);
    expect(wrong.expected).toEqual(key);
  });

  it('grades order answers by tile labels, so duplicate letters on different tiles are fine', () => {
    const key: AnswerKey = { kind: 'order', sequence: ['c', 'a', 't'] };
    expect(gradeLocally(orderView, key, { kind: 'order', sequence: ['t2', 't1', 't3'] })).toMatchObject({ correct: true, score: 100 });
    const partly = gradeLocally(orderView, key, { kind: 'order', sequence: ['t2', 't3', 't1'] });
    expect(partly.correct).toBe(false);
    expect(partly.score).toBe(20);
  });

  it('accepts memory pairs in any order and lowers the score for extra moves', () => {
    const key: AnswerKey = { kind: 'match', pairs: [['a', 'b'], ['c', 'd']] };
    const exact = gradeLocally(orderView, key, { kind: 'match', pairs: [['d', 'c'], ['b', 'a']], moves: 2 });
    expect(exact).toMatchObject({ correct: true, score: 100 });
    expect(gradeLocally(orderView, key, { kind: 'match', pairs: [['a', 'b'], ['c', 'd']], moves: 6 }).score).toBe(80);
    expect(gradeLocally(orderView, key, { kind: 'match', pairs: [['a', 'c'], ['b', 'd']], moves: 2 }).correct).toBe(false);
  });

  it('returns no verdict for items without a key', () => {
    expect(gradeLocally(orderView, { kind: 'none' }, { kind: 'choice', optionId: 'x' }).correct).toBeNull();
  });
});
