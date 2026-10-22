'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaPicker, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Letter {
  id: string;
  char: string;
  name: string;
  isVowel: boolean;
  audioId: string | null;
  imageId: string | null;
  exampleWordId: string | null;
  exampleWord: { id: string; text: string } | null;
  status: Status;
}

function EditLetter({ l, onDone }: { l: Letter; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ name: l.name, audioId: l.audioId, imageId: l.imageId, status: l.status, example: l.exampleWord?.text ?? '' });
  const save = useMutation({
    mutationFn: async () => {
      let exampleWordId: string | null = null;
      if (f.example) {
        const found = await api<{ items: { id: string; text: string }[] }>(`/admin/words?q=${encodeURIComponent(f.example)}&pageSize=50`);
        exampleWordId = found.items.find((w) => w.text === f.example.toLowerCase())?.id ?? null;
        if (!exampleWordId) throw new Error(`word "${f.example}" not found`);
      }
      return api(`/admin/letters/${l.id}`, { method: 'PATCH', body: { name: f.name, audioId: f.audioId, imageId: f.imageId, status: f.status, exampleWordId } });
    },
    onSuccess: onDone,
  });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Name">
          <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label={t('admin.words')}>
          <input className="input" value={f.example} onChange={(e) => setF({ ...f, example: e.target.value })} />
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
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

export default function LettersAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Letter | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-letters'], queryFn: () => api<Letter[]>('/admin/letters') });
  return (
    <div>
      <PageTitle>{t('admin.letters')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {data?.map((l) => (
          <button key={l.id} className="card flex flex-col items-center gap-1 p-3 text-center hover:ring-brand-300" onClick={() => setEditing(l)}>
            <span className={`text-3xl font-black ${l.isVowel ? 'text-berry-500' : 'text-brand-600'}`}>
              {l.char}
              {l.char.toLowerCase()}
            </span>
            <span className="text-xs text-slate-500">
              {l.name} · {l.exampleWord?.text ?? '—'}
            </span>
            <span className="flex items-center gap-1 text-xs">
              {l.audioId ? '🔊' : '🔇'} <StatusChip status={l.status} />
            </span>
          </button>
        ))}
      </div>
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={editing?.char ?? ''}>
        {editing && (
          <EditLetter
            l={editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-letters'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
