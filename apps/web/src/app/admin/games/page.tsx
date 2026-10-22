'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { JsonEditor, LTextFields, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Game {
  id: string;
  slug: string;
  type: string;
  title: LocalizedText;
  config: Record<string, unknown>;
  timed: boolean;
  timeLimitSec: number | null;
  status: Status;
}

function GameForm({ g, onDone }: { g?: Game; onDone(): void }) {
  const { t } = useI18n();
  const types = useQuery({ queryKey: ['exercise-types'], queryFn: () => api<{ key: string; label: string }[]>('/admin/exercise-types'), staleTime: Infinity });
  const [f, setF] = useState({
    slug: g?.slug ?? '',
    type: g?.type ?? 'listen_choose',
    title: g?.title ?? ({ en: '' } as LocalizedText),
    config: (g?.config ?? { pool: 'words', items: 8 }) as unknown,
    timed: g?.timed ?? false,
    timeLimitSec: g?.timeLimitSec ?? 60,
    status: g?.status ?? ('DRAFT' as Status),
  });
  const [valid, setValid] = useState(true);
  const body = { type: f.type, title: f.title, config: f.config, timed: f.timed, timeLimitSec: f.timed ? f.timeLimitSec : null, status: f.status };
  const save = useMutation({ mutationFn: () => (g ? api(`/admin/games/${g.id}`, { method: 'PATCH', body }) : api('/admin/games', { body: { ...body, slug: f.slug } })), onSuccess: onDone });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('admin.slug')}>
          <input className="input font-mono" value={f.slug} disabled={!!g} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9-]{2,60}" />
        </Field>
        <Field label={t('admin.type')}>
          <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {types.data?.map((x) => (
              <option key={x.key} value={x.key}>
                {x.key}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <JsonEditor value={f.config} rows={4} onChange={(v, ok) => (setValid(ok), ok && setF({ ...f, config: v }))} />
      <p className="text-xs text-slate-500">pool: phonemes | letters | words | cvc_words | digraph_words | sight_words · items · options · extraTiles · only[]</p>
      <div className="grid grid-cols-3 items-end gap-3">
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={f.timed} onChange={(e) => setF({ ...f, timed: e.target.checked })} /> {t('admin.timed')}
        </label>
        <Field label={t('admin.timeLimit')}>
          <input className="input" type="number" min={10} max={600} disabled={!f.timed} value={f.timeLimitSec} onChange={(e) => setF({ ...f, timeLimitSec: Number(e.target.value) })} />
        </Field>
        <Field label={t('common.status')}>
          <StatusSelect value={f.status} onChange={(status) => setF({ ...f, status })} />
        </Field>
      </div>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={!valid || save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

export default function GamesAdmin() {
  const { t, pick } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Game | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-games'], queryFn: () => api<Game[]>('/admin/games') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.games')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((g) => (
          <button key={g.id} className="card text-left hover:ring-brand-300" onClick={() => setEditing(g)}>
            <div className="flex items-center justify-between gap-2">
              <b>{pick(g.title)}</b>
              <StatusChip status={g.status} />
            </div>
            <p className="font-mono text-xs text-slate-500">
              {g.type} {g.timed ? `· ⏱ ${g.timeLimitSec}s` : ''} · {JSON.stringify(g.config)}
            </p>
          </button>
        ))}
      </div>
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={t('admin.games')}>
        {editing && (
          <GameForm
            g={editing === 'new' ? undefined : editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-games'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
