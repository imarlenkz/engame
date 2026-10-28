'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { GlowPill, Orb, type OrbTone } from '@/components/night';
import { ErrorBox, ProgressBar, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Dashboard, LocalizedText } from '@/lib/types';

interface Assignment {
  id: string;
  kind: string;
  dueAt: string | null;
  className: string;
  lesson: { id: string; title: LocalizedText; estimatedMinutes: number };
  completed: boolean;
}

interface WorldLesson {
  id: string;
  slug: string;
  title: LocalizedText;
  unlocked: boolean;
  current: boolean;
  status: string;
  stars: number;
}
interface WorldDetail {
  slug: string;
  levels: { lessons: WorldLesson[] }[];
}

/** Constellation path (design 2c), in a 760×600 box. */
const PATH = [
  [90, 540],
  [230, 450],
  [150, 330],
  [320, 250],
  [480, 330],
  [590, 190],
  [430, 80],
  [660, 50],
] as const;

/** «s /s/» → s, «Letter A» → A; otherwise the lesson number. */
function glyphOf(title: LocalizedText, fallback: number): { g: string; ipa: string | null } {
  const en = title.en ?? '';
  const ipa = en.match(/\/([^/]+)\//)?.[1] ?? null;
  const g = en.match(/^(\S{1,3})\s+\//)?.[1] ?? en.match(/\s(\S{1,3})$/)?.[1] ?? String(fallback);
  return { g, ipa };
}

function Constellation({ worldSlug }: { worldSlug: string }) {
  const { t, pick } = useI18n();
  const { data } = useQuery({ queryKey: ['world', worldSlug], queryFn: () => api<WorldDetail>(`/worlds/${worldSlug}`) });
  if (!data) return <div className="aspect-[760/600] w-full" />;
  const all = data.levels.flatMap((l) => l.lessons);
  const cur = Math.max(0, all.findIndex((l) => l.current));
  const start = Math.max(0, Math.min(cur - 5, all.length - PATH.length));
  const shown = all.slice(start, start + PATH.length);
  const pts = shown.map((_, i) => PATH[i]!);

  return (
    <div className="relative aspect-[760/600] w-full">
      <svg viewBox="0 0 760 600" className="absolute inset-0 h-full w-full" aria-hidden>
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" strokeDasharray="4 8" />
      </svg>
      <ol>
        {shown.map((l, i) => {
          const [x, y] = pts[i]!;
          const done = l.status === 'COMPLETED';
          const tone: OrbTone = l.current ? 'lilac' : done ? 'star' : l.unlocked ? 'coral' : 'ahead';
          const label = l.current ? t('sounds.today') : done ? t('sounds.known') : l.unlocked ? t('sounds.review') : t('sounds.ahead');
          const { g } = glyphOf(l.title, start + i + 1);
          const size = l.current ? 'clamp(56px, 12vw, 92px)' : 'clamp(40px, 8vw, 60px)';
          const orb = (
            <Orb tone={tone} size={0} style={{ width: size, height: size }} className={`text-[length:clamp(16px,3vw,24px)] ${l.current ? 'animate-twinkle' : ''}`}>
              {g}
            </Orb>
          );
          return (
            <li key={l.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={{ left: `${(x / 760) * 100}%`, top: `${(y / 600) * 100}%` }}>
              {l.unlocked ? (
                <Link href={`/lesson/${l.id}`} aria-label={`${pick(l.title)} · ${label}`} className="rounded-full">
                  {orb}
                </Link>
              ) : (
                <span aria-label={`${pick(l.title)} · ${label}`}>{orb}</span>
              )}
              <span className="absolute top-full mt-1.5 whitespace-nowrap text-[11px] font-extrabold text-slate-500 sm:text-[13px]">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function PlayHome() {
  const { t, pick, locale } = useI18n();
  const qc = useQueryClient();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: () => api<Dashboard>('/child/dashboard') });
  const { data: assignments } = useQuery({ queryKey: ['assignments'], queryFn: () => api<Assignment[]>('/assignments') });
  const skip = useMutation({
    mutationFn: () => api('/placement/skip', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} onRetry={() => refetch()} />;
  const open = (assignments ?? []).filter((a) => !a.completed);
  const lesson = data.currentLesson;
  const focus = lesson ? glyphOf(lesson.title, 1) : null;

  return (
    <div className="space-y-5">
      {/* Greeting row */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.08] ring-1 ring-white/20">
            <Avatar name={data.child.avatar} size="text-4xl" />
          </span>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black sm:text-3xl">{t('play.hello', { name: data.child.nickname })}</h1>
            <span className="font-bold text-slate-500">
              {lesson ? pick(lesson.world.title) : `${t('play.stats.level')} ${data.level.level}`}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <GlowPill tone="coral">{t('play.streakDays', { n: data.streak.current })}</GlowPill>
          <GlowPill tone="star">
            {data.progress.soundsMastered} / {data.progress.soundsTotal}
          </GlowPill>
        </div>
      </section>

      {data.needsPlacement ? (
        <section className="card flex flex-col gap-4 p-6 sm:p-8">
          <span className="kicker">🧭 {t('play.placement')}</span>
          <p className="text-lg font-bold text-slate-600">{t('play.placementText')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/placement" className="btn-star">
              {t('play.placement')}
            </Link>
            <button className="btn-ghost" onClick={() => skip.mutate()} disabled={skip.isPending}>
              {t('play.placementSkip')}
            </button>
          </div>
        </section>
      ) : lesson ? (
        /* Constellation + today's lesson (design 2c) */
        <section className="grid overflow-hidden rounded-[30px] bg-white/[0.03] ring-1 ring-white/10 lg:grid-cols-[1fr_340px]">
          <div className="p-4 sm:p-6">
            <Constellation worldSlug={lesson.world.slug} />
          </div>
          <aside className="flex flex-col gap-5 border-t border-white/10 bg-white/[0.05] p-6 sm:p-8 lg:border-l lg:border-t-0">
            <span className="kicker">{t('play.todayLesson')}</span>
            <Orb tone="lilac" size={180} word={undefined} className="self-center shadow-glow-lg">
              <span lang="en" className="text-[72px] font-black leading-none tracking-[-0.04em]">
                {focus?.g}
              </span>
              {focus?.ipa && <span className="mt-1 font-mono text-[15px] font-bold">/{focus.ipa}/</span>}
            </Orb>
            <span className="text-center text-lg font-extrabold text-slate-600">{pick(lesson.title)}</span>
            <div className="flex justify-between text-[15px] font-extrabold">
              <span>{t('common.minutes', { n: lesson.minutes })}</span>
              <span className="text-slate-500">{lesson.world.icon}</span>
            </div>
            <Link href={`/lesson/${lesson.id}`} className="btn-star mt-auto py-5 text-[22px]">
              {t('play.letsFly')}
            </Link>
            <Link href="/play/sounds" className="text-center font-extrabold text-lilac hover:text-white">
              {t('play.allStars')}
            </Link>
          </aside>
        </section>
      ) : (
        <section className="card p-8 text-center text-xl font-black">🎉 {t('play.allDone')}</section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h2 className="mb-3 font-black">🎯 {t('play.todayGoal')}</h2>
          <ProgressBar value={data.todayGoal.doneMinutes} max={data.todayGoal.minutes} />
          <p className="mt-2 text-sm font-bold text-slate-500">
            {data.todayGoal.doneMinutes >= data.todayGoal.minutes
              ? t('play.goalDone')
              : t('common.of', { a: t('common.minutes', { n: data.todayGoal.doneMinutes }), b: t('common.minutes', { n: data.todayGoal.minutes }) })}
          </p>
        </div>
        <div className="card flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black">🔁 {t('play.review')}</h2>
            <p className="text-sm font-bold text-slate-500">{data.review.count ? t('play.reviewCount', { n: data.review.count }) : t('play.reviewNone')}</p>
          </div>
          {data.review.count > 0 && (
            <Link href="/review" className="btn-danger btn-sm" aria-label={t('play.review')}>
              ▶
            </Link>
          )}
        </div>
        <div className="card flex items-center justify-around gap-3 text-center">
          <div>
            <div className="text-2xl font-black">🪙 {data.coins}</div>
            <div className="text-xs font-extrabold uppercase text-slate-500">{t('play.stats.coins')}</div>
          </div>
          <div>
            <div className="text-2xl font-black">❤️ {data.hearts}</div>
            <div className="text-xs font-extrabold uppercase text-slate-500">{t('play.stats.hearts')}</div>
          </div>
          <div>
            <div className="text-2xl font-black">⭐ {data.level.level}</div>
            <div className="text-xs font-extrabold uppercase text-slate-500">{t('play.stats.level')}</div>
          </div>
        </div>
      </section>

      {open.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-black">📚 {t('play.assignments')}</h2>
          <ul className="space-y-2">
            {open.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.05] px-4 py-3">
                <div>
                  <div className="font-extrabold">{pick(a.lesson.title)}</div>
                  <div className="text-xs font-bold text-slate-500">
                    {a.className}
                    {a.dueAt ? ` · ${t('play.due', { date: new Date(a.dueAt).toLocaleDateString(locale) })}` : ''}
                  </div>
                </div>
                <Link href={`/lesson/${a.lesson.id}`} className="btn-primary btn-sm">
                  ▶
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2 className="mb-3 font-black">✅ {t('play.missions')}</h2>
        <ul className="space-y-3">
          {data.missions.map((m) => (
            <li key={m.slug}>
              <div className="mb-1.5 flex justify-between text-sm font-bold">
                <span className={m.completed ? 'text-leaf-600' : ''}>
                  {m.completed ? '✓ ' : ''}
                  {pick(m.title)}
                </span>
                <span className="text-slate-500">
                  {Math.min(m.progress, m.target)}/{m.target}
                </span>
              </div>
              <ProgressBar value={m.progress} max={m.target} color={m.completed ? 'bg-mint' : 'bg-sun-400'} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
