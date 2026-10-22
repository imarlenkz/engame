import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

/** Localised text stored in JSON columns. */
export type LocalizedText = { en: string; kk?: string; ru?: string };

let client: PrismaClient | undefined;

/** Process-wide Prisma client; reuse it instead of constructing new ones. */
export function getPrisma(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}
