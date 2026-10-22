'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pager } from '@/components/admin/admin-kit';
import { Empty, ErrorBox, PageTitle, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useMe } from '@/lib/session';

type Role = 'ADMIN' | 'TEACHER' | 'PARENT' | 'CHILD';
interface User {
  id: string;
  role: Role;
  status: 'ACTIVE' | 'DISABLED';
  email: string | null;
  displayName: string;
  locale: string;
  lastLoginAt: string | null;
  createdAt: string;
  viaImarlenId: boolean;
}
interface Page<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

const PAGE_SIZE = 50;

export default function UsersAdmin() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (search) params.set('q', search);
  if (role) params.set('role', role);
  const key = ['admin-users', params.toString()];
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: key,
    queryFn: () => api<Page<User>>(`/admin/users?${params}`),
    placeholderData: keepPreviousData,
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: Role; status?: User['status'] }) => api(`/admin/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const revoke = useMutation({ mutationFn: (id: string) => api(`/admin/users/${id}/revoke-sessions`, { method: 'POST' }) });

  return (
    <div>
      <PageTitle>{t('admin.users')}</PageTitle>
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
        }}
      >
        <input className="input max-w-xs" type="search" placeholder={t('common.search')} value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} />
        <select
          className="input max-w-[12rem]"
          value={role}
          onChange={(e) => {
            setPage(1);
            setRole(e.target.value as Role | '');
          }}
        >
          <option value="">{t('admin.allRoles')}</option>
          {(['ADMIN', 'TEACHER', 'PARENT', 'CHILD'] as const).map((r) => (
            <option key={r} value={r}>
              {t(`admin.users.${r}`)}
            </option>
          ))}
        </select>
        <button className="btn-ghost">{t('common.search')}</button>
      </form>
      {isLoading && <Spinner />}
      {error ? <ErrorBox error={error} onRetry={() => refetch()} /> : null}
      {update.error ? <ErrorBox error={update.error} /> : null}
      {revoke.error ? <ErrorBox error={revoke.error} /> : null}
      {data && data.items.length === 0 && <Empty />}
      {data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="p-3">{t('admin.name')}</th>
                <th className="p-3">{t('admin.role')}</th>
                <th className="p-3">{t('common.status')}</th>
                <th className="p-3">{t('admin.lastLogin')}</th>
                <th className="p-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const self = u.id === me?.user.id;
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="p-3">
                      <b>{u.displayName}</b>
                      <span className="block text-xs text-slate-500">
                        {u.email ?? '—'}
                        {u.viaImarlenId ? ' · iMARLEN ID' : ''}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.role === 'CHILD' || self ? (
                        t(`admin.users.${u.role}`)
                      ) : (
                        <select
                          className="input py-1"
                          value={u.role}
                          disabled={update.isPending}
                          onChange={(e) => window.confirm(`${u.displayName}: ${t(`admin.users.${e.target.value as Role}`)}?`) && update.mutate({ id: u.id, role: e.target.value as Role })}
                        >
                          {(['ADMIN', 'TEACHER', 'PARENT'] as const).map((r) => (
                            <option key={r} value={r}>
                              {t(`admin.users.${r}`)}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`chip ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t(`admin.userStatus.${u.status}`)}</span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</td>
                    <td className="space-x-1 whitespace-nowrap p-3">
                      {!self && (
                        <>
                          <button
                            className="btn-ghost btn-sm"
                            disabled={update.isPending}
                            onClick={() => update.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}
                          >
                            {u.status === 'ACTIVE' ? t('admin.disable') : t('admin.enable')}
                          </button>
                          <button className="btn-ghost btn-sm" disabled={revoke.isPending} onClick={() => revoke.mutate(u.id)}>
                            {revoke.isSuccess && revoke.variables === u.id ? '✓ ' : ''}
                            {t('admin.revokeSessions')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} />}
    </div>
  );
}
