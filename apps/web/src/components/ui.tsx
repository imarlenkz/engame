'use client';

import { LOCALE_NAMES, LOCALES, type Locale } from '@engame/localization';
import { useEffect, useRef, type ReactNode } from 'react';
import { isApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-brand-200 border-t-brand-500" aria-hidden />
      <span>{label ?? t('common.loading')}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t, error: msg } = useI18n();
  const details = isApiError(error) && Array.isArray(error.details) ? (error.details as { where?: string; path?: string; message: string }[]) : null;
  return (
    <div role="alert" className="rounded-2xl bg-berry-400/10 p-4 text-berry-600 ring-1 ring-berry-400/40">
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
  return <p className="rounded-2xl bg-white/60 p-6 text-center text-slate-500">{children ?? t('common.empty')}</p>;
}

export function PageTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{children}</h1>
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

export function LocaleSwitcher({ persist = false }: { persist?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">{t('common.language')}</span>
      <select
        className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale, { persist })}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
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
    <dialog ref={ref} onClose={onClose} className={`${wide ? 'w-[min(96vw,64rem)]' : 'w-[min(92vw,32rem)]'} max-h-[90dvh] rounded-3xl p-0 shadow-2xl backdrop:bg-slate-900/40`}>
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-extrabold">{title}</h2>
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
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-xl font-extrabold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

export function ProgressBar({ value, max, label, color = 'bg-leaf-500' }: { value: number; max: number; label?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span aria-label={`${n}/${of}`} className="tracking-tight">
      {Array.from({ length: of }, (_, i) => (
        <span key={i} className={i < n ? 'text-sun-500' : 'text-slate-300'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  );
}
