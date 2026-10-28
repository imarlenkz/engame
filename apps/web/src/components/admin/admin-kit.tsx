'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';
import { ErrorBox, Field } from '../ui';

export type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

type L3 = { kk: string; ru: string; en: string };

/** Metrics the achievement and mission rules can use (mirrors @engame/game-engine METRICS), in plain words. */
export const METRICS: Record<string, { icon: string; label: L3; unit: L3 }> = {
  lessons_completed: { icon: '📘', label: { kk: 'Аяқталған сабақтар', ru: 'Пройденные уроки', en: 'Lessons completed' }, unit: { kk: 'сабақ', ru: 'уроков', en: 'lessons' } },
  perfect_lessons: { icon: '💯', label: { kk: 'Қатесіз сабақтар', ru: 'Уроки без ошибок', en: 'Perfect lessons' }, unit: { kk: 'сабақ', ru: 'уроков', en: 'lessons' } },
  streak_days: { icon: '🔥', label: { kk: 'Қатарынан күндер', ru: 'Дней подряд', en: 'Days in a row' }, unit: { kk: 'күн', ru: 'дней', en: 'days' } },
  xp_total: { icon: '⭐', label: { kk: 'Жиналған XP', ru: 'Набрано XP', en: 'XP earned' }, unit: { kk: 'XP', ru: 'XP', en: 'XP' } },
  sounds_mastered: { icon: '🔊', label: { kk: 'Меңгерілген дыбыстар', ru: 'Освоенные звуки', en: 'Sounds mastered' }, unit: { kk: 'дыбыс', ru: 'звуков', en: 'sounds' } },
  words_mastered: { icon: '🧩', label: { kk: 'Меңгерілген сөздер', ru: 'Освоенные слова', en: 'Words mastered' }, unit: { kk: 'сөз', ru: 'слов', en: 'words' } },
  letters_mastered: { icon: '🔤', label: { kk: 'Меңгерілген әріптер', ru: 'Освоенные буквы', en: 'Letters mastered' }, unit: { kk: 'әріп', ru: 'букв', en: 'letters' } },
  games_played: { icon: '🎮', label: { kk: 'Ойнаған ойындар', ru: 'Сыгранные игры', en: 'Games played' }, unit: { kk: 'ойын', ru: 'игр', en: 'games' } },
  correct_answers: { icon: '✅', label: { kk: 'Дұрыс жауаптар', ru: 'Правильные ответы', en: 'Correct answers' }, unit: { kk: 'жауап', ru: 'ответов', en: 'answers' } },
  level_reached: { icon: '🚀', label: { kk: 'Жеткен деңгей', ru: 'Достигнутый уровень', en: 'Level reached' }, unit: { kk: 'деңгей', ru: 'уровень', en: 'level' } },
};

/** «📘 Аяқталған сабақтар: 10 сабақ» — a rule in plain words. */
export function useMetricText() {
  const { locale } = useI18n();
  return (metric: string, n: number) => {
    const m = METRICS[metric];
    return m ? `${m.icon} ${m.label[locale]}: ${n} ${m.unit[locale]}` : `${metric}: ${n}`;
  };
}

/** Metric dropdown + number, instead of a JSON rule. */
export function MetricRuleFields({
  metric,
  value,
  onChange,
  numberLabel,
}: {
  metric: string;
  value: number;
  onChange(metric: string, value: number): void;
  numberLabel: string;
}) {
  const { locale, t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
      <Field label={t('admin.ruleWhat')}>
        <select className="input" value={metric} onChange={(e) => onChange(e.target.value, value)}>
          {Object.entries(METRICS).map(([key, m]) => (
            <option key={key} value={key}>
              {m.icon} {m.label[locale]}
            </option>
          ))}
        </select>
      </Field>
      <Field label={numberLabel}>
        <input className="input" type="number" min={1} value={value} onChange={(e) => onChange(metric, Number(e.target.value))} required />
      </Field>
    </div>
  );
}

export function StatusChip({ status }: { status: Status }) {
  const { t } = useI18n();
  const style = status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : status === 'DRAFT' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600';
  return <span className={`chip ${style}`}>{t(`admin.status.${status}`)}</span>;
}

export function StatusSelect({ value, onChange }: { value: Status; onChange(v: Status): void }) {
  const { t } = useI18n();
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value as Status)}>
      {(['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => (
        <option key={s} value={s}>
          {t(`admin.status.${s}`)}
        </option>
      ))}
    </select>
  );
}

/** JSON text area that reports parse errors and only emits valid values. */
export function JsonEditor({ value, onChange, rows = 8, label }: { value: unknown; onChange(v: unknown, valid: boolean): void; rows?: number; label?: string }) {
  const { t } = useI18n();
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [bad, setBad] = useState(false);
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setText(JSON.stringify(value ?? {}, null, 2));
      setBad(false);
    }
  }, [value]);
  return (
    <Field label={label ?? t('admin.config')} error={bad ? t('admin.invalidJson') : undefined}>
      <textarea
        className={`input font-mono text-sm ${bad ? 'border-berry-500' : ''}`}
        rows={rows}
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const parsed = JSON.parse(e.target.value);
            last.current = parsed;
            setBad(false);
            onChange(parsed, true);
          } catch {
            setBad(true);
            onChange(null, false);
          }
        }}
      />
    </Field>
  );
}

export function LTextFields({
  value,
  onChange,
  required = true,
  kind = 'title',
}: {
  value: Partial<LocalizedText>;
  onChange(v: LocalizedText): void;
  required?: boolean;
  /** «title» → «Атауы (…)», «description» → «Сипаттамасы (…)». */
  kind?: 'title' | 'description';
}) {
  const { t } = useI18n();
  const k = kind === 'description' ? 'admin.desc' : 'admin.title';
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label={t(`${k}En`)}>
        <input className="input" value={value.en ?? ''} required={required} onChange={(e) => onChange({ ...value, en: e.target.value })} />
      </Field>
      <Field label={t(`${k}Kk`)}>
        <input className="input" value={value.kk ?? ''} onChange={(e) => onChange({ ...value, kk: e.target.value })} />
      </Field>
      <Field label={t(`${k}Ru`)}>
        <input className="input" value={value.ru ?? ''} onChange={(e) => onChange({ ...value, ru: e.target.value })} />
      </Field>
    </div>
  );
}

interface Asset {
  id: string;
  url: string;
  mime: string;
  caption?: string | null;
  createdAt: string;
}

/** Choose an uploaded audio clip / image, or upload a new one right here. */
export function MediaPicker({ kind, value, onChange }: { kind: 'audio' | 'images'; value: string | null | undefined; onChange(id: string | null): void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-media', kind], queryFn: () => api<Asset[]>(`/admin/media/${kind}`) });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const current = data?.find((a) => a.id === value);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const asset = await api<Asset>(`/admin/media/${kind}`, { form });
      await qc.invalidateQueries({ queryKey: ['admin-media', kind] });
      onChange(asset.id);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input max-w-xs" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">{t('admin.none')}</option>
          {data?.map((a) => (
            <option key={a.id} value={a.id}>
              {a.caption || a.url.split('/').pop()}
            </option>
          ))}
        </select>
        <label className="btn-ghost btn-sm cursor-pointer">
          {busy ? '…' : `⬆ ${t('admin.upload')}`}
          <input type="file" className="sr-only" accept={kind === 'audio' ? 'audio/*' : 'image/*'} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </label>
      </div>
      {current && kind === 'audio' && <audio controls src={current.url} className="h-9" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {current && kind === 'images' && <img src={current.url} alt="" className="h-20 rounded-lg object-contain ring-1 ring-slate-200" />}
      {error ? <ErrorBox error={error} /> : null}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage(p: number): void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-4 flex items-center justify-center gap-3 text-sm">
      <button className="btn-ghost btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← {t('common.prev')}
      </button>
      <span>
        {page} / {pages} ({total})
      </span>
      <button className="btn-ghost btn-sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        {t('common.next')} →
      </button>
    </div>
  );
}
