'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { homeFor, useMe } from '@/lib/session';
import type { Me, Role } from '@/lib/types';
import { ErrorBox, Spinner } from './ui';

/** Client-side routing guard. The API enforces every rule on its own; this only picks the right screen. */
export function RequireRole({ roles, children }: { roles: Role[]; children: (me: Me) => ReactNode }) {
  const { data: me, isLoading, error, refetch } = useMe();
  const router = useRouter();
  const path = usePathname();
  const allowed = me && roles.includes(me.user.role);

  useEffect(() => {
    if (isLoading || error) return;
    if (!me) router.replace(`/login?next=${encodeURIComponent(path)}`);
    else if (!allowed) router.replace(homeFor(me));
  }, [me, isLoading, error, allowed, router, path]);

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorBox error={error} onRetry={() => refetch()} />
      </div>
    );
  }
  if (!me || !allowed) return <Spinner />;
  return <>{children(me)}</>;
}
