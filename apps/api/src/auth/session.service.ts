import { Inject, Injectable } from '@nestjs/common';
import type { Session, User } from '@engame/database';
import type { CookieOptions, Response } from 'express';
import { ENV, type Env } from '../config/env';
import { randomToken, sha256 } from '../common/crypto';
import { PrismaService } from '../infra/infra.module';
import { CSRF_COOKIE, SESSION_COOKIE } from './auth.types';

const TOUCH_INTERVAL_MS = 5 * 60_000;

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private get secure() {
    return this.env.APP_ORIGIN.startsWith('https://');
  }

  cookieOptions(maxAgeMs: number, httpOnly = true): CookieOptions {
    return { httpOnly, secure: this.secure, sameSite: 'lax', path: '/', maxAge: maxAgeMs };
  }

  async create(user: User, res: Response, userAgent?: string): Promise<Session> {
    const token = randomToken();
    const ttlMs = this.env.SESSION_TTL_DAYS * 86_400_000;
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        userAgent: userAgent?.slice(0, 200),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
    });
    res.cookie(SESSION_COOKIE, token, this.cookieOptions(ttlMs));
    this.issueCsrf(res);
    return session;
  }

  issueCsrf(res: Response): string {
    const csrf = randomToken(24);
    // Readable by the page so it can echo it in the X-CSRF-Token header (double-submit).
    res.cookie(CSRF_COOKIE, csrf, this.cookieOptions(this.env.SESSION_TTL_DAYS * 86_400_000, false));
    return csrf;
  }

  async resolve(token: string | undefined): Promise<{ session: Session; user: User } | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.status !== 'ACTIVE')
      return null;
    if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      // Sliding expiry, written at most every few minutes.
      const ttlMs = this.env.SESSION_TTL_DAYS * 86_400_000;
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(), expiresAt: new Date(Date.now() + ttlMs) },
      });
    }
    const { user, ...rest } = session;
    return { session: rest, user };
  }

  async revoke(sessionId: string, res: Response) {
    await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
