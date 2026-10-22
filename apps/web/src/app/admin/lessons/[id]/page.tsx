'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { JsonEditor, LTextFields, StatusChip, type Status } from '@/components/admin/admin-kit';
import { MediaView } from '@/components/media-view';
import { ErrorBox, Field, Modal, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { ClientItem, LocalizedText } from '@/lib/types';

interface Exercise {
  id: string;
  order: number;
  stage: string;
  type: string;
  config: Record<string, unknown>;
}

interface Lesson {
  id: string;
  slug: string;
  kind: string;
  order: number;
  title: LocalizedText;
  status: Status;
  estimatedMinutes: number;
  xpReward: number;
  coinReward: number;
  exercises: Exercise[];
  level: { title: LocalizedText; world: { title: LocalizedText } };
  problems: { where: string; code: string; message: string }[];
}

interface ExerciseType {
  key: string;
  label: string;
  skills: string[];
  configSchema: { properties?: Record<string, { type?: string; enum?: unknown[]; default?: unknown }>; required?: string[] };
}

const STAGES = ['INTRO', 'TEACH', 'LISTEN', 'WATCH', 'REPEAT', 'PRACTICE', 'GAME', 'QUIZ', 'REVIEW', 'REWARD'];

/** A starting config from the type's JSON schema, so editors see which fields exist. */
function template(schema: ExerciseType['configSchema']): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, prop] of Object.entries(schema.properties ?? {})) {
    if (!schema.required?.includes(name) && prop.default === undefined) continue;
    out[name] = prop.default ?? (prop.enum ? prop.enum[0] : prop.type === 'array' ? [] : prop.type === 'number' || prop.type === 'integer' ? 1 : prop.type === 'boolean' ? false : '');
  }
  return out;
}

function ExerciseCard({ e, first, last, onMove, types }: { e: Exercise; first: boolean; last: boolean; onMove(dir: -1 | 1): void; types: ExerciseType[] }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [stage, setStage] = useState(e.stage);
  const [config, setConfig] = useState<unknown>(e.config);
  const [valid, setValid] = useState(true);
  useEffect(() => {
    setStage(e.stage);
    setConfig(e.config);
  }, [e]);
  const dirty = stage !== e.stage || JSON.stringify(config) !== JSON.stringify(e.config);
  const save = useMutation({
    mutationFn: () => api(`/admin/exercises/${e.id}`, { method: 'PATCH', body: { stage, config } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lesson'] }),
  });
  const del = useMutation({ mutationFn: () => api(`/admin/exercises/${e.id}`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-lesson'] }) });
  const type = types.find((x) => x.key === e.type);
  return (
    <li className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-brand-100 text-brand-800">#{e.order + 1}</span>
        <span className="font-mono font-bold">{e.type}</span>
        {type && <span className="text-xs text-slate-500">{t(type.label)}</span>}
        <span className="ml-auto flex gap-1">
          <button className="btn-ghost btn-sm" disabled={first} aria-label={t('admin.moveUp')} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button className="btn-ghost btn-sm" disabled={last} aria-label={t('admin.moveDown')} onClick={() => onMove(1)}>
            ↓
          </button>
          <button className="btn-ghost btn-sm" onClick={() => window.confirm(t('common.confirmDelete')) && del.mutate()}>
            🗑
          </button>
        </span>
      </div>
      <Field label={t('admin.stage')}>
        <select className="input w-48" value={stage} onChange={(ev) => setStage(ev.target.value)}>
          {STAGES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <JsonEditor
        value={config}
        rows={5}
        onChange={(v, ok) => {
          setValid(ok);
          if (ok) setConfig(v);
        }}
      />
      {save.error ? <ErrorBox error={save.error} /> : null}
      {del.error ? <ErrorBox error={del.error} /> : null}
      {dirty && (
        <button className="btn-primary btn-sm" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {t('common.save')}
        </button>
      )}
    </li>
  );
}

function Preview({ id }: { id: string }) {
  const { t } = useI18n();
  const { data, error, isLoading } = useQuery({
    queryKey: ['admin-preview', id],
    queryFn: () => api<{ steps: { exerciseId: string; stage: string; type: string; items: (ClientItem & { key: unknown })[]; error: string | null }[] }>(`/admin/lessons/${id}/preview`, { method: 'POST' }),
  });
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error} />;
  return (
    <div className="max-h-[70dvh] space-y-4 overflow-y-auto">
      {data.steps.map((s) => (
        <section key={s.exerciseId} className="rounded-2xl bg-slate-50 p-3">
          <div className="mb-2 text-sm font-bold">
            {s.stage} · <span className="font-mono">{s.type}</span>
          </div>
          {s.error && <p className="text-sm font-semibold text-berry-600">{s.error}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {s.items.map((item) => (
              <div key={item.id} className="rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200">
                <div className="mb-2 font-semibold">{t(item.view.instruction)}</div>
                {'prompt' in item.view && <MediaView media={item.view.prompt} size="sm" />}
                {'focus' in item.view && <MediaView media={item.view.focus} size="sm" />}
                {item.view.kind === 'choice' && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.view.options.map((o) => (
                      <span key={o.id} className="chip">
                        {o.media.emoji} {o.media.text ?? o.media.ipa}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="mt-2 overflow-x-auto rounded bg-slate-100 p-2 text-[11px]">{JSON.stringify(item.key)}</pre>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function LessonEditor() {
  const { id } = useParams<{ id: string }>();
  const { t, pick } = useI18n();
  const qc = useQueryClient();
  const lesson = useQuery({ queryKey: ['admin-lesson', id], queryFn: () => api<Lesson>(`/admin/lessons/${id}`) });
  const types = useQuery({ queryKey: ['exercise-types'], queryFn: () => api<ExerciseType[]>('/admin/exercise-types'), staleTime: Infinity });
  const [meta, setMeta] = useState<Pick<Lesson, 'title' | 'estimatedMinutes' | 'xpReward' | 'coinReward' | 'order'> | null>(null);
  const [newEx, setNewEx] = useState<{ type: string; stage: string; config: unknown; valid: boolean }>({ type: '', stage: 'PRACTICE', config: {}, valid: true });
  const [preview, setPreview] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-lesson', id] });

  useEffect(() => {
    if (lesson.data) {
      const { title, estimatedMinutes, xpReward, coinReward, order } = lesson.data;
      setMeta({ title, estimatedMinutes, xpReward, coinReward, order });
    }
  }, [lesson.data]);

  const saveMeta = useMutation({ mutationFn: () => api(`/admin/lessons/${id}`, { method: 'PATCH', body: meta }), onSuccess: refresh });
  const setStatus = useMutation({ mutationFn: (status: Status) => api(`/admin/lessons/${id}`, { method: 'PATCH', body: { status } }), onSuccess: refresh });
  const add = useMutation({
    mutationFn: () => api(`/admin/lessons/${id}/exercises`, { body: { type: newEx.type, stage: newEx.stage, config: newEx.config } }),
    onSuccess: () => {
      setNewEx({ type: '', stage: 'PRACTICE', config: {}, valid: true });
      return refresh();
    },
  });
  const reorder = useMutation({ mutationFn: (ids: string[]) => api(`/admin/lessons/${id}/exercises/order`, { method: 'PUT', body: { ids } }), onSuccess: refresh });

  if (lesson.isLoading) return <Spinner />;
  if (lesson.error || !lesson.data) return <ErrorBox error={lesson.error} onRetry={() => lesson.refetch()} />;
  const l = lesson.data;
  const ids = l.exercises.map((e) => e.id);

  return (
    <div className="space-y-5">
      <PageTitle
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost btn-sm" onClick={() => setPreview(true)}>
              👁 {t('admin.preview')}
            </button>
            {l.status === 'PUBLISHED' ? (
              <button className="btn-ghost btn-sm" onClick={() => setStatus.mutate('DRAFT')}>
                {t('admin.unpublish')}
              </button>
            ) : (
              <button className="btn-success btn-sm" disabled={l.problems.length > 0} onClick={() => setStatus.mutate('PUBLISHED')}>
                {t('admin.publish')}
              </button>
            )}
            <Link href="/admin/curriculum" className="btn-ghost btn-sm">
              ← {t('common.back')}
            </Link>
          </div>
        }
      >
        {pick(l.title)} <StatusChip status={l.status} />
      </PageTitle>
      <p className="-mt-3 text-sm text-slate-500">
        {pick(l.level.world.title)} › {pick(l.level.title)} · <span className="font-mono">{l.slug}</span> · {l.kind}
      </p>
      {setStatus.error ? <ErrorBox error={setStatus.error} /> : null}

      <section className={`card ${l.problems.length ? 'bg-amber-50 ring-amber-200' : 'bg-green-50 ring-green-200'}`}>
        {l.problems.length ? (
          <>
            <h2 className="mb-2 font-extrabold">⚠ {t('admin.problems')}</h2>
            <ul className="list-disc pl-5 text-sm">
              {l.problems.map((p, i) => (
                <li key={i}>
                  <b>{p.where}</b>: {p.message}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="font-bold text-green-800">✓ {t('admin.valid')}</p>
        )}
      </section>

      {meta && (
        <form className="card space-y-3" onSubmit={(e) => (e.preventDefault(), saveMeta.mutate())}>
          <LTextFields value={meta.title} onChange={(title) => setMeta({ ...meta, title })} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label={t('admin.order')}>
              <input className="input" type="number" value={meta.order} onChange={(e) => setMeta({ ...meta, order: Number(e.target.value) })} />
            </Field>
            <Field label="min">
              <input className="input" type="number" value={meta.estimatedMinutes} onChange={(e) => setMeta({ ...meta, estimatedMinutes: Number(e.target.value) })} />
            </Field>
            <Field label="XP">
              <input className="input" type="number" value={meta.xpReward} onChange={(e) => setMeta({ ...meta, xpReward: Number(e.target.value) })} />
            </Field>
            <Field label={t('lesson.coins')}>
              <input className="input" type="number" value={meta.coinReward} onChange={(e) => setMeta({ ...meta, coinReward: Number(e.target.value) })} />
            </Field>
          </div>
          {saveMeta.error ? <ErrorBox error={saveMeta.error} /> : null}
          <button className="btn-primary btn-sm" disabled={saveMeta.isPending}>
            {t('common.save')}
          </button>
        </form>
      )}

      <section>
        <h2 className="mb-3 text-lg font-extrabold">
          {t('admin.exercises')} ({l.exercises.length})
        </h2>
        {reorder.error ? <ErrorBox error={reorder.error} /> : null}
        <ol className="space-y-3">
          {l.exercises.map((e, i) => (
            <ExerciseCard
              key={e.id}
              e={e}
              types={types.data ?? []}
              first={i === 0}
              last={i === l.exercises.length - 1}
              onMove={(dir) => {
                const next = [...ids];
                [next[i], next[i + dir]] = [next[i + dir]!, next[i]!];
                reorder.mutate(next);
              }}
            />
          ))}
        </ol>
      </section>

      <form className="card space-y-3" onSubmit={(e) => (e.preventDefault(), add.mutate())}>
        <h2 className="font-extrabold">+ {t('admin.addExercise')}</h2>
        <div className="flex flex-wrap gap-3">
          <Field label={t('admin.type')}>
            <select
              className="input w-64"
              value={newEx.type}
              required
              onChange={(e) => {
                const type = types.data?.find((x) => x.key === e.target.value);
                setNewEx({ ...newEx, type: e.target.value, config: type ? template(type.configSchema) : {}, valid: true });
              }}
            >
              <option value="" />
              {types.data?.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.key} — {t(x.label)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('admin.stage')}>
            <select className="input w-48" value={newEx.stage} onChange={(e) => setNewEx({ ...newEx, stage: e.target.value })}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        {newEx.type && (
          <>
            <JsonEditor value={newEx.config} rows={5} onChange={(v, ok) => setNewEx((cur) => ({ ...cur, config: ok ? v : cur.config, valid: ok }))} />
            <details className="text-xs text-slate-500">
              <summary>JSON schema</summary>
              <pre className="overflow-x-auto">{JSON.stringify(types.data?.find((x) => x.key === newEx.type)?.configSchema, null, 2)}</pre>
            </details>
          </>
        )}
        {add.error ? <ErrorBox error={add.error} /> : null}
        <button className="btn-primary btn-sm" disabled={!newEx.type || !newEx.valid || add.isPending}>
          {t('common.add')}
        </button>
      </form>

      <Modal wide open={preview} onClose={() => setPreview(false)} title={t('admin.preview')}>
        {preview && <Preview id={id} />}
      </Modal>
    </div>
  );
}
