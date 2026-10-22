'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorBox, PageTitle, Spinner, Stars } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { downloadLesson, listDownloads, offlineSupported } from '@/lib/offline';
import type { LocalizedText } from '@/lib/types';

interface WorldDetail {
  slug: string;
  title: LocalizedText;
  icon: string;
  levels: {
    slug: string;
    title: LocalizedText;
    lessons: { id: string; slug: string; title: LocalizedText; kind: string; estimatedMinutes: number; unlocked: boolean; current: boolean; status: string; stars: number }[];
  }[];
}

export default function WorldPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, pick, error: errMsg } = useI18n();
  const qc = useQueryClient();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['world', slug], queryFn: () => api<WorldDetail>(`/worlds/${slug}`) });
  const { data: downloads } = useQuery({ queryKey: ['downloads'], queryFn: listDownloads, enabled: offlineSupported() });
  const [busy, setBusy] = useState<string | null>(null);
  const [dlError, setDlError] = useState<string | null>(null);
  const saved = new Set((downloads ?? []).map((d) => d.lessonId));

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} onRetry={() => refetch()} />;

  return (
    <div>
      <PageTitle action={<Link href="/play/learn" className="btn-ghost btn-sm">← {t('common.back')}</Link>}>
        <span aria-hidden>{data.icon}</span> {pick(data.title)}
      </PageTitle>
      {dlError && <p className="mb-3 text-sm font-semibold text-berry-600">{dlError}</p>}
      <div className="space-y-6">
        {data.levels.map((level) => (
          <section key={level.slug}>
            <h2 className="mb-3 text-lg font-extrabold text-slate-700">{pick(level.title)}</h2>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {level.lessons.map((l) => (
                <li key={l.id} className={`card relative flex flex-col gap-2 p-4 ${l.current ? 'ring-4 ring-sun-400' : ''} ${l.unlocked ? '' : 'opacity-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-extrabold leading-tight">{pick(l.title)}</span>
                    {l.unlocked ? null : <span aria-label={t('play.locked')}>🔒</span>}
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <Stars n={l.stars} />
                    <span>{t('common.minutes', { n: l.estimatedMinutes })}</span>
                  </div>
                  {l.unlocked && (
                    <div className="mt-auto flex gap-2">
                      <Link href={`/lesson/${l.id}`} className={`${l.current ? 'btn-success' : 'btn-primary'} btn-sm flex-1`}>
                        ▶
                      </Link>
                      {offlineSupported() && (
                        <button
                          className="btn-ghost btn-sm"
                          title={saved.has(l.id) ? t('play.downloaded') : t('play.download')}
                          aria-label={saved.has(l.id) ? t('play.downloaded') : t('play.download')}
                          disabled={busy === l.id || saved.has(l.id)}
                          onClick={async () => {
                            setBusy(l.id);
                            setDlError(null);
                            try {
                              await downloadLesson(l.id);
                              await qc.invalidateQueries({ queryKey: ['downloads'] });
                            } catch (err) {
                              setDlError(errMsg(err));
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          {saved.has(l.id) ? '✅' : busy === l.id ? '…' : '📥'}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
