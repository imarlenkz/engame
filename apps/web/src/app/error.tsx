'use client';

import { useI18n } from '@/lib/i18n';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl" aria-hidden>
        🙈
      </div>
      <h1 className="text-xl font-extrabold">{t('errors.generic')}</h1>
      <button className="btn-primary" onClick={reset}>
        {t('common.retry')}
      </button>
    </div>
  );
}
