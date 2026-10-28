'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorBox, Empty, PageTitle, Spinner } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { listDownloads, listOutbox, offlineSupported, removeDownload, syncOutbox } from '@/lib/offline';

export default function OfflinePage() {
  const { t, pick, locale } = useI18n();
  const qc = useQueryClient();
  const supported = offlineSupported();
  const downloads = useQuery({ queryKey: ['downloads'], queryFn: listDownloads, enabled: supported });
  const outbox = useQuery({ queryKey: ['outbox'], queryFn: listOutbox, enabled: supported });
  const [syncError, setSyncError] = useState<unknown>(null);
  const [syncing, setSyncing] = useState(false);
  const pending = (outbox.data ?? []).filter((r) => r.complete || r.answers.length).length;

  return (
    <div className="space-y-5">
      <PageTitle action={<Link href="/play/learn" className="btn-ghost btn-sm">← {t('common.back')}</Link>}>📥 {t('play.downloads')}</PageTitle>
      {pending > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 bg-amber-50">
          <span className="font-semibold">{t('play.pendingSync', { n: pending })}</span>
          <button
            className="btn-primary btn-sm"
            disabled={syncing}
            onClick={async () => {
              setSyncing(true);
              setSyncError(null);
              try {
                await syncOutbox();
                await qc.invalidateQueries();
              } catch (err) {
                setSyncError(err);
              } finally {
                setSyncing(false);
              }
            }}
          >
            {t('play.syncNow')}
          </button>
        </div>
      )}
      {syncError ? <ErrorBox error={syncError} /> : null}
      {downloads.isLoading && <Spinner />}
      {downloads.data && downloads.data.length === 0 && <Empty>{t('play.noDownloads')}</Empty>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {downloads.data?.map((d) => (
          <li key={d.lessonId} className="card flex items-center justify-between gap-3">
            <div>
              <div className="font-extrabold">{pick(d.title)}</div>
              <div className="text-xs text-slate-500">{new Date(d.downloadedAt).toLocaleString(locale)}</div>
            </div>
            <div className="flex gap-2">
              <Link href={`/lesson/${d.lessonId}?offline=1`} className="btn-success btn-sm">
                ▶
              </Link>
              <button
                className="btn-ghost btn-sm"
                aria-label={t('common.delete')}
                onClick={async () => {
                  await removeDownload(d.lessonId);
                  await qc.invalidateQueries({ queryKey: ['downloads'] });
                }}
              >
                🗑
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
