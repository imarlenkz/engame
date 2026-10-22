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
const CHART_EVENTS = ['lesson_completed', 'game_completed', 'answer_correct'] as const;

/** Bars of one event per day; the data comes straight from the first-party analytics table. */
function DailyBars({ daily, event }: { daily: Analytics['daily']; event: string }) {
  const values = daily.map((d) => Number(d[event] ?? 0));
  const max = Math.max(1, ...values);
  return (
    <div className="card">
      <p className="mb-2 font-mono text-xs text-slate-500">{event}</p>
      <div className="flex h-28 items-end gap-0.5">
        {daily.map((d, i) => (
          <div key={d.day} className="group relative flex-1">
            <div className="rounded-t bg-brand-500" style={{ height: `${(values[i]! / max) * 100}%`, minHeight: values[i] ? 2 : 0 }} title={`${d.day}: ${values[i]}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsAdmin() {
  const { t } = useI18n();
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
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(data.totals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, n]) => (
                      <Stat key={name} icon="📈" label={name} value={n} />
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
