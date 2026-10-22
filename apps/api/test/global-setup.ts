import { PrismaClient } from '@engame/database';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Integration tests run against real Postgres and Redis. Each run creates its own throwaway database
 * (never touching an existing one), applies migrations, seeds it, and drops it afterwards.
 */
export default async function setup() {
  const base = new URL(process.env.TEST_DATABASE_URL ?? 'postgresql://postgres@127.0.0.1:5432/postgres');
  const name = `engame_test_${Date.now()}_${process.pid}`;
  const admin = new PrismaClient({ datasourceUrl: base.toString() });
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);

  const url = new URL(base);
  url.pathname = `/${name}`;
  process.env.ENGAME_TEST_DB_URL = url.toString();
  const db = resolve(__dirname, '../../../packages/database');
  const env = { ...process.env, DATABASE_URL: url.toString() };
  execSync('pnpm exec prisma migrate deploy', { cwd: db, env, stdio: 'pipe' });
  execSync('pnpm exec tsx prisma/seed.ts', { cwd: db, env, stdio: 'pipe' });

  return async () => {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$disconnect();
  };
}
