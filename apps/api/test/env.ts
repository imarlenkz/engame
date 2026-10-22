// Loaded before every test file (vitest setupFiles): configuration for an in-process API.
process.env.NODE_ENV = 'test';
process.env.APP_ORIGIN = 'http://localhost:3000';
// Set by global-setup for this run's throwaway database.
process.env.DATABASE_URL = process.env.ENGAME_TEST_DB_URL;
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://127.0.0.1:6379/15';
process.env.APP_SECRET = 'test-secret-test-secret-test-secret-0123';
process.env.STORAGE_DRIVER = 'local';
process.env.STORAGE_LOCAL_DIR = process.env.TEST_STORAGE_DIR ?? '/tmp/engame-test-uploads';
process.env.LOG_LEVEL = 'error';
process.env.METRICS_TOKEN = 'metrics-test-token';
delete process.env.OIDC_ISSUER;
delete process.env.SPEECH_PROVIDER;
