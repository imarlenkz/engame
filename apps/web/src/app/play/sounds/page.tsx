'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { ListenButton } from '@/components/media-view';
import { MouthShape } from '@/components/mouth';
import { Dot, Orb, type OrbTone } from '@/components/night';
import { ErrorBox, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { playMedia } from '@/lib/audio';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText, Report } from '@/lib/types';

interface Phoneme {
  slug: string;
  symbol: string;
  ipa: string;
  category: string;
  voiced?: boolean;
  graphemes: string[];
  audioUrl: string | null;
  mouthPosition: LocalizedText;
  mouthImageUrl: string | null;
  tip?: LocalizedText | null;
  examples: { text: string; emoji: string | null; audioUrl: string | null }[];
}

const VOWEL = new Set(['SHORT_VOWEL', 'LONG_VOWEL', 'DIPHTHONG', 'R_CONTROLLED']);

/** Star colour from the child's mastery: known = yellow, needs review = coral, learning = lilac, not met yet = dashed. */
function toneFor(s: Report['sounds'][number] | undefined): OrbTone {
  if (!s || !s.band) return 'ahead';
  if (s.weak || s.band === 'NEEDS_PRACTICE') return 'coral';
  if (s.band === 'MASTERED' || s.band === 'GOOD') return 'star';
  return 'lilac';
}

export default function SoundsPage() {
  const { t, pick } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['phonemes'], queryFn: () => api<Phoneme[]>('/phonemes'), staleTime: 3_600_000 });
  const { data: progress } = useQuery({ queryKey: ['progress'], queryFn: () => api<Report>('/progress') });
  const [sel, setSel] = useState<Phoneme | null>(null);

  const mastery = useMemo(() => new Map((progress?.sounds ?? []).map((s) => [s.slug, s])), [progress]);
  const consonants = (data ?? []).filter((p) => !VOWEL.has(p.category));
  const vowels = (data ?? []).filter((p) => VOWEL.has(p.category));
  useEffect(() => {
    if (!sel && data?.length) setSel(data.find((p) => p.slug === 'sh') ?? data[0]!);
  }, [data, sel]);

  const play = (p: Phoneme) => {
    setSel(p);
    void playMedia({ audioUrl: p.audioUrl, speak: p.examples[0]?.text });
  };

  const grid = (list: Phoneme[]) => (
    <div className="grid grid-cols-5 justify-items-center gap-x-2 gap-y-3 sm:grid-cols-8 xl:grid-cols-12" lang="en">
      {list.map((p) => {
        const tone = toneFor(mastery.get(p.slug));
        return (
          <Orb
            key={p.slug}
            tone={tone}
            size={58}
            onClick={() => play(p)}
            pressed={sel?.slug === p.slug}
            label={`${p.symbol} /${p.ipa}/`}
            className={sel?.slug === p.slug ? 'ring-2 ring-white ring-offset-2 ring-offset-night' : ''}
          >
            <span className="text-[19px] leading-none">{p.symbol}</span>
            <span className="font-mono text-[9px] font-medium opacity-75">/{p.ipa}/</span>
          </Orb>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tight">{t('sounds.mapTitle')}</h1>
        <Link href="/play/learn" className="btn-ghost btn-sm">
          ← {t('common.back')}
        </Link>
      </div>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && (
        <div className="grid overflow-hidden rounded-[30px] bg-white/[0.03] ring-1 ring-white/10 lg:grid-cols-[340px_1fr]">
          {/* Selected sound */}
          <aside className="flex flex-col gap-4 border-b border-white/10 p-6 lg:border-b-0 lg:border-r" lang="en">
            {sel ? (
              <>
                <Orb tone="star" size={180} onClick={() => play(sel)} label={`${sel.symbol} /${sel.ipa}/`} className="my-3 self-center shadow-glow-lg">
                  <span className="text-[68px] leading-none tracking-[-0.04em]">{sel.symbol}</span>
                  <span className="mt-1 font-mono text-base font-bold">/{sel.ipa}/</span>
                </Orb>
                <span className="text-[13px] font-black uppercase text-slate-500">{t('sounds.mouth')}</span>
                <div className="flex flex-col items-center gap-2 rounded-3xl bg-white/[0.04] p-4 ring-1 ring-white/[0.14]">
                  {sel.mouthImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sel.mouthImageUrl} alt="" className="h-32 w-full object-contain" />
                  ) : (
                    <MouthShape ipa={sel.ipa} className="h-28 w-full" />
                  )}
                  {!VOWEL.has(sel.category) && sel.voiced != null && (
                    <span className={`chip ${sel.voiced ? 'bg-star/15 text-star' : ''}`}>{sel.voiced ? t('sounds.voiced') : t('sounds.unvoiced')}</span>
                  )}
                </div>
                <p className="font-bold leading-snug text-slate-600">{pick(sel.mouthPosition)}</p>
                {sel.tip && (
                  <div className="rounded-3xl bg-lilac p-4 text-night">
                    <span className="text-xs font-black uppercase opacity-70">💡 {t('sounds.tip')}</span>
                    <p className="mt-1 font-bold leading-snug">{pick(sel.tip)}</p>
                  </div>
                )}
                <p className="font-mono text-sm text-slate-500">
                  {t('sounds.spellings')}: {sel.graphemes.map((g) => g.replace('_', '…')).join(' · ')}
                </p>
                <span className="text-[13px] font-black uppercase text-slate-500">{t('sounds.examples')}</span>
                <div className="flex flex-col gap-2">
                  {sel.examples.map((w) => (
                    <div key={w.text} className="flex items-center justify-between gap-3 rounded-full bg-white/[0.08] py-1.5 pl-5 pr-1.5">
                      <span className="text-lg font-black">
                        {w.emoji} {w.text}
                      </span>
                      <ListenButton media={{ audioUrl: w.audioUrl, speak: w.text }} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-bold text-slate-500">{t('sounds.pick')}</p>
            )}
          </aside>

          {/* The 44-star map */}
          <section className="flex flex-col gap-4 p-6 sm:px-8">
            <div className="flex flex-wrap gap-4 text-sm font-extrabold text-slate-600">
              {(
                [
                  ['star', 'sounds.known'],
                  ['coral', 'sounds.review'],
                  ['lilac', 'sounds.learning'],
                  ['ahead', 'sounds.ahead'],
                ] as const
              ).map(([tone, key]) => (
                <span key={key} className="flex items-center gap-1.5">
                  <Dot tone={tone} /> {t(key)}
                </span>
              ))}
            </div>
            <span className="text-[13px] font-black uppercase text-slate-500">{t('sounds.consonants', { n: consonants.length })}</span>
            {grid(consonants)}
            <span className="mt-2 text-[13px] font-black uppercase text-slate-500">{t('sounds.vowels', { n: vowels.length })}</span>
            {grid(vowels)}
          </section>
        </div>
      )}
    </div>
  );
}
