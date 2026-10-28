'use client';

import { useI18n } from '@/lib/i18n';
import type { Report } from '@/lib/types';
import { ProgressBar, Stat } from './ui';

const BAND_STYLE: Record<string, string> = {
  MASTERED: 'bg-star text-night shadow-glow-sm shadow-star/60',
  GOOD: 'bg-mint text-night shadow-glow-sm shadow-mint/50',
  LEARNING: 'bg-lilac text-night',
  NEEDS_PRACTICE: 'bg-coral text-night shadow-glow-sm shadow-coral/60',
  none: 'border-[1.5px] border-dashed border-white/25 text-slate-500',
};

export function SoundGrid({ sounds }: { sounds: Report['sounds'] }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="grid grid-cols-5 gap-2.5 sm:grid-cols-8 lg:grid-cols-11" lang="en">
        {sounds.map((s) => (
          <div
            key={s.slug}
            title={`/${s.ipa}/ · ${s.score}`}
            className={`mx-auto flex aspect-square w-full max-w-[64px] flex-col items-center justify-center rounded-full ${BAND_STYLE[s.band ?? 'none']}`}
          >
            <span className="text-base font-black leading-none sm:text-lg">{s.symbol}</span>
            <span className="font-mono text-[9px] opacity-75 sm:text-[10px]">/{s.ipa}/</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
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
        <h2 className="mb-3 text-[19px] font-black">{t('report.weekly')}</h2>
        <div className="flex h-32 items-end gap-2">
          {report.weekly.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div className={`w-full rounded-md ${d.minutes ? 'bg-lilac' : 'bg-white/[0.12]'}`} style={{ height: `${Math.max(6, (d.minutes / maxMinutes) * 100)}%` }} title={t('common.minutes', { n: d.minutes })} />
              </div>
              <span className="text-[11px] font-bold text-slate-500">{new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-[19px] font-black">{t('report.soundMap')}</h2>
        <div className="mb-3">
          <ProgressBar value={report.soundsMastered} max={report.soundsTotal} />
        </div>
        <SoundGrid sounds={report.sounds} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card flex flex-col gap-3.5">
          <h2 className="text-[19px] font-black">{t('report.weak')}</h2>
          {report.weakSounds.length ? (
            <ul className="flex flex-col gap-3" lang="en">
              {report.weakSounds.slice(0, 6).map((s) => (
                <li key={s.slug} className="flex items-center gap-3.5">
                  <span className="orb-coral h-[50px] w-[50px] text-xl">{s.symbol}</span>
                  <div className="flex flex-col">
                    <span className="font-extrabold">
                      {s.symbol} /{s.ipa}/
                    </span>
                    <span className="text-sm font-bold text-slate-500">{s.score}%</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm font-bold text-slate-500">{t('report.noData')}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 rounded-[26px] bg-lilac p-5 text-night">
          <h2 className="text-[19px] font-black">{t('report.homeTitle')}</h2>
          <p className="font-bold leading-relaxed">{t('report.homeText')}</p>
          {report.weakSounds.length > 0 && (
            <p className="font-black" lang="en">
              {report.weakSounds
                .slice(0, 3)
                .map((s) => s.symbol)
                .join(' · ')}
            </p>
          )}
          <span className="mt-auto text-sm font-extrabold opacity-70">{t('report.homeFoot')}</span>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-3 text-[19px] font-black">{t('report.words')}</h2>
        {report.wordsLearned.length ? (
          <div className="flex flex-wrap gap-2" lang="en">
            {report.wordsLearned.map((w) => (
              <span key={w.text} className="chip bg-mint/[0.14] text-sm text-mint">
                {w.emoji} {w.text}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-slate-500">{t('report.noData')}</p>
        )}
      </section>
    </div>
  );
}
