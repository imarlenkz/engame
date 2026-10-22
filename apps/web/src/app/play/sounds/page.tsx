'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ListenButton, MediaView } from '@/components/media-view';
import { ErrorBox, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Phoneme {
  slug: string;
  symbol: string;
  ipa: string;
  category: string;
  graphemes: string[];
  audioUrl: string | null;
  mouthPosition: LocalizedText;
  mouthImageUrl: string | null;
  examples: { text: string; emoji: string | null; audioUrl: string | null }[];
}

const CATEGORY_COLOR: Record<string, string> = {
  SHORT_VOWEL: 'text-berry-500',
  LONG_VOWEL: 'text-rose-700',
  DIPHTHONG: 'text-purple-600',
  R_CONTROLLED: 'text-amber-600',
  CONSONANT: 'text-brand-600',
  DIGRAPH: 'text-teal-600',
};

export default function SoundsPage() {
  const { t, pick } = useI18n();
  const [open, setOpen] = useState<Phoneme | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['phonemes'], queryFn: () => api<Phoneme[]>('/phonemes'), staleTime: 3_600_000 });
  return (
    <div>
      <PageTitle action={<Link href="/play/learn" className="btn-ghost btn-sm">← {t('common.back')}</Link>}>{t('play.sounds')} (44)</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8" lang="en">
        {data?.map((p) => (
          <button key={p.slug} className="card flex flex-col items-center p-3 hover:-translate-y-0.5" onClick={() => setOpen(p)}>
            <span className={`text-3xl font-black ${CATEGORY_COLOR[p.category] ?? ''}`}>{p.symbol}</span>
            <span className="font-mono text-xs text-slate-500">/{p.ipa}/</span>
          </button>
        ))}
      </div>
      <Modal open={open != null} onClose={() => setOpen(null)} title={open ? `${open.symbol}  /${open.ipa}/` : ''}>
        {open && (
          <div className="space-y-4" lang="en">
            <MediaView media={{ text: open.symbol, ipa: `/${open.ipa}/`, audioUrl: open.audioUrl, imageUrl: open.mouthImageUrl, caption: open.mouthPosition as Record<string, string> }} />
            <p className="text-center text-sm text-slate-600">{open.graphemes.join(' · ')}</p>
            <div className="grid grid-cols-2 gap-2">
              {open.examples.map((w) => (
                <div key={w.text} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>
                    {w.emoji} <b>{w.text}</b>
                  </span>
                  <ListenButton media={{ audioUrl: w.audioUrl, speak: w.text }} />
                </div>
              ))}
            </div>
            <p className="sr-only">{pick(open.mouthPosition)}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
