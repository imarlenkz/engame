'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Suspense, useState, type FormEvent } from 'react';
import { ErrorBox, Field, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Me } from '@/lib/types';
import { AuthScreen, ImarlenButton, OrDivider, safeNext, useAuthOptions } from '@/components/auth';

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
      <div className="w-full space-y-4">
        <h2 className="text-[26px] font-black">{t('auth.signUp')}</h2>
        <p className="text-slate-600">{t('auth.registrationClosed')}</p>
        {options.idp && <ImarlenButton next={next} />}
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="mb-6 text-[26px] font-black">{t('auth.signUp')}</h2>
      {options?.idp && (
        <>
          <ImarlenButton next={next} />
          <OrDivider />
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
        <label className="flex items-start gap-3 text-sm font-bold text-slate-600">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-star" checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} required />
          <span>
            {t('auth.acceptTerms')} (
            <Link href="/terms" className="text-lilac underline" target="_blank">
              {t('landing.termsLink')}
            </Link>
            ,{' '}
            <Link href="/privacy" className="text-lilac underline" target="_blank">
              {t('landing.privacyLink')}
            </Link>
            )
          </span>
        </label>
        {error ? <ErrorBox error={error} /> : null}
        <button className="btn-primary w-full py-4 text-lg" disabled={busy || !form.acceptTerms}>
          {t('auth.signUp')}
        </button>
      </form>
      <p className="mt-6 text-[15px] font-bold text-slate-500">
        {t('auth.haveAccount')}{' '}
        <Link href="/login" className="font-black text-lilac hover:text-white">
          {t('auth.signIn')}
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useI18n();
  return (
    <AuthScreen title={t('auth.joinTitle')} subtitle={t('auth.joinSub')}>
      <Suspense fallback={<Spinner />}>
        <RegisterForm />
      </Suspense>
    </AuthScreen>
  );
}
