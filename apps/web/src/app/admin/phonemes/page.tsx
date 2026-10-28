'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LTextFields, MediaPicker, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { MouthShape } from '@/components/mouth';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Phoneme {
  id: string;
  slug: string;
  symbol: string;
  ipa: string;
  category: string;
  difficulty: number;
  mouthPosition: LocalizedText;
  tip: LocalizedText | null;
  audioId: string | null;
  mouthImageId: string | null;
  status: Status;
  graphemes: { grapheme: string; isPrimary: boolean }[];
  audio: { storageKey: string } | null;
  mouthImage: { storageKey: string } | null;
  _count: { wordPhonemes: number };
}

function EditPhoneme({ p, onDone }: { p: Phoneme; onDone(): void }) {
  const { t } = useI18n();
  const ordered = [...p.graphemes].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const [f, setF] = useState({
    symbol: p.symbol,
    mouthPosition: p.mouthPosition,
    tip: p.tip ?? { en: '', kk: '', ru: '' },
    difficulty: p.difficulty,
    audioId: p.audioId,
    mouthImageId: p.mouthImageId,
    status: p.status,
    graphemes: ordered.map((g) => g.grapheme).join(', '),
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/admin/phonemes/${p.id}`, {
        method: 'PATCH',
        body: {
          ...f,
          // An empty tip is stored as «no tip».
          tip: Object.values(f.tip ?? {}).some((v) => String(v ?? '').trim()) ? f.tip : null,
          graphemes: f.graphemes
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean)
            .map((grapheme, i) => ({ grapheme, isPrimary: i === 0 })),
        },
      }),
    onSuccess: onDone,
  });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Symbol">
          <input className="input" value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value })} />
        </Field>
        <Field label={t('admin.difficulty')}>
          <input className="input" type="number" min={1} max={5} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) })} />
        </Field>
        <Field label={t('common.status')}>
          <StatusSelect value={f.status} onChange={(status) => setF({ ...f, status })} />
        </Field>
      </div>
      <Field label={t('admin.graphemes')}>
        <input className="input font-mono" value={f.graphemes} onChange={(e) => setF({ ...f, graphemes: e.target.value })} />
      </Field>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div>
          <span className="label">{t('admin.mouth')}</span>
          <div className="flex h-36 items-center justify-center rounded-2xl bg-slate-900 p-3">
            <MouthShape ipa={p.ipa} className="h-28 w-full" />
          </div>
          <p className="mt-1 text-xs text-slate-500">{t('admin.mouthAuto')}</p>
        </div>
        <div className="space-y-3">
          <div>
            <span className="label">{t('admin.mouth')}</span>
            <LTextFields value={f.mouthPosition} onChange={(mouthPosition) => setF({ ...f, mouthPosition })} />
          </div>
          <div>
            <span className="label">{t('sounds.tip')}</span>
            <LTextFields required={false} value={f.tip as LocalizedText} onChange={(tip) => setF({ ...f, tip })} />
          </div>
        </div>
      </div>
      <Field label={t('admin.audio')}>
        <MediaPicker kind="audio" value={f.audioId} onChange={(audioId) => setF({ ...f, audioId })} />
      </Field>
      <Field label={t('admin.image')}>
        <MediaPicker kind="images" value={f.mouthImageId} onChange={(mouthImageId) => setF({ ...f, mouthImageId })} />
      </Field>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

export default function PhonemesAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Phoneme | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-phonemes'], queryFn: () => api<Phoneme[]>('/admin/phonemes') });
  return (
    <div>
      <PageTitle>
        {t('admin.phonemes')} ({data?.length ?? 0})
      </PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>IPA</th>
              <th>{t('admin.mouth')}</th>
              <th>{t('admin.kind')}</th>
              <th>{t('admin.graphemes').split('(')[0]}</th>
              <th>{t('admin.audio')}</th>
              <th>{t('admin.words')}</th>
              <th>{t('common.status')}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id}>
                <td className="text-lg font-black">{p.symbol}</td>
                <td className="font-mono">/{p.ipa}/</td>
                <td>
                  <span className="flex h-12 w-28 items-center justify-center rounded-xl bg-slate-900" title={p.mouthPosition?.kk ?? p.mouthPosition?.en ?? ''}>
                    <MouthShape ipa={p.ipa} className="h-10 w-full" />
                  </span>
                  {p.mouthImage && <span className="chip mt-1">🖼️</span>}
                </td>
                <td className="text-xs">{p.category}</td>
                <td className="font-mono text-xs">{p.graphemes.map((g) => g.grapheme).join(', ')}</td>
                <td>{p.audio ? '✅' : <span className="chip bg-amber-100 text-amber-800">—</span>}</td>
                <td>{p._count.wordPhonemes}</td>
                <td>
                  <StatusChip status={p.status} />
                </td>
                <td>
                  <button className="btn-ghost btn-sm" onClick={() => setEditing(p)}>
                    {t('common.edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={editing ? `${editing.symbol} /${editing.ipa}/` : ''}>
        {editing && (
          <EditPhoneme
            p={editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-phonemes'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
