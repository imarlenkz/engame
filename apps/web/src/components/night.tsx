'use client';

import type { CSSProperties, ReactNode } from 'react';
import { playMedia } from '@/lib/audio';

/** Night-sky palette (from the «Түнгі аспан» design). */
export const SKY = {
  night: '#0d0b26',
  star: '#f7cc4b',
  coral: '#fb8371',
  mint: '#59d38c',
  lilac: '#cfd6ff',
  white: '#ffffff',
} as const;

export type OrbTone = 'star' | 'coral' | 'mint' | 'lilac' | 'white' | 'ahead';

const TONE_CLASS: Record<OrbTone, string> = {
  star: 'orb-star',
  coral: 'orb-coral',
  mint: 'orb-mint',
  lilac: 'orb-lilac',
  white: 'orb-white',
  ahead: 'orb-ahead',
};

/** A glowing round «star» with a grapheme inside. Tapping it says the example word. */
export function Orb({
  tone,
  size,
  children,
  word,
  onClick,
  className = '',
  style,
  label,
  pressed,
}: {
  tone: OrbTone;
  size: number;
  children: ReactNode;
  word?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  label?: string;
  pressed?: boolean;
}) {
  const interactive = Boolean(word || onClick);
  const css: CSSProperties = { width: size, height: size, ...style };
  const cls = `${TONE_CLASS[tone]} ${interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : ''} ${className}`;
  if (!interactive) {
    return (
      <span className={cls} style={css} aria-hidden>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      lang="en"
      aria-label={label ?? word}
      aria-pressed={pressed}
      className={cls}
      style={css}
      onClick={() => {
        if (word) void playMedia({ speak: word });
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

/** Small glowing dot used in legends and pills. */
export function Dot({ tone }: { tone: OrbTone }) {
  if (tone === 'ahead') return <span aria-hidden className="inline-block h-3 w-3 rounded-full border-[1.5px] border-white/40" />;
  return <span aria-hidden className={`inline-block h-3 w-3 rounded-full ${TONE_CLASS[tone]}`} />;
}

/** Pill with a glowing dot, e.g. «🔥 5 күн қатарынан». */
export function GlowPill({ tone, children }: { tone: OrbTone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-[15px] font-black text-white">
      <Dot tone={tone} />
      {children}
    </span>
  );
}

/** Lesson progress: four labelled segments (done = star, current = white, ahead = dim). */
export function StepBar({ labels, current }: { labels: string[]; current: number }) {
  return (
    <div className="grid flex-1 gap-2.5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((label, i) => (
        <div key={i} className="flex min-w-0 flex-col gap-1.5">
          <div className={`h-2 rounded ${i < current ? 'bg-star' : i === current ? 'bg-white' : 'bg-white/[0.14]'}`} />
          <span className={`hidden truncate text-[13px] font-extrabold sm:block ${i <= current ? 'text-white' : 'text-slate-500'}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}
