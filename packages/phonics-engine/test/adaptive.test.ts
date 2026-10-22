import { describe, expect, it } from 'vitest';
import { applyObservation, emptyMastery, isWeak, masteryBand, pickReview } from '../src';

const t0 = new Date('2026-01-01T10:00:00Z');
const DAY = 86_400_000;

describe('mastery', () => {
  it('maps scores to the four bands', () => {
    expect(masteryBand(0)).toBe('NEEDS_PRACTICE');
    expect(masteryBand(39)).toBe('NEEDS_PRACTICE');
    expect(masteryBand(40)).toBe('LEARNING');
    expect(masteryBand(69)).toBe('LEARNING');
    expect(masteryBand(70)).toBe('GOOD');
    expect(masteryBand(89)).toBe('GOOD');
    expect(masteryBand(90)).toBe('MASTERED');
  });

  it('rises with correct answers and is mastered only after enough attempts', () => {
    let s = emptyMastery(t0);
    const scores: number[] = [];
    for (let i = 0; i < 8; i++) {
      s = applyObservation(s, { correct: true, responseMs: 1500 }, t0);
      scores.push(s.score);
    }
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(s.attempts).toBe(8);
    expect(s.score).toBeGreaterThanOrEqual(90);
    expect(s.masteredAt).toEqual(t0);
  });

  it('treats slow correct answers as weaker evidence', () => {
    const fast = applyObservation(emptyMastery(t0), { correct: true, responseMs: 1000 }, t0);
    const slow = applyObservation(emptyMastery(t0), { correct: true, responseMs: 9000 }, t0);
    expect(fast.score).toBeGreaterThan(slow.score);
  });

  it('flags repeated failures as weak and schedules a quick relearn', () => {
    let s = emptyMastery(t0);
    for (let i = 0; i < 3; i++) s = applyObservation(s, { correct: false }, t0);
    expect(isWeak(s)).toBe(true);
    expect(s.dueAt.getTime() - t0.getTime()).toBe(10 * 60_000);
    expect(s.ease).toBe(190);
  });

  it('spaces reviews 1, 3, then ease-scaled days', () => {
    let s = emptyMastery(t0);
    s = applyObservation(s, { correct: true }, t0);
    expect(s.intervalDays).toBe(1);
    s = applyObservation(s, { correct: true }, t0);
    expect(s.intervalDays).toBe(3);
    s = applyObservation(s, { correct: true }, t0);
    expect(s.intervalDays).toBe(Math.round((3 * 260) / 100));
    expect(s.dueAt.getTime()).toBe(t0.getTime() + s.intervalDays * DAY);
  });

  it('uses pronunciation quality when given', () => {
    const s = applyObservation(emptyMastery(t0), { correct: true, quality: 50, pronunciation: true }, t0);
    expect(s.score).toBe(15);
    expect(s.pronunciationAvg).toBe(50);
    expect(s.intervalDays).toBe(0);
  });

  it('picks due items, weakest first', () => {
    const items = [
      { id: 'a', score: 80, attempts: 3, dueAt: new Date(t0.getTime() - 1000) },
      { id: 'b', score: 20, attempts: 4, dueAt: new Date(t0.getTime() - 1000) },
      { id: 'c', score: 10, attempts: 4, dueAt: new Date(t0.getTime() + DAY) },
      { id: 'd', score: 0, attempts: 0, dueAt: t0 },
    ];
    expect(pickReview(items, t0, 5).map((i) => i.id)).toEqual(['b', 'a']);
  });
});
