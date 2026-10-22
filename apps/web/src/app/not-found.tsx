'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl" aria-hidden>
        🧭
      </div>
      <h1 className="text-2xl font-extrabold">{t('errors.notFoundPage')}</h1>
      <Link href="/" className="btn-primary">
        {t('lesson.home')}
      </Link>
    </div>
  );
}
