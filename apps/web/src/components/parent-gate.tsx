'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useRefreshMe } from '@/lib/session';
import type { Me } from '@/lib/types';
import { ErrorBox, Field } from './ui';

/** Unlock form for parent screens while a child profile is active on this device. */
export function ParentUnlock({ me, onUnlocked }: { me: Me; onUnlocked?: () => void }) {
  const { t } = useI18n();
  const refresh = useRefreshMe();
  const [secret, setSecret] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = /^\d{4,6}$/.test(secret) && me.parentMode.hasPin ? { pin: secret } : { password: secret };
      await api('/auth/parent-mode', { body });
      await refresh();
      onUnlocked?.();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-slate-600">{t('parentMode.text')}</p>
      <Field label={me.parentMode.hasPin ? t('parentMode.pin') : t('auth.password')}>
        <input
          className="input text-center text-2xl tracking-widest"
          type="password"
          inputMode={me.parentMode.hasPin ? 'numeric' : 'text'}
          autoComplete={me.parentMode.hasPin ? 'off' : 'current-password'}
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoFocus
          required
        />
      </Field>
      {error ? <ErrorBox error={error} /> : null}
      <button className="btn-primary w-full" disabled={busy || !secret}>
        {t('parentMode.unlock')}
      </button>
    </form>
  );
}

export function ParentGate({ me, children }: { me: Me; children: ReactNode }) {
  const { t } = useI18n();
  if (me.parentMode.active) return <>{children}</>;
  return (
    <div className="mx-auto mt-10 max-w-sm card">
      <h1 className="mb-3 text-2xl font-extrabold">🔒 {t('parentMode.title')}</h1>
      <ParentUnlock me={me} />
    </div>
  );
}
