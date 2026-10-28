'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { RequireRole } from '@/components/guard';
import { AdultShell } from '@/components/shells';
import { useI18n } from '@/lib/i18n';

const SECTIONS = [
  ['/admin', 'admin.overview'],
  ['/admin/curriculum', 'admin.curriculum'],
  ['/admin/phonemes', 'admin.phonemes'],
  ['/admin/letters', 'admin.letters'],
  ['/admin/words', 'admin.words'],
  ['/admin/sentences', 'admin.sentences'],
  ['/admin/games', 'admin.games'],
  ['/admin/achievements', 'admin.achievements'],
  ['/admin/missions', 'admin.missions'],
  ['/admin/media', 'admin.media'],
  ['/admin/users', 'admin.users'],
  ['/admin/subscriptions', 'admin.subscriptions'],
  ['/admin/analytics', 'admin.analytics'],
  ['/admin/settings', 'admin.settings'],
  ['/admin/audit', 'admin.audit'],
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const path = usePathname();
  return (
    <RequireRole roles={['ADMIN']}>
      {(me) => (
        <AdultShell me={me} nav={[{ href: '/admin', label: t('admin.title') }]} wide day>
          <div className="flex flex-col gap-6 lg:flex-row">
            <nav aria-label="admin" className="flex gap-1 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-visible">
              {SECTIONS.map(([href, key]) => {
                const active = href === '/admin' ? path === href : path.startsWith(href) || (href === '/admin/curriculum' && path.startsWith('/admin/lessons'));
                return (
                  <Link key={href} href={href} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold ${active ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-white'}`}>
                    {t(key)}
                  </Link>
                );
              })}
            </nav>
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </AdultShell>
      )}
    </RequireRole>
  );
}
