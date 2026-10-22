'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ErrorBox, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface GameList {
  hearts: number;
  games: { id: string; slug: string; type: string; title: LocalizedText; timed: boolean; timeLimitSec: number | null; bestScore: number | null; plays: number; available: boolean }[];
}

const ICONS: Record<string, string> = {
  sound_to_letter: '🔊',
  letter_match: '🔤',
  listen_choose: '👂',
  memory: '🃏',
  word_builder: '🧱',
  missing_letter: '❓',
  blend: '🧪',
  sight_word: '👀',
};

export default function GamesPage() {
  const { t, pick } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['games'], queryFn: () => api<GameList>('/games') });
  return (
    <div>
      <PageTitle action={data ? <span className="chip bg-rose-100 text-base text-rose-700">❤️ {data.hearts}</span> : null}>{t('games.title')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.games.map((g) => (
          <div key={g.id} className="card flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden>
                {ICONS[g.type] ?? '🎲'}
              </span>
              <div className="flex-1">
                <h2 className="font-extrabold">{pick(g.title)}</h2>
                <p className="text-xs text-slate-500">
                  {g.timed && g.timeLimitSec ? `⏱ ${t('games.timed', { n: g.timeLimitSec })} · ` : ''}
                  {g.bestScore != null ? t('games.best', { n: g.bestScore }) : ''}
                </p>
              </div>
            </div>
            {g.available ? (
              <Link href={`/game/${g.id}`} className="btn-primary btn-sm">
                ▶ {t('games.play')}
              </Link>
            ) : (
              <span className="chip justify-center bg-rose-50 py-2 text-rose-700">❤️ {t('games.needsHeart')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
