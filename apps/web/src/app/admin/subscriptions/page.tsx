'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Empty, ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type SubStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
const STATUSES: SubStatus[] = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED'];
interface Subscription {
  id: string;
  plan: string;
  status: SubStatus;
  seats: number;
  provider: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  owner: { id: string; displayName: string; email: string | null; role: string };
}

function Form({ s, onDone }: { s?: Subscription; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({
    ownerId: s?.owner.id ?? '',
    plan: s?.plan ?? 'school',
    status: s?.status ?? ('ACTIVE' as SubStatus),
    seats: s?.seats ?? 1,
    currentPeriodEnd: s?.currentPeriodEnd?.slice(0, 10) ?? '',
  });
  const save = useMutation({
    mutationFn: () => {
      const { ownerId, currentPeriodEnd, ...rest } = f;
      const body = { ...rest, currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd).toISOString() : null };
      return s ? api(`/admin/subscriptions/${s.id}`, { method: 'PATCH', body }) : api('/admin/subscriptions', { body: { ...body, ownerId: ownerId.trim() } });
    },
    onSuccess: onDone,
  });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <Field label={t('admin.ownerId')}>
        <input className="input font-mono" value={f.ownerId} disabled={!!s} onChange={(e) => setF({ ...f, ownerId: e.target.value })} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('admin.plan')}>
          <input className="input" value={f.plan} maxLength={40} onChange={(e) => setF({ ...f, plan: e.target.value })} required />
        </Field>
        <Field label={t('common.status')}>
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as SubStatus })}>
            {STATUSES.map((x) => (
              <option key={x} value={x}>
                {t(`admin.sub.${x}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('admin.seats')}>
          <input className="input" type="number" min={1} max={10000} value={f.seats} onChange={(e) => setF({ ...f, seats: Number(e.target.value) })} />
        </Field>
        <Field label={t('admin.periodEnd')}>
          <input className="input" type="date" value={f.currentPeriodEnd} onChange={(e) => setF({ ...f, currentPeriodEnd: e.target.value })} />
        </Field>
      </div>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

export default function SubscriptionsAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Subscription | 'new' | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-subs'], queryFn: () => api<Subscription[]>('/admin/subscriptions') });
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setEditing('new')}>+ {t('common.add')}</button>}>{t('admin.subscriptions')}</PageTitle>
      <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">{t('admin.manualOnly')}</p>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && data.length === 0 && <Empty />}
      <div className="space-y-2">
        {data?.map((s) => (
          <button key={s.id} className="card flex w-full flex-wrap items-center gap-3 text-left hover:ring-brand-300" onClick={() => setEditing(s)}>
            <span className="flex-1">
              <b>{s.owner.displayName}</b>
              <span className="block text-xs text-slate-500">
                {s.owner.email ?? '—'} · {t(`admin.users.${s.owner.role as 'PARENT'}`)}
              </span>
            </span>
            <span className="text-sm">
              {s.plan} · {t('admin.seats')}: {s.seats}
            </span>
            <span className="text-xs text-slate-500">
              {t('admin.periodEnd')}: {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
            </span>
            <span className={`chip ${s.status === 'ACTIVE' || s.status === 'TRIAL' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>{t(`admin.sub.${s.status}`)}</span>
          </button>
        ))}
      </div>
      <Modal open={editing != null} onClose={() => setEditing(null)} title={t('admin.subscriptions')}>
        {editing && (
          <Form
            s={editing === 'new' ? undefined : editing}
            onDone={() => {
              setEditing(null);
              void qc.invalidateQueries({ queryKey: ['admin-subs'] });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
