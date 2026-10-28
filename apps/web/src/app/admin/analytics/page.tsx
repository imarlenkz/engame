'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ErrorBox, PageTitle, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Analytics {
  days: number;
  totals: Record<string, number>;
  daily: ({ day: string } & Record<string, number | string>)[];
  funnel: {
    parentsRegistered: number;
    parentsWithChild: number;
    childrenStartedLesson: number;
    childrenCompletedLesson: number;
  };
}

const RANGES = [7, 30, 90] as const;

type L = { kk: string; ru: string; en: string };
/** First-party event names (apps/api/src/analytics/analytics.service.ts) in plain words. */
const EVENTS: Record<string, { icon: string; label: L }> = {
  user_registered: { icon: '🆕', label: { kk: 'Тіркелген ата-аналар', ru: 'Регистрации родителей', en: 'Parent sign-ups' } },
  user_logged_in: { icon: '🔑', label: { kk: 'Кірулер', ru: 'Входы', en: 'Sign-ins' } },
  child_created: { icon: '👧', label: { kk: 'Қосылған балалар', ru: 'Добавлено детей', en: 'Children added' } },
  placement_completed: { icon: '🧭', label: { kk: 'Бастапқы тексеру өтті', ru: 'Пройдено входное тестирование', en: 'Placement checks done' } },
  lesson_started: { icon: '▶️', label: { kk: 'Басталған сабақтар', ru: 'Начато уроков', en: 'Lessons started' } },
  lesson_completed: { icon: '📘', label: { kk: 'Аяқталған сабақтар', ru: 'Пройдено уроков', en: 'Lessons completed' } },
  exercise_started: { icon: '📝', label: { kk: 'Басталған жаттығулар', ru: 'Начато упражнений', en: 'Exercises started' } },
  answer_correct: { icon: '✅', label: { kk: 'Дұрыс жауаптар', ru: 'Правильные ответы', en: 'Correct answers' } },
  answer_wrong: { icon: '❌', label: { kk: 'Қате жауаптар', ru: 'Ошибки', en: 'Wrong answers' } },
  sound_mastered: { icon: '🔊', label: { kk: 'Меңгерілген дыбыстар', ru: 'Освоено звуков', en: 'Sounds mastered' } },
  word_mastered: { icon: '🧩', label: { kk: 'Меңгерілген сөздер', ru: 'Освоено слов', en: 'Words mastered' } },
  game_started: { icon: '🎮', label: { kk: 'Басталған ойындар', ru: 'Начато игр', en: 'Games started' } },
  game_completed: { icon: '🏁', label: { kk: 'Аяқталған ойындар', ru: 'Завершено игр', en: 'Games completed' } },
  pronunciation_attempt: { icon: '🎤', label: { kk: 'Айтылымды тексеру', ru: 'Проверки произношения', en: 'Pronunciation checks' } },
  achievement_unlocked: { icon: '🏅', label: { kk: 'Алынған марапаттар', ru: 'Получено наград', en: 'Achievements unlocked' } },
  streak_updated: { icon: '🔥', label: { kk: 'Қатарынан күн жалғасты', ru: 'Продлено серий дней', en: 'Streak days continued' } },
  daily_mission_completed: { icon: '🎯', label: { kk: 'Орындалған күнделікті тапсырмалар', ru: 'Выполнено заданий дня', en: 'Daily missions done' } },
  offline_sync: { icon: '📥', label: { kk: 'Офлайн нәтиже жіберілді', ru: 'Синхронизаций офлайн', en: 'Offline syncs' } },
  content_published: { icon: '📢', label: { kk: 'Жарияланған контент', ru: 'Публикаций контента', en: 'Content published' } },
};
const eventLabel = (name: string, locale: 'kk' | 'ru' | 'en') => EVENTS[name]?.label[locale] ?? name;
const CHART_EVENTS = ['lesson_completed', 'game_completed', 'answer_correct'] as const;

/** Bars of one event per day; the data comes straight from the first-party analytics table. */
function DailyBars({ daily, event }: { daily: Analytics['daily']; event: string }) {
  const { locale, t } = useI18n();
  const values = daily.map((d) => Number(d[event] ?? 0));
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">
          {EVENTS[event]?.icon} {eventLabel(event, locale)}
        </p>
        <b className="text-xl">{total}</b>
      </div>
      {total === 0 ? (
        <p className="flex h-28 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">{t('admin.noDataYet')}</p>
      ) : (
        <div className="flex h-28 items-end gap-0.5">
          {daily.map((d, i) => (
            <div key={d.day} className="flex h-full flex-1 items-end">
              <div className="w-full rounded-t bg-brand-500" style={{ height: `${(values[i]! / max) * 100}%`, minHeight: values[i] ? 2 : 0 }} title={`${d.day}: ${values[i]}`} />
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{daily[0]?.day}</span>
        <span>{daily[daily.length - 1]?.day}</span>
      </div>
    </div>
  );
}

export default function AnalyticsAdmin() {
  const { t, locale } = useI18n();
  const [days, setDays] = useState<number>(30);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-analytics', days], queryFn: () => api<Analytics>(`/admin/analytics?days=${days}`) });
  const funnel = data
    ? ([
        ['parentsRegistered', data.funnel.parentsRegistered],
        ['parentsWithChild', data.funnel.parentsWithChild],
        ['childrenStartedLesson', data.funnel.childrenStartedLesson],
        ['childrenCompletedLesson', data.funnel.childrenCompletedLesson],
      ] as const)
    : [];
  const top = funnel[0]?.[1] || 1;
  const hasEvents = data && Object.values(data.totals).some((n) => n > 0);
  return (
    <div>
      <PageTitle
        action={
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button key={r} className={r === days ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'} onClick={() => setDays(r)}>
                {t('admin.days', { n: r })}
              </button>
            ))}
          </div>
        }
      >
        {t('admin.analytics')}
      </PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 font-bold">{t('admin.funnel')}</h2>
            <div className="card space-y-2">
              {funnel.map(([k, n]) => (
                <div key={k}>
                  <div className="flex justify-between text-sm">
                    <span>{t(`admin.funnel.${k}`)}</span>
                    <b>{n}</b>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-leaf-500" style={{ width: `${Math.min(100, (n / top) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
          {!hasEvents ? (
            <p className="text-slate-500">{t('admin.noEvents')}</p>
          ) : (
            <>
              <section className="grid gap-3 md:grid-cols-3">
                {CHART_EVENTS.map((e) => (
                  <DailyBars key={e} daily={data.daily} event={e} />
                ))}
              </section>
              <section>
                <h2 className="mb-2 font-bold">{t('admin.events')}</h2>
                <p className="mb-2 text-sm text-slate-500">{t('admin.eventsHint', { n: days })}</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(data.totals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, n]) => (
                      <Stat key={name} icon={EVENTS[name]?.icon ?? '📈'} label={eventLabel(name, locale)} value={n} />
                    ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
