'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar } from '@/components/avatar';
import { ReportView } from '@/components/report';
import { ErrorBox, Field, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ChildSummary, Report } from '@/lib/types';

export default function ChildReportPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const report = useQuery({ queryKey: ['report', id], queryFn: () => api<Report>(`/progress/children/${id}`) });
  const children = useQuery({ queryKey: ['children'], queryFn: () => api<ChildSummary[]>('/children') });
  const child = children.data?.find((c) => c.id === id);
  const [code, setCode] = useState('');

  const voice = useMutation({
    mutationFn: (granted: boolean) => api(`/children/${id}/consents`, { method: 'PUT', body: { type: 'VOICE_PROCESSING', granted } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['children'] }),
  });
  const join = useMutation({
    mutationFn: () => api<{ class: { name: string } }>(`/children/${id}/join-class`, { body: { code } }),
    onSuccess: () => {
      setCode('');
      return qc.invalidateQueries({ queryKey: ['children'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/children/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries();
      router.replace('/parent');
    },
  });

  return (
    <div className="space-y-6">
      <PageTitle action={<Link href="/parent" className="btn-ghost btn-sm">← {t('common.back')}</Link>}>
        {child && <Avatar name={child.avatar} size="text-4xl" />} {child?.nickname} · {t('report.title')}
      </PageTitle>
      {report.isLoading && <Spinner />}
      {report.error ? <ErrorBox error={report.error} onRetry={() => report.refetch()} /> : null}
      {report.data && <ReportView report={report.data} />}

      {child && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card space-y-3">
            <h2 className="font-extrabold">🎤 {child.consents.VOICE_PROCESSING ? t('parent.voiceOn') : t('parent.voiceOff')}</h2>
            <p className="text-sm text-slate-600">{t('parent.consentVoice')}</p>
            <button className={child.consents.VOICE_PROCESSING ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'} disabled={voice.isPending} onClick={() => voice.mutate(!child.consents.VOICE_PROCESSING)}>
              {child.consents.VOICE_PROCESSING ? t('parent.disallowVoice') : t('parent.allowVoice')}
            </button>
            {voice.error ? <ErrorBox error={voice.error} /> : null}
          </section>

          <section className="card space-y-3">
            <h2 className="font-extrabold">🏫 {t('parent.joinClass')}</h2>
            {child.classes.length > 0 && <p className="text-sm">{child.classes.map((c) => c.name).join(', ')}</p>}
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                join.mutate();
              }}
            >
              <Field label={t('parent.joinCode')}>
                <input className="input w-40 font-mono uppercase tracking-widest" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
              </Field>
              <button className="btn-primary btn-sm" disabled={join.isPending || code.length !== 6}>
                {t('common.add')}
              </button>
            </form>
            {join.data && <p className="text-sm font-semibold text-leaf-600">✓ {t('parent.joined', { name: join.data.class.name })}</p>}
            {join.error ? <ErrorBox error={join.error} /> : null}
          </section>
        </div>
      )}

      {child && (
        <section className="card border border-rose-200">
          <button
            className="btn-danger btn-sm"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm(t('parent.removeConfirm', { name: child.nickname }))) remove.mutate();
            }}
          >
            🗑 {t('parent.removeChild')}
          </button>
          {remove.error ? <ErrorBox error={remove.error} /> : null}
        </section>
      )}
    </div>
  );
}
