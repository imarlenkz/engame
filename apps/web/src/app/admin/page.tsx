'use client';

import { useQuery } from '@tanstack/react-query';
import { ErrorBox, PageTitle, Spinner, Stat } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Overview {
  users: Record<string, number>;
  children: number;
  activeChildren7d: number;
  lessonsCompleted7d: number;
  publishedLessons: number;
}

export default function AdminOverview() {
  const { t } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['admin-overview'], queryFn: () => api<Overview>('/admin/overview') });
  return (
    <div>
      <PageTitle>{t('admin.overview')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon="👧" label={t('admin.overview.children')} value={data.children} />
            <Stat icon="🔥" label={t('admin.overview.active')} value={data.activeChildren7d} />
            <Stat icon="📘" label={t('admin.overview.lessons')} value={data.lessonsCompleted7d} />
            <Stat icon="📚" label={t('admin.overview.published')} value={data.publishedLessons} />
          </div>
          <div className="card">
            <h2 className="mb-2 font-extrabold">{t('admin.overview.users')}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.users).map(([role, n]) => (
                <span key={role} className="chip text-sm">
                  {t(`admin.users.${role}`)}: {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
