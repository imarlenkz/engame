import { localDate } from '@engame/game-engine';

/** Offset (minutes east of UTC) of a timezone at an instant. */
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUtc - at.getTime()) / 60_000);
}

/** UTC instant when the local calendar day containing `now` began. */
export function startOfLocalDay(now: Date, timeZone: string): Date {
  const day = localDate(now, timeZone);
  const guess = new Date(`${day}T00:00:00Z`);
  return new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60_000);
}

export function daysAgo(now: Date, days: number, timeZone: string): Date {
  return new Date(startOfLocalDay(now, timeZone).getTime() - days * 86_400_000);
}

export { localDate };
