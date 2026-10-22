'use client';

import Link from 'next/link';
import { Logo } from '@/components/shells';
import { LocaleSwitcher } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { homeFor, useMe } from '@/lib/session';

export default function Landing() {
  const { t } = useI18n();
  const { data: me } = useMe();
  const features = [
    { icon: '🔤', title: t('landing.f1.title'), text: t('landing.f1.text') },
    { icon: '⏱️', title: t('landing.f2.title'), text: t('landing.f2.text') },
    { icon: '🧠', title: t('landing.f3.title'), text: t('landing.f3.text') },
    { icon: '👨‍👩‍👧', title: t('landing.f4.title'), text: t('landing.f4.text') },
  ];
  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-100 to-sky-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <LocaleSwitcher />
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="grid items-center gap-8 py-10 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-black leading-tight text-slate-900 sm:text-5xl">{t('landing.title')}</h1>
            <p className="mt-4 text-lg text-slate-600">{t('landing.subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {me ? (
                <Link href={homeFor(me)} className="btn-primary">
                  {t('common.continue')} →
                </Link>
              ) : (
                <>
                  <Link href="/register" className="btn-primary">
                    {t('landing.start')}
                  </Link>
                  <Link href="/login" className="btn-ghost">
                    {t('landing.signIn')}
                  </Link>
                </>
              )}
            </div>
            <p className="mt-6 text-sm text-slate-500">🔒 {t('landing.privacy')}</p>
          </div>
          <div aria-hidden className="grid grid-cols-3 gap-3 text-center">
            {['s', 'a', 't', 'p', 'i', 'n', 'sh', 'ee', 'ch'].map((g, i) => (
              <div key={g} className={`card flex aspect-square items-center justify-center text-4xl font-black ${['text-brand-500', 'text-leaf-600', 'text-berry-500', 'text-sun-500'][i % 4]}`}>
                {g}
              </div>
            ))}
          </div>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card">
              <div className="text-3xl" aria-hidden>
                {f.icon}
              </div>
              <h2 className="mt-2 text-lg font-extrabold">{f.title}</h2>
              <p className="mt-1 text-slate-600">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        <Link href="/privacy" className="underline">
          Privacy
        </Link>{' '}
        · © {new Date().getFullYear()} iMARLEN
      </footer>
    </div>
  );
}
