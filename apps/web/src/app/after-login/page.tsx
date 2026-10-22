'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui';
import { homeFor, useMe } from '@/lib/session';

/** Landing spot after iMARLEN ID sign-in: sends each role to its home screen. */
export default function AfterLogin() {
  const { data: me, isLoading } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading) router.replace(homeFor(me));
  }, [me, isLoading, router]);
  return <Spinner />;
}
