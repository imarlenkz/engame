import { isLocale } from '@engame/localization';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { OfflineBanner } from '@/components/offline-banner';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'EnGame', template: '%s · EnGame' },
  description: 'English phonics for primary school: 44 sounds, letters, blending and reading through play.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icons/icon.svg', apple: '/icons/icon-192.png' },
  appleWebApp: { capable: true, title: 'EnGame', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#337bff',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const raw = (await cookies()).get('eg_locale')?.value;
  const locale = isLocale(raw) ? raw : null;
  return (
    <html lang={locale ?? 'kk'}>
      <body className="min-h-dvh font-sans">
        <Providers locale={locale}>
          <OfflineBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
