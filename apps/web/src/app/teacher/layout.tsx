'use client';

import type { ReactNode } from 'react';
import { RequireRole } from '@/components/guard';
import { AdultShell } from '@/components/shells';
import { useI18n } from '@/lib/i18n';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <RequireRole roles={['TEACHER']}>
      {(me) => (
        <AdultShell me={me} nav={[{ href: '/teacher', label: t('nav.classes') }]}>
          {children}
        </AdultShell>
      )}
    </RequireRole>
  );
}
