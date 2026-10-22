'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ListenButton } from '@/components/media-view';
import { ErrorBox, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Letter {
  char: string;
  name: string;
  isVowel: boolean;
  audioUrl: string | null;
  example: { text: string; emoji: string | null; audioUrl: string | null } | null;
}

export default function AlphabetPage() {
  const { t } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['letters'], queryFn: () => api<Letter[]>('/letters'), staleTime: 3_600_000 });
  return (
    <div>
      <PageTitle action={<Link href="/play/learn" className="btn-ghost btn-sm">← {t('common.back')}</Link>}>{t('play.alphabet')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" lang="en">
        {data?.map((l) => (
          <div key={l.char} className="card flex flex-col items-center gap-1 p-4">
            <span className={`text-4xl font-black ${l.isVowel ? 'text-berry-500' : 'text-brand-600'}`}>
              {l.char}
              {l.char.toLowerCase()}
            </span>
            <span className="text-sm text-slate-500">{l.name}</span>
            {l.example && (
              <span className="text-sm">
                {l.example.emoji} {l.example.text}
              </span>
            )}
            <ListenButton media={{ audioUrl: l.audioUrl, speak: l.char }} />
          </div>
        ))}
      </div>
    </div>
  );
}
