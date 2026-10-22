'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { JsonEditor, LTextFields, METRICS_HINT } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Mission {
  id: string;
  slug: string;
  title: LocalizedText;
  rule: { metric: string; target: number };
  xpReward: number;
  coinReward: number;
  active: boolean;
}

function Form({ m, onDone }: { m?: Mission; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    slug: m?.slug ?? '',
    title: m?.title ?? ({ en: '' } as LocalizedText),
    rule: (m?.rule ?? { metric: 'lessons_completed', target: 1 }) as unknown,
    xpReward: m?.xpReward ?? 50,
    coinReward: m?.coinReward ?? 10,
    active: m?.active ?? true,
  });
  const [valid, setValid] = useState(true);
  const { slug, ...rest } = f;
  const save = useMutation({
    mutationFn: () => (m ? api(`/admin/missions/${m.id}`, { method: 'PATCH', body: rest }) : api('/admin/missions', { body: f })),
    onSuccess: onDone,
  });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <Field label={t('admin.slug')}>
        <input className="input font-mono" value={slug} disabled={!!m} onChange={(e) => setF({ ...f, slug: e.target.value })} required />
      </Field>
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <JsonEditor label={t('admin.rule')} value={f.rule} rows={3} onChange={(v, ok) => (setValid(ok), ok && setF({ ...f, rule: v }))} />
      <p className="text-xs text-slate-500">{METRICS_HINT}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="XP">
          <input className="input" type="number" min={0} value={f.xpReward} onChange={(e) => setF({ ...f, xpReward: Number(e.target.value) })} />
        </Field>
        <Field label={t('lesson.coins')}>
          <input className="input" type="number" min={0} value={f.coinReward} onChange={(e) => setF({ ...f, coinReward: Number(e.target.value) })} />
        </Field>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />
        {t('admin.active')}
      </label>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={!valid || save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

export default function MissionsAdmin() {
  const { t, pick } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Mission | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-missions'], queryFn: () => api<Mission[]>('/admin/missions') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.missions')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((m) => (
          <button key={m.id} className="card flex items-center gap-3 text-left hover:ring-brand-300" onClick={() => setEditing(m)}>
            <span className="text-3xl">🎯</span>
            <span className="flex-1">
              <b>{pick(m.title)}</b>
              <span className="block font-mono text-xs text-slate-500">
                {m.rule.metric} × {m.rule.target} · +{m.xpReward} XP · +{m.coinReward} 🪙
              </span>
            </span>
            <span className={`chip ${m.active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{m.active ? t('admin.active') : '—'}</span>
          </button>
        ))}
      </div>
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={t('admin.missions')}>
        {editing && (
          <Form
            m={editing === 'new' ? undefined : editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-missions'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
