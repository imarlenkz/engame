'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { JsonEditor, LTextFields, METRICS_HINT, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Achievement {
  id: string;
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
  rule: { metric: string; gte: number };
  xpReward: number;
  coinReward: number;
  status: Status;
  _count: { unlocked: number };
}

function Form({ a, onDone }: { a?: Achievement; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    slug: a?.slug ?? '',
    title: a?.title ?? ({ en: '' } as LocalizedText),
    description: a?.description ?? ({ en: '' } as LocalizedText),
    icon: a?.icon ?? '🏅',
    rule: (a?.rule ?? { metric: 'lessons_completed', gte: 1 }) as unknown,
    xpReward: a?.xpReward ?? 0,
    coinReward: a?.coinReward ?? 0,
    status: a?.status ?? ('DRAFT' as Status),
  });
  const [valid, setValid] = useState(true);
  const { slug, ...rest } = f;
  const save = useMutation({ mutationFn: () => (a ? api(`/admin/achievements/${a.id}`, { method: 'PATCH', body: rest }) : api('/admin/achievements', { body: f })), onSuccess: onDone });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('admin.slug')}>
          <input className="input font-mono" value={slug} disabled={!!a} onChange={(e) => setF({ ...f, slug: e.target.value })} required />
        </Field>
        <Field label={t('admin.icon')}>
          <input className="input" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
        </Field>
      </div>
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <LTextFields value={f.description} onChange={(description) => setF({ ...f, description })} />
      <JsonEditor label={t('admin.rule')} value={f.rule} rows={3} onChange={(v, ok) => (setValid(ok), ok && setF({ ...f, rule: v }))} />
      <p className="text-xs text-slate-500">{METRICS_HINT}</p>
      <div className="grid grid-cols-3 gap-3">
        <Field label="XP">
          <input className="input" type="number" value={f.xpReward} onChange={(e) => setF({ ...f, xpReward: Number(e.target.value) })} />
        </Field>
        <Field label={t('lesson.coins')}>
          <input className="input" type="number" value={f.coinReward} onChange={(e) => setF({ ...f, coinReward: Number(e.target.value) })} />
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

export default function AchievementsAdmin() {
  const { t, pick } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Achievement | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-achievements'], queryFn: () => api<Achievement[]>('/admin/achievements') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.achievements')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((a) => (
          <button key={a.id} className="card flex items-center gap-3 text-left hover:ring-brand-300" onClick={() => setEditing(a)}>
            <span className="text-3xl">{a.icon}</span>
            <span className="flex-1">
              <b>{pick(a.title)}</b>
              <span className="block font-mono text-xs text-slate-500">
                {a.rule.metric} ≥ {a.rule.gte} · 👧 {a._count.unlocked}
              </span>
            </span>
            <StatusChip status={a.status} />
          </button>
        ))}
      </div>
      <Modal wide open={editing != null} onClose={() => setEditing(null)} title={t('admin.achievements')}>
        {editing && (
          <Form
            a={editing === 'new' ? undefined : editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-achievements'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
