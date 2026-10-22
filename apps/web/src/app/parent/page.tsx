'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Avatar, AVATARS } from '@/components/avatar';
import { Empty, ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api, isApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useMe, useRefreshMe } from '@/lib/session';
import type { ChildSummary } from '@/lib/types';

const AGES = ['AGE_4_5', 'AGE_6_7', 'AGE_8_9', 'AGE_10_11'] as const;

function AddChild({ onDone }: { onDone(): void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nickname: '', ageGroup: 'AGE_6_7', avatar: 'fox', data: false, voice: false });
  const create = useMutation({
    mutationFn: () =>
      api('/children', {
        body: { nickname: form.nickname, ageGroup: form.ageGroup, avatar: form.avatar, consents: { dataProcessing: form.data, voiceProcessing: form.voice } },
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['children'] });
      onDone();
    },
  });
  return (
    <form
      className="space-y-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <Field label={t('parent.nickname')} hint={t('parent.nicknameHint')}>
        <input className="input" value={form.nickname} maxLength={24} required onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
      </Field>
      <Field label={t('parent.age')}>
        <select className="input" value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}>
          {AGES.map((a) => (
            <option key={a} value={a}>
              {t(`parent.age.${a}`)}
            </option>
          ))}
        </select>
      </Field>
      <fieldset>
        <legend className="label">{t('parent.avatar')}</legend>
        <div className="flex flex-wrap gap-2">
          {Object.keys(AVATARS).map((a) => (
            <button
              type="button"
              key={a}
              aria-pressed={form.avatar === a}
              onClick={() => setForm({ ...form, avatar: a })}
              className={`rounded-2xl p-2 ${form.avatar === a ? 'bg-brand-100 ring-2 ring-brand-500' : 'bg-slate-50'}`}
            >
              <Avatar name={a} size="text-3xl" />
            </button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={form.data} required onChange={(e) => setForm({ ...form, data: e.target.checked })} />
        <span>{t('parent.consentData')}</span>
      </label>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.checked })} />
        <span>
          {t('parent.consentVoice')} <span className="text-slate-400">({t('common.optional')})</span>
        </span>
      </label>
      {create.error ? <ErrorBox error={create.error} /> : null}
      <button className="btn-primary w-full" disabled={create.isPending || !form.data}>
        {t('parent.addChild')}
      </button>
    </form>
  );
}

function PinForm() {
  const { t } = useI18n();
  const refresh = useRefreshMe();
  const [pin, setPin] = useState('');
  const save = useMutation({
    mutationFn: () => api('/auth/parent/pin', { method: 'PUT', body: { pin } }),
    onSuccess: async () => {
      setPin('');
      await refresh();
    },
  });
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field label={t('parentMode.setPin')}>
        <input className="input w-40 text-center tracking-widest" inputMode="numeric" pattern="\d{4,6}" maxLength={6} type="password" value={pin} onChange={(e) => setPin(e.target.value)} required />
      </Field>
      <button className="btn-primary" disabled={save.isPending}>
        {t('common.save')}
      </button>
      {save.isSuccess && <span className="text-sm font-semibold text-leaf-600">✓ {t('parentMode.pinSaved')}</span>}
      {save.error ? <ErrorBox error={save.error} /> : null}
    </form>
  );
}

export default function ParentHome() {
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [adding, setAdding] = useState(false);
  const [selectError, setSelectError] = useState<unknown>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['children'], queryFn: () => api<ChildSummary[]>('/children') });

  async function play(id: string) {
    setSelectError(null);
    try {
      await api(`/children/${id}/select`, { method: 'POST' });
      await qc.invalidateQueries();
      router.push('/play');
    } catch (err) {
      setSelectError(err);
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setAdding(true)}>+ {t('parent.addChild')}</button>}>{t('parent.title')}</PageTitle>
      {selectError ? <ErrorBox error={selectError} /> : null}
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data?.length === 0 && <Empty>{t('parent.noChildren')}</Empty>}
      <div className="grid gap-4 sm:grid-cols-2">
        {data?.map((c) => (
          <div key={c.id} className="card flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={c.avatar} size="text-5xl" />
              <div className="flex-1">
                <h2 className="text-xl font-extrabold">{c.nickname}</h2>
                <p className="text-sm text-slate-500">
                  {t(`parent.age.${c.ageGroup}`)} · {t('parent.level', { n: c.level })} · {c.xp} XP
                </p>
                {c.classes.length > 0 && <p className="text-xs text-slate-500">🏫 {c.classes.map((x) => x.name).join(', ')}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-success btn-sm" onClick={() => play(c.id)}>
                ▶ {t('parent.play')}
              </button>
              <Link href={`/parent/children/${c.id}`} className="btn-ghost btn-sm">
                📊 {t('parent.report')}
              </Link>
            </div>
          </div>
        ))}
      </div>

      <section className={`card ${me && !me.parentMode.hasPin ? 'ring-2 ring-amber-300' : ''}`}>
        <h2 className="mb-1 font-extrabold">🔒 {t('parentMode.title')}</h2>
        {me && !me.parentMode.hasPin && <p className="mb-3 text-sm text-amber-700">{t('parentMode.pinNeeded')}</p>}
        {isApiError(selectError, 'PIN_REQUIRED') && <p className="mb-3 text-sm font-semibold text-berry-600">{t('errors.PIN_REQUIRED')}</p>}
        <PinForm />
      </section>

      <Modal open={adding} onClose={() => setAdding(false)} title={t('parent.addChild')}>
        {adding && <AddChild onDone={() => setAdding(false)} />}
      </Modal>
    </div>
  );
}
