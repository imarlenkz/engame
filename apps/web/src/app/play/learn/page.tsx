'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ErrorBox, PageTitle, ProgressBar, Spinner, Stars } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface WorldSummary {
  slug: string;
  title: LocalizedText;
  icon: string;
  theme: string;
  lessons: number;
  completed: number;
  stars: number;
  unlocked: boolean;
  current: boolean;
}

const THEMES: Record<string, string> = {
  forest: 'from-green-300 to-emerald-500',
  island: 'from-cyan-300 to-sky-500',
  castle: 'from-violet-300 to-purple-500',
  space: 'from-indigo-400 to-slate-700',
  kingdom: 'from-amber-300 to-orange-500',
};

export default function Learn() {
  const { t, pick } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['worlds'], queryFn: () => api<WorldSummary[]>('/worlds') });
  return (
    <div>
      <PageTitle>{t('play.worlds')}</PageTitle>
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/play/alphabet" className="btn-ghost btn-sm">
          🔤 {t('play.alphabet')}
        </Link>
        <Link href="/play/sounds" className="btn-ghost btn-sm">
          👄 {t('play.sounds')}
        </Link>
        <Link href="/play/offline" className="btn-ghost btn-sm">
          📥 {t('play.downloads')}
        </Link>
      </div>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((w) => {
          const body = (
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-pop ${THEMES[w.theme] ?? THEMES.forest} ${w.unlocked ? '' : 'opacity-60 grayscale'}`}>
              <div className="flex items-center gap-4">
                <span className="text-5xl" aria-hidden>
                  {w.icon}
                </span>
                <div className="flex-1">
                  <h2 className="text-2xl font-black drop-shadow">{pick(w.title)}</h2>
                  <div className="mt-1 text-sm font-semibold">
                    {t('common.of', { a: w.completed, b: w.lessons })} · <Stars n={Math.min(3, Math.round(w.lessons ? w.stars / w.lessons : 0))} />
                  </div>
                </div>
                {!w.unlocked && <span aria-label={t('play.locked')}>🔒</span>}
              </div>
              <div className="mt-3">
                <ProgressBar value={w.completed} max={w.lessons} color="bg-white" />
              </div>
            </div>
          );
          return w.unlocked ? (
            <Link key={w.slug} href={`/play/learn/${w.slug}`} className="block">
              {body}
            </Link>
          ) : (
            <div key={w.slug} aria-disabled>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
