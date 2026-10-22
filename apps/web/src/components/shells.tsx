'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { clearOfflineData } from '@/lib/offline';
import { forgetMe } from '@/lib/session';
import type { Me } from '@/lib/types';
import { ParentUnlock } from './parent-gate';
import { LocaleSwitcher, Modal } from './ui';

function useSignOut() {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    // Offline work is flushed while the session is still valid, then wiped.
    await clearOfflineData().catch(() => undefined);
    const res = await api<{ idpLogoutUrl: string | null }>('/auth/logout', { method: 'POST' }).catch(() => ({ idpLogoutUrl: null }));
    qc.clear();
    forgetMe();
    if (res.idpLogoutUrl) window.location.href = res.idpLogoutUrl;
    else router.replace('/login');
  };
}

function NavLink({ href, children, exact = false }: { href: string; children: ReactNode; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(`${href}/`);
  return (
    <Link href={href} aria-current={active ? 'page' : undefined} className={`rounded-xl px-3 py-2 font-semibold ${active ? 'bg-brand-100 text-brand-800' : 'text-slate-600 hover:bg-slate-100'}`}>
      {children}
    </Link>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-black text-brand-600">
      <span aria-hidden>🔤</span> EnGame
    </Link>
  );
}

/** Child area: big bottom tab bar on phones, top bar on tablets/desktop. */
export function ChildShell({ me, children }: { me: Me; children: ReactNode }) {
  const { t } = useI18n();
  const router = useRouter();
  const signOut = useSignOut();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const tabs = [
    { href: '/play', icon: '🏠', label: t('nav.home'), exact: true },
    { href: '/play/learn', icon: '🗺️', label: t('nav.learn') },
    { href: '/play/games', icon: '🎮', label: t('nav.games') },
    { href: '/play/progress', icon: '📈', label: t('nav.progress') },
    { href: '/play/awards', icon: '🏆', label: t('nav.awards') },
  ];
  const path = usePathname();
  return (
    <div className="min-h-dvh pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Logo />
          <nav className="hidden gap-1 sm:flex" aria-label="main">
            {tabs.map((tab) => (
              <NavLink key={tab.href} href={tab.href} exact={tab.exact}>
                <span aria-hidden>{tab.icon}</span> {tab.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            {me.user.role === 'PARENT' ? (
              <button className="btn-ghost btn-sm" onClick={() => (me.parentMode.active ? router.push('/parent') : setUnlockOpen(true))}>
                🔒 <span className="hidden md:inline">{t('play.parentArea')}</span>
              </button>
            ) : (
              <button className="btn-ghost btn-sm" onClick={signOut}>
                {t('common.signOut')}
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
      <nav aria-label="tabs" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white sm:hidden">
        {tabs.map((tab) => {
          const active = tab.exact ? path === tab.href : path.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center py-2 text-xs font-bold ${active ? 'text-brand-600' : 'text-slate-500'}`}>
              <span className="text-2xl" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Modal open={unlockOpen} onClose={() => setUnlockOpen(false)} title={t('parentMode.title')}>
        <ParentUnlock
          me={me}
          onUnlocked={() => {
            setUnlockOpen(false);
            router.push('/parent');
          }}
        />
      </Modal>
    </div>
  );
}

export function AdultShell({ me, nav, children, wide = false }: { me: Me; nav: { href: string; label: string; exact?: boolean }[]; children: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  const signOut = useSignOut();
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className={`mx-auto flex ${wide ? 'max-w-7xl' : 'max-w-5xl'} flex-wrap items-center justify-between gap-3 px-4 py-2`}>
          <div className="flex items-center gap-4">
            <Logo />
            <nav className="flex flex-wrap gap-1" aria-label="main">
              {nav.map((n) => (
                <NavLink key={n.href} href={n.href} exact={n.exact}>
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-slate-500 md:inline">{me.user.displayName}</span>
            <LocaleSwitcher persist />
            <button className="btn-ghost btn-sm" onClick={signOut}>
              {t('common.signOut')}
            </button>
          </div>
        </div>
      </header>
      <main className={`mx-auto ${wide ? 'max-w-7xl' : 'max-w-5xl'} px-4 py-6`}>{children}</main>
    </div>
  );
}
