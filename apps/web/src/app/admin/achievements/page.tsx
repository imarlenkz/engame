'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LTextFields, MetricRuleFields, StatusChip, StatusSelect, useMetricText, type Status } from '@/components/admin/admin-kit';
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
    rule: a?.rule ?? { metric: 'lessons_completed', gte: 1 },
    xpReward: a?.xpReward ?? 0,
    coinReward: a?.coinReward ?? 0,
    status: a?.status ?? ('DRAFT' as Status),
  });
  const { slug, ...rest } = f;
  const save = useMutation({ mutationFn: () => (a ? api(`/admin/achievements/${a.id}`, { method: 'PATCH', body: rest }) : api('/admin/achievements', { body: f })), onSuccess: onDone });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{t('admin.achievementHint')}</p>
      <div className="grid grid-cols-[110px_1fr] gap-3">
        <Field label={t('admin.icon')}>
          <input className="input text-center text-2xl" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
        </Field>
        <div className="flex flex-wrap items-end gap-1.5 pb-1">
          {['🏅', '🌱', '📚', '💯', '🔥', '🔊', '👑', '🧩', '🎮', '🚀', '⭐', '🌙'].map((e) => (
            <button key={e} type="button" className="rounded-lg px-1.5 text-2xl hover:bg-slate-100" onClick={() => setF({ ...f, icon: e })}>
              {e}
            </button>
          ))}
        </div>
      </div>
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <LTextFields kind="description" value={f.description} onChange={(description) => setF({ ...f, description })} />
      <MetricRuleFields
        metric={f.rule.metric}
        value={f.rule.gte}
        numberLabel={t('admin.ruleAtLeast')}
        onChange={(metric, gte) => setF({ ...f, rule: { metric, gte } })}
      />
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
      <Field label={t('admin.code')}>
        <input className="input font-mono" value={slug} disabled={!!a} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9-]{2,60}" placeholder="words-50" />
      </Field>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

export default function AchievementsAdmin() {
  const { t, pick } = useI18n();
  const ruleText = useMetricText();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Achievement | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-achievements'], queryFn: () => api<Achievement[]>('/admin/achievements') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.achievements')}</PageTitle>
      <p className="-mt-3 mb-4 max-w-3xl text-sm text-slate-600">{t('admin.achievementsIntro')}</p>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {data?.map((a) => (
          <button key={a.id} className="card flex items-center gap-3 text-left hover:ring-brand-300" onClick={() => setEditing(a)}>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-3xl">{a.icon}</span>
            <span className="flex-1">
              <b>{pick(a.title)}</b>
              <span className="block text-sm text-slate-600">{pick(a.description)}</span>
              <span className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="chip">{ruleText(a.rule.metric, a.rule.gte)}</span>
                {a.xpReward > 0 && <span className="chip">+{a.xpReward} XP</span>}
                {a.coinReward > 0 && <span className="chip">+{a.coinReward} 🪙</span>}
                <span className="chip bg-brand-50 text-brand-800">👧 {t('admin.unlockedBy', { n: a._count.unlocked })}</span>
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
