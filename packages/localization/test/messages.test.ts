import { describe, expect, it } from 'vitest';
import { MESSAGES, negotiateLocale, pickText, translate } from '../src';

describe('messages', () => {
  it('keeps placeholders identical across locales', () => {
    const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    for (const [key, value] of Object.entries(MESSAGES.en)) {
      expect(vars(MESSAGES.kk[key as keyof typeof MESSAGES.kk]), `kk ${key}`).toBe(vars(value));
      expect(vars(MESSAGES.ru[key as keyof typeof MESSAGES.ru]), `ru ${key}`).toBe(vars(value));
    }
  });

  it('has no empty translations', () => {
    for (const locale of ['kk', 'ru', 'en'] as const) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) expect(value.trim(), `${locale} ${key}`).not.toBe('');
    }
  });

  it('fills placeholders and falls back sensibly', () => {
    expect(translate('kk', 'play.hello', { name: 'Ару' })).toBe('Сәлем, Ару!');
    expect(translate('ru', 'no.such.key')).toBe('no.such.key');
    expect(pickText({ en: 'Cat', kk: 'Мысық' }, 'ru')).toBe('Мысық');
    expect(pickText({ en: 'Cat' }, 'kk')).toBe('Cat');
    expect(negotiateLocale(['ru-RU', 'en'])).toBe('ru');
    expect(negotiateLocale(['de'])).toBe('kk');
  });
});
