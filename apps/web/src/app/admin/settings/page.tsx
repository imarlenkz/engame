'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { JsonEditor } from '@/components/admin/admin-kit';
import { ErrorBox, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const KEYS = ['rewards', 'levels', 'hearts', 'review', 'dailyGoal'] as const;
type Key = (typeof KEYS)[number];

function SettingCard({ k, value }: { k: Key; value: unknown }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<unknown>(value ?? {});
  const [valid, setValid] = useState(true);
  const save = useMutation({
    mutationFn: () => api(`/admin/settings/${k}`, { method: 'PUT', body: draft }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-settings'] }),
  });
  return (
    <form className="card space-y-2" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <h2 className="font-bold">{t(`admin.settings.${k}`)}</h2>
      {value == null && <p className="text-xs text-slate-500">{t('admin.notSet')}</p>}
      <JsonEditor value={value ?? {}} rows={k === 'rewards' ? 11 : 4} onChange={(v, ok) => (setValid(ok), ok && setDraft(v))} />
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary btn-sm" disabled={!valid || save.isPending}>
        {save.isSuccess ? `✓ ${t('common.saved')}` : t('common.save')}
      </button>
    </form>
  );
}

export default function SettingsAdmin() {
  const { t } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-settings'], queryFn: () => api<Record<Key, unknown>>('/admin/settings') });
  return (
    <div>
      <PageTitle>{t('admin.settings')}</PageTitle>
      <p className="mb-4 text-sm text-slate-600">{t('admin.settingsHint')}</p>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          {KEYS.map((k) => (
            <SettingCard key={k} k={k} value={data[k]} />
          ))}
        </div>
      )}
    </div>
  );
}
