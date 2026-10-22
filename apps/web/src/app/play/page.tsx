'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/avatar';
import { ErrorBox, ProgressBar, Spinner, Stat } from '@/components/ui';
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

  return (
    <div className="space-y-5">
      <section className="flex items-center gap-4">
        <Avatar name={data.child.avatar} size="text-6xl" />
        <div className="flex-1">
          <h1 className="text-3xl font-black">{t('play.hello', { name: data.child.nickname })}</h1>
          <div className="mt-2 flex items-center gap-3">
            <span className="chip bg-brand-100 text-brand-800">
              {t('play.stats.level')} {data.level.level}
            </span>
            <div className="max-w-xs flex-1">
              <ProgressBar value={data.level.xpIntoLevel} max={data.level.xpForNext} color="bg-brand-500" label="XP" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat icon="🪙" label={t('play.stats.coins')} value={data.coins} />
        <Stat icon="❤️" label={t('play.stats.hearts')} value={data.hearts} />
        <Stat icon="🔥" label={t('play.stats.streak')} value={data.streak.current} />
      </section>

      {data.needsPlacement ? (
        <section className="card bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <h2 className="text-2xl font-black">🧭 {t('play.placement')}</h2>
          <p className="mt-1 text-brand-50">{t('play.placementText')}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/placement" className="btn bg-white text-brand-700">
              {t('play.placement')}
            </Link>
            <button className="btn bg-brand-400/40 text-white" onClick={() => skip.mutate()} disabled={skip.isPending}>
              {t('play.placementSkip')}
            </button>
          </div>
        </section>
      ) : data.currentLesson ? (
        <section className="card flex flex-wrap items-center gap-4 bg-gradient-to-br from-leaf-400 to-leaf-600 text-white">
          <span className="text-5xl" aria-hidden>
            {data.currentLesson.world.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-green-50">{pick(data.currentLesson.world.title)}</div>
            <h2 className="text-2xl font-black">{pick(data.currentLesson.title)}</h2>
            <div className="text-sm text-green-50">⏱ {t('common.minutes', { n: data.currentLesson.minutes })}</div>
          </div>
          <Link href={`/lesson/${data.currentLesson.id}`} className="btn bg-white text-leaf-600">
            ▶ {t('play.continue')}
          </Link>
        </section>
      ) : (
        <section className="card text-center text-xl font-bold">🎉 {t('play.allDone')}</section>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-extrabold">🎯 {t('play.todayGoal')}</h2>
          <ProgressBar value={data.todayGoal.doneMinutes} max={data.todayGoal.minutes} />
          <p className="mt-2 text-sm text-slate-600">
            {data.todayGoal.doneMinutes >= data.todayGoal.minutes
              ? t('play.goalDone')
              : t('common.of', { a: t('common.minutes', { n: data.todayGoal.doneMinutes }), b: t('common.minutes', { n: data.todayGoal.minutes }) })}
          </p>
        </div>
        <div className="card flex items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold">🔁 {t('play.review')}</h2>
            <p className="text-sm text-slate-600">{data.review.count ? t('play.reviewCount', { n: data.review.count }) : t('play.reviewNone')}</p>
          </div>
          {data.review.count > 0 && (
            <Link href="/review" className="btn-primary btn-sm">
              ▶
            </Link>
          )}
        </div>
      </section>

      {open.length > 0 && (
        <section className="card">
          <h2 className="mb-3 font-extrabold">📚 {t('play.assignments')}</h2>
          <ul className="space-y-2">
            {open.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                <div>
                  <div className="font-bold">{pick(a.lesson.title)}</div>
                  <div className="text-xs text-slate-500">
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
        <h2 className="mb-3 font-extrabold">✅ {t('play.missions')}</h2>
        <ul className="space-y-3">
          {data.missions.map((m) => (
            <li key={m.slug}>
              <div className="mb-1 flex justify-between text-sm">
                <span className={m.completed ? 'font-bold text-leaf-600' : ''}>
                  {m.completed ? '✓ ' : ''}
                  {pick(m.title)}
                </span>
                <span className="text-slate-500">
                  {Math.min(m.progress, m.target)}/{m.target}
                </span>
              </div>
              <ProgressBar value={m.progress} max={m.target} color={m.completed ? 'bg-leaf-500' : 'bg-sun-400'} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
