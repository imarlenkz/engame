'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { MediaPicker, Pager, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Word {
  id: string;
  text: string;
  pattern: string;
  emoji: string | null;
  translation: { kk?: string; ru?: string };
  difficulty: number;
  isSightWord: boolean;
  audioId: string | null;
  imageId: string | null;
  status: Status;
  phonemes: { grapheme: string; phoneme: { slug: string; symbol: string } }[];
}

const PATTERNS = ['CVC', 'CCVC', 'CVCC', 'CCVCC', 'DIGRAPH', 'SIGHT', 'OTHER'];

/** "sh:sh i:i p:p" ⇄ [{grapheme, phoneme}] */
const toText = (w?: Word) => (w ? w.phonemes.map((p) => `${p.grapheme}:${p.phoneme.slug}`).join(' ') : '');
const fromText = (s: string) =>
  s
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      const i = tok.lastIndexOf(':');
      return { grapheme: tok.slice(0, i), phoneme: tok.slice(i + 1) };
    });

function WordForm({ word, onDone }: { word?: Word; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    text: word?.text ?? '',
    pattern: word?.pattern ?? 'CVC',
    emoji: word?.emoji ?? '',
    kk: word?.translation.kk ?? '',
    ru: word?.translation.ru ?? '',
    difficulty: word?.difficulty ?? 1,
    breakdown: toText(word),
    audioId: word?.audioId ?? null,
    imageId: word?.imageId ?? null,
    status: word?.status ?? ('DRAFT' as Status),
  });
  const body = {
    pattern: f.pattern,
    emoji: f.emoji || null,
    translation: { kk: f.kk || undefined, ru: f.ru || undefined },
    difficulty: f.difficulty,
    isSightWord: f.pattern === 'SIGHT',
    breakdown: fromText(f.breakdown),
    audioId: f.audioId,
    imageId: f.imageId,
    status: f.status,
  };
  const save = useMutation({
    mutationFn: () => (word ? api(`/admin/words/${word.id}`, { method: 'PATCH', body }) : api('/admin/words', { body: { ...body, text: f.text } })),
    onSuccess: onDone,
  });
  const del = useMutation({ mutationFn: () => api(`/admin/words/${word!.id}`, { method: 'DELETE' }), onSuccess: onDone });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label={t('admin.text')}>
          <input className="input font-bold" lang="en" value={f.text} disabled={!!word} onChange={(e) => setF({ ...f, text: e.target.value.toLowerCase() })} required />
        </Field>
        <Field label={t('admin.pattern')}>
          <select className="input" value={f.pattern} onChange={(e) => setF({ ...f, pattern: e.target.value })}>
            {PATTERNS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label={t('admin.emoji')}>
          <input className="input" value={f.emoji} onChange={(e) => setF({ ...f, emoji: e.target.value })} />
        </Field>
        <Field label={t('admin.difficulty')}>
          <input className="input" type="number" min={1} max={5} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label={t('admin.breakdown')} hint="c:k a:ae t:t">
        <input className="input font-mono" value={f.breakdown} onChange={(e) => setF({ ...f, breakdown: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('admin.translationKk')}>
          <input className="input" value={f.kk} onChange={(e) => setF({ ...f, kk: e.target.value })} />
        </Field>
        <Field label={t('admin.translationRu')}>
          <input className="input" value={f.ru} onChange={(e) => setF({ ...f, ru: e.target.value })} />
        </Field>
      </div>
      <Field label={t('admin.audio')}>
        <MediaPicker kind="audio" value={f.audioId} onChange={(audioId) => setF({ ...f, audioId })} />
      </Field>
      <Field label={t('admin.image')}>
        <MediaPicker kind="images" value={f.imageId} onChange={(imageId) => setF({ ...f, imageId })} />
      </Field>
      <Field label={t('common.status')}>
        <StatusSelect value={f.status} onChange={(status) => setF({ ...f, status })} />
      </Field>
      {save.error ? <ErrorBox error={save.error} /> : null}
      {del.error ? <ErrorBox error={del.error} /> : null}
      <div className="flex gap-3">
        <button className="btn-primary flex-1" disabled={save.isPending}>
          {t('common.save')}
        </button>
        {word && (
          <button type="button" className="btn-danger" onClick={() => window.confirm(t('common.confirmDelete')) && del.mutate()}>
            🗑
          </button>
        )}
      </div>
    </form>
  );
}

export default function WordsAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Word | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin-words', q, page],
    queryFn: () => api<{ total: number; page: number; pageSize: number; items: Word[] }>(`/admin/words?page=${page}&pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.words')}</PageTitle>
      <input className="input mb-4 max-w-xs" placeholder={t('common.search')} value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr>
              <th>{t('admin.text')}</th>
              <th>{t('admin.pattern')}</th>
              <th>{t('admin.breakdown').split('(')[0]}</th>
              <th>{t('admin.translationKk')}</th>
              <th>{t('admin.audio')}</th>
              <th>{t('common.status')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((w) => (
              <tr key={w.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setEditing(w)}>
                <td className="font-bold" lang="en">
                  {w.emoji} {w.text}
                </td>
                <td className="text-xs">{w.pattern}</td>
                <td className="font-mono text-xs">{w.phonemes.map((p) => p.grapheme || '·').join('·')}</td>
                <td>{w.translation.kk}</td>
                <td>{w.audioId ? '🔊' : '—'}</td>
                <td>
                  <StatusChip status={w.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={editing === 'new' ? t('common.add') : (editing?.text ?? '')}>
        {editing && (
          <WordForm
            word={editing === 'new' ? undefined : editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-words'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
