'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LTextFields, MetricRuleFields, useMetricText } from '@/components/admin/admin-kit';
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
    rule: m?.rule ?? { metric: 'lessons_completed', target: 1 },
    xpReward: m?.xpReward ?? 50,
    coinReward: m?.coinReward ?? 10,
    active: m?.active ?? true,
  });
  const { slug, ...rest } = f;
  const save = useMutation({
    mutationFn: () => (m ? api(`/admin/missions/${m.id}`, { method: 'PATCH', body: rest }) : api('/admin/missions', { body: f })),
    onSuccess: onDone,
  });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{t('admin.missionHint')}</p>
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <MetricRuleFields
        metric={f.rule.metric}
        value={f.rule.target}
        numberLabel={t('admin.ruleToday')}
        onChange={(metric, target) => setF({ ...f, rule: { metric, target } })}
      />
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
        {t('admin.activeHint')}
      </label>
      <Field label={t('admin.code')}>
        <input className="input font-mono" value={slug} disabled={!!m} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9-]{2,60}" placeholder="daily-sounds" />
      </Field>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

export default function MissionsAdmin() {
  const { t, pick } = useI18n();
  const ruleText = useMetricText();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Mission | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-missions'], queryFn: () => api<Mission[]>('/admin/missions') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.missions')}</PageTitle>
      <p className="-mt-3 mb-4 max-w-3xl text-sm text-slate-600">{t('admin.missionsIntro')}</p>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((m) => (
          <button key={m.id} className="card flex items-center gap-3 text-left hover:ring-brand-300" onClick={() => setEditing(m)}>
            <span className="text-3xl">🎯</span>
            <span className="flex-1">
              <b>{pick(m.title)}</b>
              <span className="mt-1 block text-sm text-slate-600">
                {t('admin.today')}: {ruleText(m.rule.metric, m.rule.target)}
              </span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="chip">+{m.xpReward} XP</span>
                <span className="chip">+{m.coinReward} 🪙</span>
              </span>
            </span>
            <span className={`chip ${m.active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{m.active ? t('admin.active') : t('admin.inactive')}</span>
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
