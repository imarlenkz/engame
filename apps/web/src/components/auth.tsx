'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export interface AuthOptions {
  localRegistration: boolean;
  idp: { name: string } | null;
}

export function useAuthOptions() {
  return useQuery({ queryKey: ['auth-options'], queryFn: () => api<AuthOptions>('/auth/options'), staleTime: 300_000 });
}

/** Only same-site relative paths are followed after sign-in. */
export function safeNext(next: string | null): string | null {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
}

export function ImarlenButton({ next }: { next: string | null }) {
  const { t } = useI18n();
  return (
    <a className="btn w-full bg-slate-900 text-white hover:bg-slate-800" href={`/api/v1/auth/idp/login?returnTo=${encodeURIComponent(next ?? '/after-login')}`}>
      <span aria-hidden>🪪</span> {t('auth.withImarlen')}
    </a>
  );
}

