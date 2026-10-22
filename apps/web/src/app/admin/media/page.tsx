'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Empty, ErrorBox, Field, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type Kind = 'audio' | 'images';
interface Asset {
  id: string;
  url: string;
  mime: string;
  bytes: number;
  caption?: string | null;
  alt?: { en?: string } | null;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
  createdAt: string;
}

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function Upload({ kind }: { kind: Kind }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const up = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('file', file!);
      if (text) form.append(kind === 'audio' ? 'caption' : 'altEn', text);
      return api<Asset>(`/admin/media/${kind}`, { form });
    },
    onSuccess: () => {
      setFile(null);
      setText('');
      void qc.invalidateQueries({ queryKey: ['admin-media', kind] });
    },
  });
  return (
    <form className="card mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(e) => (e.preventDefault(), up.mutate())}>
      <Field label={kind === 'audio' ? t('admin.uploadAudio') : t('admin.uploadImage')}>
        <input key={up.submittedAt} className="input" type="file" accept={kind === 'audio' ? 'audio/*' : 'image/*'} onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      </Field>
      <Field label={kind === 'audio' ? t('admin.caption') : t('admin.alt')}>
        <input className="input" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
      </Field>
      <button className="btn-primary" disabled={!file || up.isPending}>
        ⬆ {t('admin.upload')}
      </button>
      {up.error ? (
        <div className="sm:col-span-3">
          <ErrorBox error={up.error} />
        </div>
      ) : null}
    </form>
  );
}

export default function MediaAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>('audio');
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-media', kind], queryFn: () => api<Asset[]>(`/admin/media/${kind}`) });
  const del = useMutation({
    mutationFn: (id: string) => api(`/admin/media/${kind}/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-media', kind] }),
  });
  return (
    <div>
      <PageTitle>{t('admin.media')}</PageTitle>
      <div className="mb-4 flex gap-2">
        {(['audio', 'images'] as const).map((k) => (
          <button key={k} className={k === kind ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} onClick={() => setKind(k)}>
            {k === 'audio' ? `🔊 ${t('admin.audio')}` : `🖼 ${t('admin.image')}`}
          </button>
        ))}
      </div>
      <Upload kind={kind} />
      <p className="mb-3 text-xs text-slate-500">{t('admin.inUseHint')}</p>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {del.error ? <ErrorBox error={del.error} /> : null}
      {data && data.length === 0 && <Empty />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((a) => (
          <div key={a.id} className="card space-y-2">
            {kind === 'audio' ? (
              <audio controls preload="none" src={a.url} className="w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.alt?.en ?? ''} className="h-32 w-full rounded-lg object-contain ring-1 ring-slate-200" />
            )}
            <p className="truncate text-sm font-semibold">{(kind === 'audio' ? a.caption : a.alt?.en) || a.url.split('/').pop()}</p>
            <p className="text-xs text-slate-500">
              {a.mime} · {kb(a.bytes)}
              {a.width ? ` · ${a.width}×${a.height}` : ''} · {new Date(a.createdAt).toLocaleDateString()}
            </p>
            <button
              className="btn-ghost btn-sm text-red-700"
              disabled={del.isPending}
              onClick={() => window.confirm(t('common.confirmDelete')) && del.mutate(a.id)}
            >
              🗑 {t('common.delete')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
