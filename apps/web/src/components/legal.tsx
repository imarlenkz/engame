'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { Logo } from './shells';
import { LocaleSwitcher } from './ui';

export interface LegalText {
  title: string;
  updated: string;
  intro: string;
  sections: { h: string; p: string[] }[];
}

/** Night-sky layout shared by the Privacy and Terms pages. */
export function LegalPage({ text }: { text: LegalText }) {
  const { t } = useI18n();
  return (
    <div className="sky min-h-dvh px-4 pb-16 text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 py-6">
        <Logo size="lg" />
        <LocaleSwitcher />
      </header>
      <main className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-black tracking-[-0.03em] sm:text-5xl">{text.title}</h1>
        <p className="mt-2 text-sm font-bold text-slate-500">{text.updated}</p>
        <p className="mt-6 text-lg font-bold leading-relaxed text-slate-600">{text.intro}</p>
        <nav className="mt-8 flex flex-wrap gap-2" aria-label={text.title}>
          {text.sections.map((s, i) => (
            <a key={s.h} href={`#s${i + 1}`} className="chip text-sm hover:bg-white/15">
              {i + 1}. {s.h}
            </a>
          ))}
        </nav>
        <div className="mt-8 space-y-4">
          {text.sections.map((s, i) => (
            <section key={s.h} id={`s${i + 1}`} className="card scroll-mt-6 p-6 sm:p-8">
              <h2 className="flex items-center gap-3 text-xl font-black sm:text-2xl">
                <span className="orb-star h-8 w-8 font-mono text-xs">{i + 1}</span>
                {s.h}
              </h2>
              <div className="mt-3 space-y-2.5">
                {s.p.map((p) => (
                  <p key={p} className="font-bold leading-relaxed text-slate-600">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <footer className="mt-10 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-4 text-sm font-bold text-slate-400">
          <Link href="/" className="hover:text-white">
            ← EnGame
          </Link>
          <span className="flex gap-5">
            <Link href="/terms" className="hover:text-white">
              {t('landing.termsLink')}
            </Link>
            <Link href="/privacy" className="hover:text-white">
              {t('landing.privacyLink')}
            </Link>
          </span>
        </footer>
      </main>
    </div>
  );
}
