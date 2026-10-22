'use client';

import { useQuery } from '@tanstack/react-query';
import { ReportView } from '@/components/report';
import { ErrorBox, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Report } from '@/lib/types';

export default function ProgressPage() {
  const { t } = useI18n();
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['progress'], queryFn: () => api<Report>('/progress') });
  return (
    <div>
      <PageTitle>{t('progress.title')}</PageTitle>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && <ReportView report={data} />}
    </div>
  );
}
