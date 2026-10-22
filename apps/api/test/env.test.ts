import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env';

const base = {
  APP_ORIGIN: 'https://engame.imarlen.kz',
  DATABASE_URL: 'postgresql://u:p@db:5432/engame',
  REDIS_URL: 'redis://redis:6379',
  APP_SECRET: 'x'.repeat(40),
};

describe('loadEnv', () => {
  it('treats empty strings from docker compose as unset', () => {
    const env = loadEnv({ ...base, OIDC_ISSUER: '', OIDC_CLIENT_ID: '', OIDC_CLIENT_SECRET: '', SPEECH_API_URL: '', METRICS_TOKEN: '' });
    expect(env.OIDC_ISSUER).toBeUndefined();
    expect(env.METRICS_TOKEN).toBeUndefined();
    expect(env.SPEECH_PROVIDER).toBe('none');
  });

  it('rejects a half-configured OIDC client and a short secret', () => {
    expect(() => loadEnv({ ...base, OIDC_ISSUER: 'https://id.imarlen.kz' })).toThrow(/OIDC_ISSUER, OIDC_CLIENT_ID/);
    expect(() => loadEnv({ ...base, APP_SECRET: 'short' })).toThrow(/APP_SECRET/);
  });

  it('needs credentials when the Whisper provider is chosen', () => {
    expect(() => loadEnv({ ...base, SPEECH_PROVIDER: 'whisper' })).toThrow(/SPEECH_API_URL/);
  });
});
