'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useState, type FormEvent } from 'react';
import { Logo } from '@/components/shells';
import { ErrorBox, Field, LocaleSwitcher, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Me } from '@/lib/types';
import { ImarlenButton, safeNext, useAuthOptions } from '@/components/auth';

function RegisterForm() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const next = safeNext(useSearchParams().get('next'));
  const { data: options } = useAuthOptions();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', acceptTerms: false });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/register', { body: { ...form, locale } });
      qc.setQueryData(['me'], await api<Me>('/auth/me'));
      router.replace(next ?? '/parent');
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  if (options && !options.localRegistration) {
    return (
      <div className="card w-full max-w-md space-y-4">
        <h1 className="text-2xl font-extrabold">{t('auth.signUp')}</h1>
        <p className="text-slate-600">{t('auth.registrationClosed')}</p>
        {options.idp && <ImarlenButton next={next} />}
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md">
      <h1 className="mb-6 text-2xl font-extrabold">{t('auth.signUp')}</h1>
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
        <Field label={t('auth.displayName')}>
          <input className="input" autoComplete="name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={80} />
        </Field>
        <Field label={t('auth.email')}>
          <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>
        <Field label={t('auth.password')} hint={t('auth.passwordHint')}>
          <input className="input" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        </Field>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} required />
          <span>
            {t('auth.acceptTerms')} (
            <Link href="/privacy" className="underline" target="_blank">
              Privacy
            </Link>
            )
          </span>
        </label>
        {error ? <ErrorBox error={error} /> : null}
        <button className="btn-primary w-full" disabled={busy || !form.acceptTerms}>
          {t('auth.signUp')}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="font-bold text-brand-600 underline">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-sky-50 px-4 pb-10">
      <header className="flex w-full max-w-md items-center justify-between py-6">
        <Logo />
        <LocaleSwitcher />
      </header>
      <Suspense fallback={<Spinner />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
