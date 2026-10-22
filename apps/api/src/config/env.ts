import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    /** Public origin of the site, e.g. https://engame.imarlen.kz. Used for CORS, cookies and OIDC redirects. */
    APP_ORIGIN: z.string().url(),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    /** 32+ random bytes; signs lesson run tokens, CSRF tokens and the OIDC state cookie. */
    APP_SECRET: z.string().min(32),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    /**
     * Reverse proxies in front of the API that append to X-Forwarded-For. Production: host nginx + the
     * compose gateway = 2. Getting this wrong makes every visitor share one rate-limit bucket.
     */
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    TIMEZONE: z.string().default('Asia/Almaty'),

    AUTH_LOCAL_REGISTRATION: bool.default('true'),

    // iMARLEN ID (OpenID Connect). Login through it is enabled when all three are set.
    OIDC_ISSUER: z.string().url().optional(),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),

    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('/data/uploads'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    /** Public base URL for media when served from a CDN/bucket; defaults to /api/v1/media. */
    MEDIA_PUBLIC_URL: z.string().optional(),

    /** Speech provider for pronunciation scoring: none | whisper. Browser speech needs no server config. */
    SPEECH_PROVIDER: z.enum(['none', 'whisper']).default('none'),
    SPEECH_API_URL: z.string().url().optional(),
    SPEECH_API_KEY: z.string().optional(),
    SPEECH_MODEL: z.string().default('whisper-1'),

    METRICS_TOKEN: z.string().optional(),
    SWAGGER_PUBLIC: bool.default('false'),
  })
  .superRefine((env, ctx) => {
    const oidc = [env.OIDC_ISSUER, env.OIDC_CLIENT_ID, env.OIDC_CLIENT_SECRET].filter(Boolean).length;
    if (oidc !== 0 && oidc !== 3) {
      ctx.addIssue({
        code: 'custom',
        message: 'Set all of OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET or none',
      });
    }
    if (env.STORAGE_DRIVER === 's3' && !(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY)) {
      ctx.addIssue({
        code: 'custom',
        message: 'STORAGE_DRIVER=s3 needs S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY',
      });
    }
    if (env.SPEECH_PROVIDER === 'whisper' && !(env.SPEECH_API_URL && env.SPEECH_API_KEY)) {
      ctx.addIssue({
        code: 'custom',
        message: 'SPEECH_PROVIDER=whisper needs SPEECH_API_URL and SPEECH_API_KEY',
      });
    }
  });

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Docker Compose passes unset optional variables as empty strings; treat those as not set.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v.trim() !== ''));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || 'env'}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment:\n  ${issues}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');
