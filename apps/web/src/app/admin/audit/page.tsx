'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Pager } from '@/components/admin/admin-kit';
import { Empty, ErrorBox, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

interface Entry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  createdAt: string;
  actor: { id: string; displayName: string; role: string } | null;
}
interface Page {
  total: number;
  page: number;
  pageSize: number;
  items: Entry[];
}

export default function AuditAdmin() {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), pageSize: '50' });
  if (search) params.set('q', search);
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['admin-audit', params.toString()],
    queryFn: () => api<Page>(`/admin/audit?${params}`),
    placeholderData: keepPreviousData,
  });
  return (
    <div>
      <PageTitle>{t('admin.audit')}</PageTitle>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <input className="input max-w-xs font-mono" type="search" placeholder="lesson.update · user · <id>" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-ghost">{t('common.search')}</button>
      </form>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {data && data.items.length === 0 && <Empty />}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">{t('admin.when')}</th>
                <th className="p-3">{t('admin.actor')}</th>
                <th className="p-3">{t('admin.action')}</th>
                <th className="p-3">{t('admin.entity')}</th>
                <th className="p-3">{t('admin.details')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap p-3 text-xs">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="p-3">{e.actor?.displayName ?? '—'}</td>
                  <td className="p-3 font-mono text-xs">{e.action}</td>
                  <td className="p-3 font-mono text-xs">
                    {e.entity}
                    {e.entityId ? <span className="block text-slate-400">{e.entityId}</span> : null}
                  </td>
                  <td className="max-w-md p-3">
                    {e.meta && Object.keys(e.meta as object).length > 0 ? (
                      <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all text-xs text-slate-600">{JSON.stringify(e.meta, null, 1)}</pre>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}
