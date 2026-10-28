'use client';

import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { Orb } from './night';
import { Logo } from './shells';
import { LocaleSwitcher } from './ui';

export interface AuthOptions {
  localRegistration: boolean;
  idp: { name: string } | null;
}

export function useAuthOptions() {
  return useQuery({ queryKey: ['auth-options'], queryFn: () => api<AuthOptions>('/auth/options'), staleTime: 300_000 });
}

/** Only same-site relative paths are followed after sign-in. */
/** Only same-site paths: browsers read `//host` and `/\\host` as other sites. */
export function safeNext(next: string | null): string | null {
  return next && /^\/(?![/\\])[^\s\\]*$/.test(next) ? next : null;
}

export function ImarlenButton({ next }: { next: string | null }) {
  const { t } = useI18n();
  return (
    <a className="btn w-full bg-lilac text-night shadow-glow-sm shadow-lilac/40 hover:bg-white" href={`/api/v1/auth/idp/login?returnTo=${encodeURIComponent(next ?? '/after-login')}`}>
      <span aria-hidden>🪪</span> {t('auth.withImarlen')}
    </a>
  );
}


/** Split «night sky» screen from the design: greeting + glowing stars on the left, the form on the right. */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="sky grid min-h-dvh text-white md:grid-cols-2">
      <section className="relative flex flex-col justify-between gap-10 overflow-hidden px-4 pb-6 pt-6 sm:px-10 md:px-14 md:py-12">
        <div className="flex items-center justify-between gap-3">
          <Logo size="lg" />
          <div className="md:hidden">
            <LocaleSwitcher />
          </div>
        </div>
        <div aria-hidden className="pointer-events-none relative hidden h-72 md:block">
          <Orb tone="star" size={130} className="absolute left-[52%] top-0 text-[52px] shadow-glow-lg">
            ch
          </Orb>
          <Orb tone="lilac" size={70} className="absolute left-[30%] top-[62%] text-[28px]">
            oa
          </Orb>
          <Orb tone="mint" size={44} className="absolute left-[80%] top-[70%] text-base">
            s
          </Orb>
        </div>
        <div className="flex flex-col gap-3 md:gap-4">
          <h1 className="text-4xl font-black leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-[54px]">{title}</h1>
          <p className="text-lg font-bold text-slate-600 md:text-[19px]">{subtitle}</p>
        </div>
      </section>
      <section className="flex flex-col justify-center gap-6 px-4 pb-12 sm:px-10 md:px-16 md:py-12">
        <div className="hidden justify-end md:flex">
          <LocaleSwitcher />
        </div>
        <div className="w-full max-w-md md:mx-0">{children}</div>
      </section>
    </div>
  );
}

/** «or» divider between iMARLEN ID and the email form. */
export function OrDivider() {
  const { t } = useI18n();
  return (
    <div className="my-6 flex items-center gap-3 text-sm font-bold text-slate-400">
      <span className="h-px flex-1 bg-white/15" />
      {t('auth.or')}
      <span className="h-px flex-1 bg-white/15" />
    </div>
  );
}
