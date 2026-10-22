'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { LTextFields, StatusChip, StatusSelect, type Status } from '@/components/admin/admin-kit';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Tree {
  id: string;
  slug: string;
  order: number;
  title: LocalizedText;
  icon: string;
  theme: string;
  status: Status;
  levels: {
    id: string;
    slug: string;
    order: number;
    title: LocalizedText;
    status: Status;
    lessons: { id: string; slug: string; order: number; kind: string; title: LocalizedText; status: Status; _count: { exercises: number } }[];
  }[];
}

type Dialog =
  | { kind: 'world'; world?: Tree }
  | { kind: 'level'; worldId: string; level?: Tree['levels'][number] }
  | { kind: 'lesson'; levelId: string; order: number };

const KINDS = ['LETTER', 'SOUND', 'BLEND', 'WORD', 'SENTENCE', 'READING', 'REVIEW'];

function WorldForm({ world, onDone }: { world?: Tree; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ slug: world?.slug ?? '', order: world?.order ?? 0, title: world?.title ?? { en: '' }, icon: world?.icon ?? '🌳', theme: world?.theme ?? 'forest', status: world?.status ?? ('DRAFT' as Status) });
  const save = useMutation({
    mutationFn: () => (world ? api(`/admin/worlds/${world.id}`, { method: 'PATCH', body: { order: f.order, title: f.title, icon: f.icon, theme: f.theme, status: f.status } }) : api('/admin/worlds', { body: f })),
    onSuccess: onDone,
  });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      {!world && (
        <Field label={t('admin.slug')}>
          <input className="input font-mono" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9-]{2,60}" />
        </Field>
      )}
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <div className="grid grid-cols-4 gap-3">
        <Field label={t('admin.order')}>
          <input className="input" type="number" value={f.order} onChange={(e) => setF({ ...f, order: Number(e.target.value) })} />
        </Field>
        <Field label={t('admin.icon')}>
          <input className="input" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
        </Field>
        <Field label="Theme">
          <select className="input" value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })}>
            {['forest', 'island', 'castle', 'space', 'kingdom'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label={t('common.status')}>
          <StatusSelect value={f.status} onChange={(status) => setF({ ...f, status })} />
        </Field>
      </div>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

function LevelForm({ worldId, level, onDone }: { worldId: string; level?: Tree['levels'][number]; onDone(): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ slug: level?.slug ?? '', order: level?.order ?? 0, title: level?.title ?? { en: '' }, status: level?.status ?? ('DRAFT' as Status) });
  const save = useMutation({
    mutationFn: () => (level ? api(`/admin/levels/${level.id}`, { method: 'PATCH', body: { order: f.order, title: f.title, status: f.status } }) : api('/admin/levels', { body: { ...f, worldId } })),
    onSuccess: onDone,
  });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      {!level && (
        <Field label={t('admin.slug')}>
          <input className="input font-mono" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9-]{2,60}" />
        </Field>
      )}
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('admin.order')}>
          <input className="input" type="number" value={f.order} onChange={(e) => setF({ ...f, order: Number(e.target.value) })} />
        </Field>
        <Field label={t('common.status')}>
          <StatusSelect value={f.status} onChange={(status) => setF({ ...f, status })} />
        </Field>
      </div>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.save')}
      </button>
    </form>
  );
}

function LessonForm({ levelId, order, onDone }: { levelId: string; order: number; onDone(id: string): void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ slug: '', order, kind: 'WORD', title: { en: '' } as LocalizedText, estimatedMinutes: 7 });
  const save = useMutation({ mutationFn: () => api<{ id: string }>('/admin/lessons', { body: { ...f, levelId } }), onSuccess: (l) => onDone(l.id) });
  return (
    <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), save.mutate())}>
      <Field label={t('admin.slug')}>
        <input className="input font-mono" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} required pattern="[a-z0-9-]{2,80}" />
      </Field>
      <LTextFields value={f.title} onChange={(title) => setF({ ...f, title })} />
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('admin.kind')}>
          <select className="input" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
            {KINDS.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </Field>
        <Field label={t('admin.order')}>
          <input className="input" type="number" value={f.order} onChange={(e) => setF({ ...f, order: Number(e.target.value) })} />
        </Field>
        <Field label="min">
          <input className="input" type="number" min={1} max={30} value={f.estimatedMinutes} onChange={(e) => setF({ ...f, estimatedMinutes: Number(e.target.value) })} />
        </Field>
      </div>
      {save.error ? <ErrorBox error={save.error} /> : null}
      <button className="btn-primary w-full" disabled={save.isPending}>
        {t('common.create')}
      </button>
    </form>
  );
}

export default function CurriculumPage() {
  const { t, pick } = useI18n();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-tree'], queryFn: () => api<Tree[]>('/admin/curriculum') });
  const done = () => {
    setDialog(null);
    return qc.invalidateQueries({ queryKey: ['admin-tree'] });
  };
  return (
    <div>
      <PageTitle action={<button className="btn-primary btn-sm" onClick={() => setDialog({ kind: 'world' })}>+ {t('admin.newWorld')}</button>}>{t('admin.curriculum')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="space-y-4">
        {data?.map((w) => (
          <details key={w.id} className="card" open={data.length <= 2}>
            <summary className="flex cursor-pointer flex-wrap items-center gap-3">
              <span className="text-2xl">{w.icon}</span>
              <span className="text-lg font-extrabold">{pick(w.title)}</span>
              <StatusChip status={w.status} />
              <span className="ml-auto flex gap-2">
                <button className="btn-ghost btn-sm" onClick={(e) => (e.preventDefault(), setDialog({ kind: 'world', world: w }))}>
                  {t('common.edit')}
                </button>
                <button className="btn-ghost btn-sm" onClick={(e) => (e.preventDefault(), setDialog({ kind: 'level', worldId: w.id }))}>
                  + {t('admin.newLevel')}
                </button>
              </span>
            </summary>
            <div className="mt-4 space-y-4">
              {w.levels.map((l) => (
                <div key={l.id} className="rounded-2xl bg-slate-50 p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-bold">{pick(l.title)}</span>
                    <StatusChip status={l.status} />
                    <button className="btn-ghost btn-sm ml-auto" onClick={() => setDialog({ kind: 'level', worldId: w.id, level: l })}>
                      {t('common.edit')}
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => setDialog({ kind: 'lesson', levelId: l.id, order: (l.lessons.at(-1)?.order ?? -1) + 1 })}>
                      + {t('admin.newLesson')}
                    </button>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {l.lessons.map((lesson) => (
                      <li key={lesson.id}>
                        <Link href={`/admin/lessons/${lesson.id}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200 hover:ring-brand-300">
                          <span className="truncate">
                            <span className="text-slate-400">{lesson.order + 1}.</span> {pick(lesson.title)}
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            <span className="chip">{lesson._count.exercises}</span>
                            <StatusChip status={lesson.status} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
      <Modal wide open={dialog != null} onClose={() => setDialog(null)} title={dialog?.kind === 'world' ? t('admin.newWorld') : dialog?.kind === 'level' ? t('admin.newLevel') : t('admin.newLesson')}>
        {dialog?.kind === 'world' && <WorldForm world={dialog.world} onDone={done} />}
        {dialog?.kind === 'level' && <LevelForm worldId={dialog.worldId} level={dialog.level} onDone={done} />}
        {dialog?.kind === 'lesson' && (
          <LessonForm
            levelId={dialog.levelId}
            order={dialog.order}
            onDone={(id) => {
              void done();
              window.location.href = `/admin/lessons/${id}`;
            }}
          />
        )}
      </Modal>
    </div>
  );
}
