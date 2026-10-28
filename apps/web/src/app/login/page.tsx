'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useState, type FormEvent } from 'react';
import { ErrorBox, Field, Spinner } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { homeFor } from '@/lib/session';
import type { Me } from '@/lib/types';
import { AuthScreen, ImarlenButton, OrDivider, safeNext, useAuthOptions } from '@/components/auth';

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
    <div className="w-full">
      <h2 className="mb-6 text-[26px] font-black">{t('auth.signIn')}</h2>
      {options?.idp && (
        <>
          <ImarlenButton next={next} />
          <OrDivider />
        </>
      )}
      <form onSubmit={submit} className="space-y-5">
        <Field label={t('auth.email')}>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label={t('auth.password')}>
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error ? <ErrorBox error={error} /> : null}
        <button className="btn-primary w-full py-4 text-lg" disabled={busy}>
          {t('auth.signIn')}
        </button>
      </form>
      <p className="mt-6 text-[15px] font-bold text-slate-500">
        {options?.localRegistration === false ? (
          t('auth.registrationClosed')
        ) : (
          <>
            {t('auth.noAccount')}{' '}
            <Link href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'} className="font-black text-lilac hover:text-white">
              {t('auth.signUp')}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  const { t } = useI18n();
  return (
    <AuthScreen title={t('auth.helloTitle')} subtitle={t('auth.helloSub')}>
      <Suspense fallback={<Spinner />}>
        <LoginForm />
      </Suspense>
    </AuthScreen>
  );
}
