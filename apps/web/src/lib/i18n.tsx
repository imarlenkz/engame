'use client';

import { DEFAULT_LOCALE, isLocale, negotiateLocale, pickText, translate, type Locale, type LocalizedText, type MessageKey } from '@engame/localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, isApiError } from './api';

const COOKIE = 'eg_locale';

interface I18n {
  locale: Locale;
  setLocale(locale: Locale, opts?: { persist?: boolean }): void;
  t(key: MessageKey | (string & {}), vars?: Record<string, string | number>): string;
  pick(text: LocalizedText | string | null | undefined): string;
  /** Message for an API error code, falling back to a generic one. */
  error(err: unknown): string;
}

const Ctx = createContext<I18n | null>(null);

export function readLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|;\s*)eg_locale=([^;]+)/);
  return m && isLocale(m[1]) ? m[1] : null;
}

export function I18nProvider({ initial, children }: { initial: Locale | null; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initial ?? DEFAULT_LOCALE);

  useEffect(() => {
    if (!initial) setLocaleState(negotiateLocale(navigator.languages ?? [navigator.language]));
  }, [initial]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale, opts: { persist?: boolean } = {}) => {
    setLocaleState(next);
    document.cookie = `${COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    if (opts.persist) api('/auth/locale', { method: 'PUT', body: { locale: next } }).catch(() => undefined);
  }, []);

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      pick: (text) => pickText(text, locale),
      error: (err) => {
        if (isApiError(err)) {
          if (err.code === 'NETWORK') return translate(locale, 'errors.network');
          const key = `errors.${err.code}`;
          const msg = translate(locale, key);
          return msg === key ? translate(locale, 'errors.generic') : msg;
        }
        return translate(locale, 'errors.generic');
      },
    }),
    [locale, setLocale],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside I18nProvider');
  return v;
}
