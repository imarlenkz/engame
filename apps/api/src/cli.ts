import 'reflect-metadata';
import { getPrisma } from '@engame/database';
import { createInterface } from 'node:readline/promises';
import { hashPassword } from './auth/password';

const USAGE = `Usage:
  node dist/cli.js create-admin <email> <display name>   (password from ADMIN_PASSWORD or prompt)
  node dist/cli.js set-role <email|imarlen-sub> <ADMIN|TEACHER|PARENT>
  node dist/cli.js purge-sessions                        (delete expired and revoked sessions)`;

async function readPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const pw = await rl.question('Password (min 12 chars): ');
  rl.close();
  return pw;
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  const prisma = getPrisma();
  try {
    switch (cmd) {
      case 'create-admin': {
        const [email, ...name] = args;
        if (!email || !/^\S+@\S+\.\S+$/.test(email) || name.length === 0) throw new Error(USAGE);
        const password = await readPassword();
        if (password.length < 12) throw new Error('Admin password must be at least 12 characters');
        const user = await prisma.user.upsert({
          where: { email: email.toLowerCase() },
          update: { role: 'ADMIN', passwordHash: await hashPassword(password), status: 'ACTIVE' },
          create: {
            email: email.toLowerCase(),
            displayName: name.join(' '),
            role: 'ADMIN',
            passwordHash: await hashPassword(password),
          },
        });
        await prisma.auditLog.create({
          data: { action: 'cli.create_admin', entity: 'user', entityId: user.id },
        });
        console.log(`Admin ready: ${user.email} (${user.id})`);
        break;
      }
      case 'set-role': {
        const [who, role] = args;
        if (!who || !role || !['ADMIN', 'TEACHER', 'PARENT'].includes(role)) throw new Error(USAGE);
        const user = await prisma.user.findFirst({
          where: who.includes('@') ? { email: who.toLowerCase() } : { idpSub: who },
        });
        if (!user) throw new Error(`No user ${who}`);
        await prisma.user.update({
          where: { id: user.id },
          data: { role: role as 'ADMIN' | 'TEACHER' | 'PARENT' },
        });
        await prisma.session.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await prisma.auditLog.create({
          data: { action: 'cli.set_role', entity: 'user', entityId: user.id, meta: { role } },
        });
        console.log(`${who} is now ${role}; their sessions were signed out.`);
        break;
      }
      case 'purge-sessions': {
        const { count } = await prisma.session.deleteMany({
          where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] },
        });
        console.log(`Deleted ${count} sessions`);
        break;
      }
      default:
        throw new Error(USAGE);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
