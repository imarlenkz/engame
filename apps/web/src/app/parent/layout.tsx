'use client';

import type { ReactNode } from 'react';
import { RequireRole } from '@/components/guard';
import { ParentGate } from '@/components/parent-gate';
import { AdultShell } from '@/components/shells';
import { useI18n } from '@/lib/i18n';

export default function ParentLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <RequireRole roles={['PARENT']}>
      {(me) => (
        <AdultShell me={me} nav={[{ href: '/parent', label: t('nav.children') }]}>
          <ParentGate me={me}>{children}</ParentGate>
        </AdultShell>
      )}
    </RequireRole>
  );
}
