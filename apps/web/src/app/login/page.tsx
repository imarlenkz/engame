'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useState, type FormEvent } from 'react';
import { Logo } from '@/components/shells';
import { ErrorBox, Field, LocaleSwitcher, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { homeFor } from '@/lib/session';
import type { Me } from '@/lib/types';
import { ImarlenButton, safeNext, useAuthOptions } from '@/components/auth';

function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const next = safeNext(params.get('next'));
  const idpError = params.get('error');
  const { data: options } = useAuthOptions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(idpError ? new ApiError(400, idpError, idpError) : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/login', { body: { email, password } });
      const me = await api<Me>('/auth/me');
      qc.setQueryData(['me'], me);
      router.replace(next ?? homeFor(me));
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <div className="card w-full max-w-md">
      <h1 className="mb-6 text-2xl font-extrabold">{t('auth.signIn')}</h1>
      {options?.idp && (
        <>
          <ImarlenButton next={next} />
          <div className="my-5 flex items-center gap-3 text-sm text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {t('auth.or')}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}
      <form onSubmit={submit} className="space-y-4">
        <Field label={t('auth.email')}>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label={t('auth.password')}>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error ? <ErrorBox error={error} /> : null}
        <button className="btn-primary w-full" disabled={busy}>
          {t('auth.signIn')}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {options?.localRegistration === false ? (
          t('auth.registrationClosed')
        ) : (
          <>
            {t('auth.noAccount')}{' '}
            <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="font-bold text-brand-600 underline">
              {t('auth.signUp')}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-sky-50 px-4">
      <header className="flex w-full max-w-md items-center justify-between py-6">
        <Logo />
        <LocaleSwitcher />
      </header>
      <Suspense fallback={<Spinner />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
