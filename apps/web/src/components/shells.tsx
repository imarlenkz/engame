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
    <Link href={href} aria-current={active ? 'page' : undefined} className={`whitespace-nowrap rounded-full px-3.5 py-2 font-extrabold transition ${active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}>
      {children}
    </Link>
  );
}

/** Glowing «En» star + wordmark. */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <Link href="/" className="flex items-center gap-2.5 font-black text-slate-900">
      <span aria-hidden className={`orb-star ${lg ? 'h-9 w-9 text-sm' : 'h-8 w-8 text-xs'}`}>
        En
      </span>
      <span className={lg ? 'text-[23px]' : 'text-xl'}>EnGame</span>
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
    <div className="sky min-h-dvh bg-fixed pb-24 lg:pb-0">
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-night/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Logo />
          <nav className="hidden gap-1 lg:flex" aria-label="main">
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
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <nav aria-label="tabs" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-white/[0.08] bg-night/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {tabs.map((tab) => {
          const active = tab.exact ? path === tab.href : path.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-xs font-extrabold ${active ? 'text-star' : 'text-slate-500'}`}>
              <span className={`text-2xl transition ${active ? 'drop-shadow-[0_0_10px_rgb(247_204_75/0.7)]' : 'opacity-80'}`} aria-hidden>
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

export function AdultShell({
  me,
  nav,
  children,
  wide = false,
  day = false,
}: {
  me: Me;
  nav: { href: string; label: string; exact?: boolean }[];
  children: ReactNode;
  wide?: boolean;
  /** Light admin palette instead of the night sky. */
  day?: boolean;
}) {
  const { t } = useI18n();
  const signOut = useSignOut();
  return (
    <div className={`min-h-dvh ${day ? 'theme-day' : 'bg-[#0f0d2a]'}`}>
      <header className={`sticky top-0 z-20 border-b ${day ? 'border-slate-200 bg-white' : 'border-white/[0.08] bg-night/80 backdrop-blur-md'}`}>
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
