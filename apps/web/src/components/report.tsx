'use client';

import { useI18n } from '@/lib/i18n';
import type { Report } from '@/lib/types';
import { ProgressBar, Stat } from './ui';

const BAND_STYLE: Record<string, string> = {
  MASTERED: 'bg-leaf-500 text-white',
  GOOD: 'bg-green-200 text-green-900',
  LEARNING: 'bg-sun-300 text-amber-900',
  NEEDS_PRACTICE: 'bg-berry-400 text-white',
  none: 'bg-slate-100 text-slate-400',
};

export function SoundGrid({ sounds }: { sounds: Report['sounds'] }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8" lang="en">
        {sounds.map((s) => (
          <div
            key={s.slug}
            title={`/${s.ipa}/ · ${s.score}`}
            className={`flex flex-col items-center rounded-xl px-1 py-2 ${BAND_STYLE[s.band ?? 'none']}`}
          >
            <span className="text-lg font-black">{s.symbol}</span>
            <span className="font-mono text-[11px] opacity-80">/{s.ipa}/</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {(['MASTERED', 'GOOD', 'LEARNING', 'NEEDS_PRACTICE', 'none'] as const).map((b) => (
          <span key={b} className={`chip ${BAND_STYLE[b]}`}>
            {t(`report.band.${b}`)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ReportView({ report }: { report: Report }) {
  const { t, locale } = useI18n();
  const maxMinutes = Math.max(10, ...report.weekly.map((d) => d.minutes));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat icon="⏱" label={t('report.learningTime')} value={t('common.minutes', { n: report.learningTimeMinutes })} />
        <Stat icon="📘" label={t('report.lessons')} value={report.lessonsCompleted} />
        <Stat icon="🔤" label={t('report.sounds')} value={`${report.soundsMastered}/${report.soundsTotal}`} />
        <Stat icon="📝" label={t('report.words')} value={report.wordsLearned.length} />
        <Stat icon="🗣" label={t('report.pronunciation')} value={report.pronunciationScore ?? '—'} />
        <Stat icon="🔥" label={t('report.streak')} value={report.streak.current} />
      </div>

      <section className="card">
        <h2 className="mb-3 font-extrabold">{t('report.weekly')}</h2>
        <div className="flex h-32 items-end gap-2">
          {report.weekly.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-lg bg-brand-400" style={{ height: `${(d.minutes / maxMinutes) * 100}%`, minHeight: d.minutes ? 4 : 0 }} title={t('common.minutes', { n: d.minutes })} />
              <span className="text-[11px] text-slate-500">{new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 font-extrabold">{t('report.soundMap')}</h2>
        <div className="mb-3">
          <ProgressBar value={report.soundsMastered} max={report.soundsTotal} />
        </div>
        <SoundGrid sounds={report.sounds} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-extrabold">{t('report.weak')}</h2>
          {report.weakSounds.length ? (
            <div className="flex flex-wrap gap-2" lang="en">
              {report.weakSounds.map((s) => (
                <span key={s.slug} className="chip bg-rose-100 text-rose-800">
                  {s.symbol} /{s.ipa}/
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t('report.noData')}</p>
          )}
        </div>
        <div className="card">
          <h2 className="mb-2 font-extrabold">{t('report.words')}</h2>
          {report.wordsLearned.length ? (
            <div className="flex flex-wrap gap-2" lang="en">
              {report.wordsLearned.map((w) => (
                <span key={w.text} className="chip bg-green-100 text-green-800">
                  {w.emoji} {w.text}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">{t('report.noData')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
