'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaPicker, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Sentence {
  id: string;
  text: string;
  translation: { kk?: string; ru?: string };
  difficulty: number;
  audioId: string | null;
  imageId: string | null;
  status: Status;
}

function SentenceForm({ s, onDone }: { s?: Sentence; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ text: s?.text ?? '', kk: s?.translation.kk ?? '', ru: s?.translation.ru ?? '', difficulty: s?.difficulty ?? 1, audioId: s?.audioId ?? null, imageId: s?.imageId ?? null, status: s?.status ?? ('DRAFT' as Status) });
  const body = { text: f.text, translation: { kk: f.kk || undefined, ru: f.ru || undefined }, difficulty: f.difficulty, audioId: f.audioId, imageId: f.imageId, status: f.status };
  const save = useMutation({ mutationFn: () => (s ? api(`/admin/sentences/${s.id}`, { method: 'PATCH', body }) : api('/admin/sentences', { body })), onSuccess: onDone });
  const del = useMutation({ mutationFn: () => api(`/admin/sentences/${s!.id}`, { method: 'DELETE' }), onSuccess: onDone });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <Field label={t('admin.text')}>
        <input className="input" lang="en" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('admin.translationKk')}>
          <input className="input" value={f.kk} onChange={(e) => setF({ ...f, kk: e.target.value })} />
        </Field>
        <Field label={t('admin.translationRu')}>
          <input className="input" value={f.ru} onChange={(e) => setF({ ...f, ru: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('admin.difficulty')}>
          <input className="input" type="number" min={1} max={5} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) })} />
        </Field>
        <Field label={t('common.status')}>
          <StatusSelect value={f.status} onChange={(status) => setF({ ...f, status })} />
        </Field>
      </div>
      <Field label={t('admin.audio')}>
        <MediaPicker kind="audio" value={f.audioId} onChange={(audioId) => setF({ ...f, audioId })} />
      </Field>
      <Field label={t('admin.image')}>
        <MediaPicker kind="images" value={f.imageId} onChange={(imageId) => setF({ ...f, imageId })} />
      </Field>
      {save.error ? <ErrorBox error={save.error} /> : null}
      {del.error ? <ErrorBox error={del.error} /> : null}
      <div className="flex gap-3">
        <button className="btn-primary flex-1" disabled={save.isPending}>
          {t('common.save')}
        </button>
        {s && (
          <button type="button" className="btn-danger" onClick={() => window.confirm(t('common.confirmDelete')) && del.mutate()}>
            🗑
          </button>
        )}
      </div>
    </form>
  );
}

export default function SentencesAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Sentence | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-sentences'], queryFn: () => api<Sentence[]>('/admin/sentences') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.sentences')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <ul className="space-y-2">
        {data?.map((s) => (
          <li key={s.id}>
            <button className="card flex w-full items-center justify-between gap-3 p-4 text-left hover:ring-brand-300" onClick={() => setEditing(s)}>
              <span>
                <b lang="en">{s.text}</b> <span className="text-sm text-slate-500">— {s.translation.kk ?? s.translation.ru}</span>
              </span>
              <StatusChip status={s.status} />
            </button>
          </li>
        ))}
      </ul>
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={editing === 'new' ? t('common.add') : t('admin.sentences')}>
        {editing && (
          <SentenceForm
            s={editing === 'new' ? undefined : editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-sentences'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
