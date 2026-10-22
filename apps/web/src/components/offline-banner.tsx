'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

export function OfflineBanner() {
  const { t } = useI18n();
  const [state, setState] = useState<'online' | 'offline' | 'back'>('online');

  useEffect(() => {
    if (!navigator.onLine) setState('offline');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = () => setState('offline');
    const on = () => {
      setState('back');
      timer = setTimeout(() => setState('online'), 4000);
    };
    window.addEventListener('offline', off);
    window.addEventListener('online', on);
    return () => {
      window.removeEventListener('offline', off);
      window.removeEventListener('online', on);
      clearTimeout(timer);
    };
  }, []);

  if (state === 'online') return null;
  return (
    <div role="status" className={`px-4 py-2 text-center text-sm font-semibold ${state === 'offline' ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-900'}`}>
      {t(state === 'offline' ? 'common.offline' : 'common.backOnline')}
    </div>
  );
}
