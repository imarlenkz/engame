'use client';

import Link from 'next/link';
import { Dot, Orb, type OrbTone } from '@/components/night';
import { Logo } from '@/components/shells';
import { LocaleSwitcher } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { homeFor, useMe } from '@/lib/session';

/** Hero constellation (positions from the 1200px design, mapped to %). */
const STARS: { g: string; w: string; x: number; y: number; d: number; tone: OrbTone }[] = [
  { g: 'sh', w: 'ship', x: 640, y: 110, d: 130, tone: 'star' },
  { g: 'ee', w: 'tree', x: 880, y: 90, d: 90, tone: 'white' },
  { g: 'a', w: 'apple', x: 1020, y: 230, d: 70, tone: 'mint' },
  { g: 'ch', w: 'chip', x: 780, y: 280, d: 110, tone: 'coral' },
  { g: 'oo', w: 'moon', x: 960, y: 400, d: 120, tone: 'lilac' },
  { g: 's', w: 'sun', x: 640, y: 440, d: 80, tone: 'star' },
  { g: 'th', w: 'thin', x: 1080, y: 560, d: 60, tone: 'white' },
  { g: 'ng', w: 'ring', x: 820, y: 560, d: 74, tone: 'mint' },
  { g: 'ai', w: 'rain', x: 560, y: 250, d: 56, tone: 'white' },
];
const FIELD = { x0: 540, w: 690, h: 660 };

/** The five worlds of the curriculum (names match the seed). */
const WORLDS: { icon: string; tone: OrbTone; key: string; title: Record<'kk' | 'ru' | 'en', string> }[] = [
  { icon: '🌳', tone: 'mint', key: 'landing.w1', title: { en: 'Alphabet Forest', kk: 'Әліпби орманы', ru: 'Алфавитный лес' } },
  { icon: '🏝️', tone: 'lilac', key: 'landing.w2', title: { en: 'Sound Island', kk: 'Дыбыстар аралы', ru: 'Остров звуков' } },
  { icon: '🏰', tone: 'coral', key: 'landing.w3', title: { en: 'Phonics Castle', kk: 'Фоника қамалы', ru: 'Замок фоники' } },
  { icon: '🚀', tone: 'white', key: 'landing.w4', title: { en: 'Word Space', kk: 'Сөздер ғарышы', ru: 'Космос слов' } },
  { icon: '📖', tone: 'star', key: 'landing.w5', title: { en: 'Reading Kingdom', kk: 'Оқу патшалығы', ru: 'Королевство чтения' } },
];

export default function Landing() {
  const { t, locale } = useI18n();
  const { data: me } = useMe();
  const steps: { title: string; text: string; tone: OrbTone }[] = [
    { title: t('landing.s1'), text: t('landing.s1d'), tone: 'star' },
    { title: t('landing.s2'), text: t('landing.s2d'), tone: 'lilac' },
    { title: t('landing.s3'), text: t('landing.s3d'), tone: 'mint' },
    { title: t('landing.s4'), text: t('landing.s4d'), tone: 'coral' },
  ];
  const cta = me ? homeFor(me) : '/register';

  return (
    <div className="sky min-h-dvh overflow-x-hidden text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-8 lg:px-14">
        <Logo size="lg" />
        <div className="flex items-center gap-3 sm:gap-4">
          <LocaleSwitcher />
          {me ? (
            <Link href={homeFor(me)} className="btn-primary btn-sm hidden sm:inline-flex sm:min-h-12 sm:px-6 sm:text-base">
              {t('common.continue')} →
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden font-extrabold text-white hover:text-lilac sm:inline">
                {t('landing.signIn')}
              </Link>
              <Link href="/register" className="btn-primary btn-sm hidden sm:inline-flex sm:min-h-12 sm:px-6 sm:text-base">
                {t('landing.start')}
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        {/* Hero: copy on the left, a constellation of tappable sounds on the right. */}
        <section className="relative mx-auto max-w-6xl px-4 sm:px-8 md:min-h-[620px] lg:px-14">
          <div className="relative z-10 flex flex-col gap-5 pt-8 sm:gap-6 md:w-[46%] md:pt-24 lg:w-[500px]">
            <h1 className="text-[40px] font-black leading-none tracking-[-0.035em] [text-wrap:balance] sm:text-6xl lg:text-[64px]">{t('landing.heroTitle')}</h1>
            <p className="text-lg font-bold leading-relaxed text-slate-600 sm:text-xl">{t('landing.heroSub')}</p>
            <Link href={cta} className="btn-star self-start px-8 py-5 text-xl">
              {me ? `${t('common.continue')} →` : t('landing.heroCta')}
            </Link>
            <span className="text-sm font-bold text-slate-500">🔒 {t('landing.heroNote')}</span>
            {!me && (
              <Link href="/login" className="font-extrabold text-lilac sm:hidden">
                {t('landing.signIn')} →
              </Link>
            )}
          </div>

          <div
            className="relative mt-6 h-[340px] [--k:0.62] sm:h-[460px] sm:[--k:0.82] md:absolute md:inset-y-0 md:right-0 md:mt-0 md:h-[620px] md:w-[56%] md:[--k:0.85] lg:[--k:1]"
            aria-label={t('landing.heroHint')}
          >
            {STARS.map((s, i) => (
              <Orb
                key={s.g + s.w}
                tone={s.tone}
                size={0}
                word={s.w}
                label={`${s.g} — ${s.w}`}
                className="absolute animate-twinkle"
                style={{
                  left: `${((s.x - FIELD.x0) / FIELD.w) * 100}%`,
                  top: `${(s.y / FIELD.h) * 100}%`,
                  width: `calc(${s.d}px * var(--k))`,
                  height: `calc(${s.d}px * var(--k))`,
                  fontSize: `calc(${Math.round(s.d * 0.38)}px * var(--k))`,
                  animationDelay: `${i * 0.37}s`,
                }}
              >
                {s.g}
              </Orb>
            ))}
          </div>
          <p className="mt-2 text-right text-sm font-extrabold text-slate-500 md:absolute md:bottom-2 md:right-14 md:mt-0">{t('landing.heroHint')}</p>
        </section>

        {/* One lesson, four steps */}
        <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-14 sm:px-8 lg:px-14">
          <h2 className="text-4xl font-black leading-[1.05] tracking-[-0.03em] sm:text-[44px]">{t('landing.stepsTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="card flex flex-row items-start gap-5 p-6 lg:flex-col lg:gap-10">
                <Orb tone={s.tone} size={44} className="font-mono text-sm font-bold">
                  0{i + 1}
                </Orb>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-[26px] font-black">{s.title}</h3>
                  <p className="font-bold leading-snug text-slate-600">{s.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Numbers */}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ['44', 'landing.statSounds', 'text-star'],
                ['26', 'landing.statLetters', 'text-lilac'],
                ['250+', 'landing.statWords', 'text-mint'],
                ['8', 'landing.statGames', 'text-coral'],
                ['3', 'landing.statLangs', 'text-white'],
              ] as const
            ).map(([n, key, color]) => (
              <div key={key} className="rounded-[22px] bg-white/[0.04] px-5 py-4 ring-1 ring-white/10">
                <dt className="sr-only">{t(key)}</dt>
                <dd className={`text-4xl font-black tracking-tight ${color}`}>{n}</dd>
                <dd className="text-sm font-extrabold text-slate-500">{t(key)}</dd>
              </div>
            ))}
          </dl>

          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className="card flex flex-col justify-between gap-6 p-8">
              <div className="flex flex-col gap-2.5">
                <span className="kicker">{t('landing.mapKicker')}</span>
                <h3 className="text-2xl font-black leading-tight sm:text-[28px]">{t('landing.mapTitle')}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-3" lang="en">
                {(
                  [
                    ['p', 'star', 'pig'],
                    ['m', 'star', 'map'],
                    ['sh', 'star', 'ship'],
                    ['th', 'coral', 'thin'],
                    ['r', 'coral', 'red'],
                    ['ee', 'lilac', 'tree'],
                    ['oa', 'ahead', 'boat'],
                    ['ure', 'ahead', 'cure'],
                  ] as [string, OrbTone, string][]
                ).map(([g, tone, w]) => (
                  <Orb key={g} tone={tone} size={56} word={w} className="text-xl">
                    {g}
                  </Orb>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-sm font-extrabold text-slate-600">
                <span className="flex items-center gap-2">
                  <Dot tone="star" /> {t('sounds.known')}
                </span>
                <span className="flex items-center gap-2">
                  <Dot tone="coral" /> {t('sounds.review')}
                </span>
                <span className="flex items-center gap-2">
                  <Dot tone="ahead" /> {t('sounds.ahead')}
                </span>
              </div>
            </div>
            <div className="card flex flex-col justify-between gap-8 p-8">
              <div className="flex flex-col gap-2.5">
                <span className="kicker">{t('landing.parentKicker')}</span>
                <h3 className="text-2xl font-black leading-tight sm:text-[28px]">{t('landing.parentTitle')}</h3>
              </div>
              <Link href={me ? homeFor(me) : '/register'} className="font-black text-lilac hover:text-white">
                {t('landing.parentLink')}
              </Link>
            </div>
          </div>

          {/* Five worlds */}
          <div className="mt-8 flex flex-col gap-2.5">
            <span className="kicker">{t('landing.worldsKicker')}</span>
            <h2 className="text-3xl font-black leading-[1.05] tracking-[-0.03em] sm:text-[40px]">{t('landing.worldsTitle')}</h2>
          </div>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {WORLDS.map((w, i) => (
              <li key={w.key} className="card relative flex flex-col gap-3 p-5">
                <span className="absolute right-5 top-5 font-mono text-xs font-bold text-slate-400">0{i + 1}</span>
                <Orb tone={w.tone} size={52} className="text-2xl">
                  {w.icon}
                </Orb>
                <h3 className="text-lg font-black leading-tight">{w.title[locale]}</h3>
                <p className="text-sm font-bold leading-snug text-slate-600">{t(w.key)}</p>
              </li>
            ))}
          </ol>

          {/* Who it is for */}
          <h2 className="mt-8 text-3xl font-black tracking-[-0.03em] sm:text-[40px]">{t('landing.forKicker')}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ['🧒', 'landing.forKidsTitle', 'landing.forKidsText', 'star'],
                ['👨‍👩‍👧', 'landing.forParentsTitle', 'landing.forParentsText', 'lilac'],
                ['🧑‍🏫', 'landing.forTeachersTitle', 'landing.forTeachersText', 'mint'],
              ] as const
            ).map(([icon, title, text, tone]) => (
              <div key={title} className="card flex flex-col gap-4 p-7">
                <Orb tone={tone} size={56} className="text-2xl">
                  {icon}
                </Orb>
                <h3 className="text-2xl font-black">{t(title)}</h3>
                <p className="font-bold leading-relaxed text-slate-600">{t(text)}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <h2 className="mt-8 text-3xl font-black tracking-[-0.03em] sm:text-[40px]">{t('landing.faqTitle')}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {([1, 2, 3, 4, 5, 6] as const).map((n) => (
              <details key={n} className="card group p-0 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-lg font-black">
                  {t(`landing.q${n}`)}
                  <span aria-hidden className="orb-lilac h-8 w-8 shrink-0 text-lg transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-6 pb-6 font-bold leading-relaxed text-slate-600">{t(`landing.a${n}`)}</p>
              </details>
            ))}
          </div>

          {/* Final call to action */}
          <div className="relative mt-8 overflow-hidden rounded-[30px] bg-white/[0.05] px-6 py-12 text-center ring-1 ring-white/10 sm:px-12">
            <Orb tone="star" size={90} className="mx-auto mb-6 text-3xl shadow-glow-lg">
              En
            </Orb>
            <h2 className="text-3xl font-black tracking-[-0.03em] sm:text-[44px]">{t('landing.finalTitle')}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg font-bold text-slate-600">{t('landing.finalText')}</p>
            <Link href={cta} className="btn-star mt-8 px-8 py-5 text-xl">
              {me ? `${t('common.continue')} →` : t('landing.heroCta')}
            </Link>
          </div>

          <footer className="flex flex-wrap justify-between gap-3 border-t border-white/10 pt-4 text-sm font-bold text-slate-400">
            <span>© {new Date().getFullYear()} iMARLEN</span>
            <span className="flex gap-5">
              <Link href="/terms" className="hover:text-white">
                {t('landing.termsLink')}
              </Link>
              <Link href="/privacy" className="hover:text-white">
                {t('landing.privacyLink')}
              </Link>
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}
