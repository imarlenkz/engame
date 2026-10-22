'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { RequireRole } from '@/components/guard';
import { ChildShell } from '@/components/shells';
import { Spinner } from '@/components/ui';
import type { Me } from '@/lib/types';

function NeedsChild({ me, children }: { me: Me; children: ReactNode }) {
  const router = useRouter();
  const missing = me.user.role === 'PARENT' && !me.activeChildId;
  useEffect(() => {
    if (missing) router.replace('/parent');
  }, [missing, router]);
  if (missing) return <Spinner />;
  return <ChildShell me={me}>{children}</ChildShell>;
}

export default function PlayLayout({ children }: { children: ReactNode }) {
  return <RequireRole roles={['CHILD', 'PARENT']}>{(me) => <NeedsChild me={me}>{children}</NeedsChild>}</RequireRole>;
}
