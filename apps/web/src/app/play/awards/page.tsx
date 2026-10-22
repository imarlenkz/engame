'use client';

import { useQuery } from '@tanstack/react-query';
import { ErrorBox, PageTitle, ProgressBar, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { LocalizedText } from '@/lib/types';

interface Award {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export default function AwardsPage() {
  const { t, pick, locale } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['achievements'], queryFn: () => api<Award[]>('/achievements') });
  return (
    <div>
      <PageTitle>{t('awards.title')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((a) => (
          <div key={a.slug} className={`card flex gap-4 ${a.unlockedAt ? 'bg-amber-50 ring-amber-200' : ''}`}>
            <span className={`text-5xl ${a.unlockedAt ? '' : 'grayscale opacity-40'}`} aria-hidden>
              {a.icon}
            </span>
            <div className="flex-1">
              <h2 className="font-extrabold">{pick(a.title)}</h2>
              <p className="text-sm text-slate-600">{pick(a.description)}</p>
              {a.unlockedAt ? (
                <p className="mt-1 text-xs font-semibold text-amber-700">✓ {new Date(a.unlockedAt).toLocaleDateString(locale)}</p>
              ) : (
                <div className="mt-2">
                  <ProgressBar value={a.progress} max={a.target} color="bg-sun-400" />
                  <p className="mt-1 text-xs text-slate-500">
                    {a.progress}/{a.target}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
