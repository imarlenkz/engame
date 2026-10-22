'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar } from '@/components/avatar';
import { ReportView } from '@/components/report';
import { Empty, ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText, Report } from '@/lib/types';

interface Roster {
  class: { id: string; name: string; joinCode: string; archived: boolean };
  students: { id: string; nickname: string; avatar: string; level: number; xp: number; lessonsCompleted: number; soundsMastered: number; weakSounds: number; lastActiveAt: string | null }[];
  assignments: { id: string; kind: 'LESSON' | 'HOMEWORK'; dueAt: string | null; lesson: { id: string; slug: string; title: LocalizedText }; completed: number; total: number }[];
}

interface CatalogLesson {
  id: string;
  slug: string;
  title: LocalizedText;
  world: { slug: string; title: LocalizedText; icon: string };
}

function StudentReport({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery({ queryKey: ['report', id], queryFn: () => api<Report>(`/progress/children/${id}`) });
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} />;
  return <ReportView report={data} />;
}

export default function ClassPage() {
  const { id } = useParams<{ id: string }>();
  const { t, pick, locale } = useI18n();
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<string | null>(null);
  const [assign, setAssign] = useState({ lessonId: '', kind: 'LESSON', dueAt: '' });
  const roster = useQuery({ queryKey: ['class', id], queryFn: () => api<Roster>(`/teacher/classes/${id}`) });
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: () => api<CatalogLesson[]>('/teacher/lessons'), staleTime: 600_000 });
  const refresh = () => qc.invalidateQueries({ queryKey: ['class', id] });

  const newCode = useMutation({ mutationFn: () => api(`/teacher/classes/${id}/join-code`, { method: 'POST' }), onSuccess: refresh });
  const archive = useMutation({
    mutationFn: (archived: boolean) => api(`/teacher/classes/${id}`, { method: 'PATCH', body: { archived } }),
    onSuccess: refresh,
  });
  const removeStudent = useMutation({ mutationFn: (childId: string) => api(`/teacher/classes/${id}/members/${childId}`, { method: 'DELETE' }), onSuccess: refresh });
  const addAssignment = useMutation({
    mutationFn: () =>
      api(`/teacher/classes/${id}/assignments`, {
        body: { lessonId: assign.lessonId, kind: assign.kind, dueAt: assign.dueAt ? new Date(`${assign.dueAt}T23:59:00`).toISOString() : undefined },
      }),
    onSuccess: () => {
      setAssign({ lessonId: '', kind: 'LESSON', dueAt: '' });
      return refresh();
    },
  });
  const removeAssignment = useMutation({ mutationFn: (aid: string) => api(`/teacher/classes/${id}/assignments/${aid}`, { method: 'DELETE' }), onSuccess: refresh });

  if (roster.isLoading) return <Spinner />;
  if (roster.error || !roster.data) return <ErrorBox error={roster.error} onRetry={() => roster.refetch()} />;
  const r = roster.data;

  return (
    <div className="space-y-6">
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <a className="btn-ghost btn-sm" href={`/api/v1/teacher/classes/${id}/report.csv`} download>
              ⬇ {t('teacher.csv')}
            </a>
            <button className="btn-ghost btn-sm" onClick={() => archive.mutate(!r.class.archived)}>
              {r.class.archived ? t('teacher.unarchive') : t('teacher.archive')}
            </button>
            <Link href="/teacher" className="btn-ghost btn-sm">
              ← {t('common.back')}
            </Link>
          </div>
        }
      >
        {r.class.name}
      </PageTitle>

      <section className="card flex flex-wrap items-center justify-between gap-4 bg-brand-50">
        <div>
          <div className="text-sm font-semibold text-slate-600">{t('teacher.joinCode')}</div>
          <div className="font-mono text-4xl font-black tracking-[0.3em] text-brand-700">{r.class.joinCode}</div>
          <p className="mt-1 max-w-md text-sm text-slate-600">{t('teacher.shareCode')}</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={() => newCode.mutate()} disabled={newCode.isPending}>
          🔄 {t('teacher.newCode')}
        </button>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-extrabold">
          {t('teacher.students')} ({r.students.length})
        </h2>
        {r.students.length === 0 ? (
          <Empty>{t('teacher.noStudents')}</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>{t('play.stats.level')}</th>
                <th>{t('report.lessons')}</th>
                <th>{t('report.sounds')}</th>
                <th>{t('teacher.weakSounds')}</th>
                <th>{t('teacher.lastActive')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {r.students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <button className="flex items-center gap-2 font-bold text-brand-700 underline" onClick={() => setViewing(s.id)}>
                      <Avatar name={s.avatar} size="text-2xl" /> {s.nickname}
                    </button>
                  </td>
                  <td>{s.level}</td>
                  <td>{s.lessonsCompleted}</td>
                  <td>{s.soundsMastered}/44</td>
                  <td className={s.weakSounds ? 'font-bold text-berry-600' : ''}>{s.weakSounds}</td>
                  <td>{s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleDateString(locale) : '—'}</td>
                  <td>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        if (window.confirm(`${t('teacher.remove')}: ${s.nickname}?`)) removeStudent.mutate(s.id);
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-extrabold">{t('teacher.assignments')}</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            addAssignment.mutate();
          }}
        >
          <Field label={t('teacher.lesson')}>
            <select className="input w-72" value={assign.lessonId} onChange={(e) => setAssign({ ...assign, lessonId: e.target.value })} required>
              <option value="" />
              {catalog.data?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.world.icon} {pick(l.title)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.kind')}>
            <select className="input" value={assign.kind} onChange={(e) => setAssign({ ...assign, kind: e.target.value })}>
              <option value="LESSON">{t('teacher.lesson')}</option>
              <option value="HOMEWORK">{t('teacher.homework')}</option>
            </select>
          </Field>
          <Field label={t('teacher.dueAt')}>
            <input className="input" type="date" value={assign.dueAt} onChange={(e) => setAssign({ ...assign, dueAt: e.target.value })} />
          </Field>
          <button className="btn-primary" disabled={addAssignment.isPending || !assign.lessonId}>
            {t('teacher.assign')}
          </button>
        </form>
        {addAssignment.error ? <ErrorBox error={addAssignment.error} /> : null}
        <ul className="space-y-2">
          {r.assignments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <div>
                <div className="font-bold">
                  {a.kind === 'HOMEWORK' ? '🏠 ' : '📘 '}
                  {pick(a.lesson.title)}
                </div>
                <div className="text-xs text-slate-500">
                  {t('teacher.completed', { a: a.completed, b: a.total })}
                  {a.dueAt ? ` · ${t('play.due', { date: new Date(a.dueAt).toLocaleDateString(locale) })}` : ''}
                </div>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => removeAssignment.mutate(a.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Modal wide open={viewing != null} onClose={() => setViewing(null)} title={t('report.title')}>
        {viewing && <StudentReport id={viewing} />}
      </Modal>
    </div>
  );
}
