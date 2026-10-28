'use client';

import { LOCALE_NAMES, LOCALES, type Locale } from '@engame/localization';
import { useEffect, useRef, type ReactNode } from 'react';
import { isApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 font-bold text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-sun-400" aria-hidden />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t, error: msg } = useI18n();
  const details = isApiError(error) && Array.isArray(error.details) ? (error.details as { where?: string; path?: string; message: string }[]) : null;
  return (
    <div role="alert" className="rounded-2xl bg-berry-400/10 p-4 font-bold text-berry-600 ring-1 ring-berry-400/40">
      <p className="font-semibold">{msg(error)}</p>
      {details && (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {details.map((d, i) => (
            <li key={i}>
              {d.where ?? d.path ? <span className="font-mono">{d.where ?? d.path}: </span> : null}
              {d.message}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button className="btn-ghost btn-sm mt-3" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}

export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return <p className="rounded-[26px] bg-slate-50 p-6 text-center font-bold text-slate-500 ring-1 ring-slate-200">{children ?? t('common.empty')}</p>;
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{children}</h1>
      {action}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-berry-600">{error}</span>}
    </label>
  );
}

const LOCALE_SHORT: Record<Locale, string> = { kk: 'ҚАЗ', ru: 'РУС', en: 'ENG' };

/** Segmented ҚАЗ / РУС / ENG pill from the Night-sky design. */
export function LocaleSwitcher({ persist = false }: { persist?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t('common.language')} className="inline-flex gap-0.5 rounded-full bg-slate-100 p-1">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          title={LOCALE_NAMES[l]}
          onClick={() => setLocale(l, { persist })}
          className={`rounded-full px-2.5 py-1 text-xs font-extrabold transition sm:px-3 sm:text-[13px] ${locale === l ? 'bg-white text-night' : 'text-slate-500 hover:text-slate-900'}`}
        >
          {LOCALE_SHORT[l]}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} className={`${wide ? 'w-[min(96vw,64rem)]' : 'w-[min(92vw,32rem)]'} max-h-[90dvh] rounded-3xl p-0 shadow-2xl text-slate-800 ring-1 ring-white/10 backdrop:bg-night/70 backdrop:backdrop-blur-sm`}>
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-black">{title}</h2>
          <button aria-label="×" className="rounded-full px-2 text-2xl leading-none text-slate-400 hover:text-slate-700" onClick={onClose}>
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Stat({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[20px] bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <div>
        <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-2xl font-black text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, label, color = 'bg-sun-400' }: { value: number; max: number; label?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span aria-label={`${n}/${of}`} className="tracking-tight">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? 'text-sun-400 drop-shadow-[0_0_8px_rgb(247_204_75/0.8)]' : 'text-slate-300'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}
