'use client';

import type { Locale } from '@engame/localization';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { isApiError } from '@/lib/api';
import { I18nProvider } from '@/lib/i18n';
import { syncOutbox } from '@/lib/offline';

export function Providers({ locale, children }: { locale: Locale | null; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (count, err) => count < 2 && !(isApiError(err) && err.status >= 400 && err.status < 500),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => undefined);
    }
    const flush = () => {
      if (navigator.onLine) syncOutbox().catch(() => undefined);
    };
    flush();
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);

  return (
    <QueryClientProvider client={client}>
      <I18nProvider initial={locale}>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
