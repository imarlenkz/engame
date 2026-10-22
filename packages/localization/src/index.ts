import { en, type MessageKey } from './en';
import { kk } from './kk';
import { ru } from './ru';

export type { MessageKey };
export const LOCALES = ['kk', 'ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'kk';
export const LOCALE_NAMES: Record<Locale, string> = { kk: 'Қазақша', ru: 'Русский', en: 'English' };

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, kk, ru };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** Translates a key, filling {placeholders}. Unknown keys fall back to English, then to the key itself. */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const raw = (MESSAGES[locale] as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : raw;
}

export type LocalizedText = Partial<Record<Locale, string>> & Record<string, string | undefined>;

/** Picks the best text from CMS content: the UI locale, then Kazakh/Russian/English. */
export function pickText(text: LocalizedText | string | null | undefined, locale: Locale): string {
  if (text == null) return '';
  if (typeof text === 'string') return text;
  return text[locale] ?? text.kk ?? text.ru ?? text.en ?? Object.values(text).find(Boolean) ?? '';
}

/** Best locale for a browser's Accept-Language / navigator.languages. */
export function negotiateLocale(preferred: readonly string[]): Locale {
  for (const p of preferred) {
    const base = p.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
