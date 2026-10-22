import argon2 from 'argon2';

const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export const hashPassword = (plain: string) => argon2.hash(plain, OPTIONS);

export async function verifyPassword(hash: string | null | undefined, plain: string): Promise<boolean> {
  if (!hash) {
    // Spend comparable time so missing accounts are not distinguishable by timing.
    await argon2.hash(plain, OPTIONS);
    return false;
  }
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
