'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Empty, ErrorBox, Field, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface ClassRow {
  id: string;
  name: string;
  joinCode: string;
  archived: boolean;
  students: number;
  assignments: number;
}

export default function TeacherHome() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['classes'], queryFn: () => api<ClassRow[]>('/teacher/classes') });
  const create = useMutation({
    mutationFn: () => api('/teacher/classes', { body: { name } }),
    onSuccess: () => {
      setName('');
      return qc.invalidateQueries({ queryKey: ['classes'] });
    },
  });
  return (
    <div className="space-y-6">
      <PageTitle>{t('teacher.title')}</PageTitle>
      <form
        className="card flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label={t('teacher.className')}>
          <input className="input w-56" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="1А" />
        </Field>
        <button className="btn-primary" disabled={create.isPending}>
          + {t('teacher.newClass')}
        </button>
        {create.error ? <ErrorBox error={create.error} /> : null}
      </form>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data?.length === 0 && <Empty />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <Link key={c.id} href={`/teacher/classes/${c.id}`} className={`card block hover:ring-brand-300 ${c.archived ? 'opacity-60' : ''}`}>
            <h2 className="text-xl font-extrabold">{c.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              👧 {c.students} · 📚 {c.assignments}
            </p>
            <p className="mt-2 font-mono text-lg font-bold tracking-widest text-brand-700">{c.joinCode}</p>
            {c.archived && <span className="chip mt-2">{t('teacher.archived')}</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
