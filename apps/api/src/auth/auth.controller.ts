import { Controller, Get, HttpCode, Inject, Post, Put, Query, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type Redis from 'ioredis';
import { z } from 'zod';
import { AnalyticsService } from '../analytics/analytics.service';
import { ENV, type Env } from '../config/env';
import { Errors } from '../common/errors';
import { RateLimit, clientIp, hit } from '../common/rate-limit';
import { ZodBody, type Infer } from '../common/zod';
import { PrismaService, REDIS } from '../infra/infra.module';
import { OIDC_COOKIE, PARENT_MODE_MINUTES, type AuthContext } from './auth.types';
import { Auth, Public, Roles } from './decorators';
import { OidcService } from './oidc.service';
import { hashPassword, verifyPassword } from './password';
import { SessionService } from './session.service';

const LOCALES = ['kk', 'ru', 'en'] as const;
const CONSENT_VERSION = '2026-10';

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(80),
  locale: z.enum(LOCALES).default('kk'),
  acceptTerms: z.literal(true),
});
const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});
const ParentModeSchema = z.object({
  pin: z
    .string()
    .regex(/^\d{4,6}$/)
    .optional(),
  password: z.string().max(200).optional(),
});
const PinSchema = z.object({ pin: z.string().regex(/^\d{4,6}$/) });
const LocaleSchema = z.object({ locale: z.enum(LOCALES) });

const MAX_FAILED = 10;
const LOCK_MINUTES = 15;

export function publicUser(user: {
  id: string;
  role: string;
  displayName: string;
  email: string | null;
  locale: string;
  idpSub: string | null;
}) {
  return {
    id: user.id,
    role: user.role,
    displayName: user.displayName,
    email: user.email,
    locale: user.locale,
    viaIdp: Boolean(user.idpSub),
  };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly oidc: OidcService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Public()
  @Get('options')
  options() {
    return {
      localRegistration: this.env.AUTH_LOCAL_REGISTRATION,
      idp: this.oidc.enabled ? { name: 'iMARLEN ID' } : null,
    };
  }

  @Public()
  @Get('csrf')
  csrf(@Res({ passthrough: true }) res: Response) {
    return { csrfToken: this.sessions.issueCsrf(res) };
  }

  @Public()
  @RateLimit({ name: 'register', limit: 5, windowSec: 3600 })
  @Post('register')
  async register(
    @ZodBody(RegisterSchema) body: Infer<typeof RegisterSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!this.env.AUTH_LOCAL_REGISTRATION) throw Errors.forbidden('Registration is done through iMARLEN ID');
    if (await this.prisma.user.findUnique({ where: { email: body.email } })) {
      throw Errors.conflict('EMAIL_TAKEN', 'An account with this email already exists');
    }
    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password),
        displayName: body.displayName,
        role: 'PARENT',
        locale: body.locale,
        parentProfile: { create: {} },
      },
    });
    await this.sessions.create(user, res, req.header('user-agent'));
    await this.analytics.track(
      'user_registered',
      { userId: user.id },
      { method: 'password', consentVersion: CONSENT_VERSION },
    );
    return { user: publicUser(user) };
  }

  @Public()
  @RateLimit({ name: 'login', limit: 10, windowSec: 60 })
  @HttpCode(200)
  @Post('login')
  async login(
    @ZodBody(LoginSchema) body: Infer<typeof LoginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Per-account limiter on top of the per-IP one, so distributed guessing of one account is slowed too.
    const retry = await hit(this.redis, `login-account:${body.email}`, 20, 900);
    if (retry != null) throw Errors.tooMany(retry);

    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      throw Errors.badRequest('ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.', {
        retryAfterSec: Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000),
      });
    }
    const ok = await verifyPassword(user?.passwordHash, body.password);
    if (!user || !ok || user.status !== 'ACTIVE') {
      if (user) {
        const failed = user.failedLogins + 1;
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLogins: failed >= MAX_FAILED ? 0 : failed,
            lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : undefined,
          },
        });
      }
      throw Errors.badRequest('INVALID_CREDENTIALS', 'Wrong email or password');
    }
    await this.sessions.create(user, res, req.header('user-agent'));
    await this.analytics.track('user_logged_in', { userId: user.id }, { method: 'password' });
    return { user: publicUser(user) };
  }

  @Public()
  @Get('idp/login')
  async idpLogin(@Query('returnTo') returnTo: string | undefined, @Res() res: Response) {
    const { url, cookie } = await this.oidc.start(returnTo ?? '/');
    res.cookie(OIDC_COOKIE, cookie, {
      ...this.sessions.cookieOptions(10 * 60_000),
      path: '/api/v1/auth/idp',
    });
    res.redirect(302, url);
  }

  @Public()
  @Get('idp/callback')
  async idpCallback(
    @Query() query: { code?: string; state?: string; error?: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.clearCookie(OIDC_COOKIE, { path: '/api/v1/auth/idp' });
    try {
      const { claims, returnTo } = await this.oidc.finish(query, req.cookies?.[OIDC_COOKIE]);
      const existed = await this.prisma.user.count({ where: { idpSub: claims.sub } });
      const user = await this.oidc.provision(claims);
      await this.sessions.create(user, res, req.header('user-agent'));
      await this.analytics.track(
        existed ? 'user_logged_in' : 'user_registered',
        { userId: user.id },
        { method: 'imarlen_id' },
      );
      res.redirect(302, `${this.env.APP_ORIGIN}${returnTo}`);
    } catch (err) {
      const code = (err as { code?: string }).code ?? 'IDP_FAILED';
      res.redirect(302, `${this.env.APP_ORIGIN}/login?error=${encodeURIComponent(code)}`);
    }
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Auth() auth: AuthContext, @Res({ passthrough: true }) res: Response) {
    await this.sessions.revoke(auth.session.id, res);
    return { ok: true, idpLogoutUrl: auth.user.idpSub ? this.oidc.logoutUrl() : null };
  }

  @Get('me')
  async me(@Auth() auth: AuthContext) {
    const { session, user } = auth;
    const child =
      user.role === 'CHILD'
        ? await this.prisma.childProfile.findUnique({ where: { userId: user.id } })
        : null;
    const parentModeActive =
      session.activeChildId == null ||
      Boolean(session.parentModeUntil && session.parentModeUntil > new Date());
    const parentHasPin =
      user.role === 'PARENT'
        ? Boolean((await this.prisma.parentProfile.findUnique({ where: { userId: user.id } }))?.pinHash)
        : false;
    return {
      user: publicUser(user),
      activeChildId: user.role === 'CHILD' ? (child?.id ?? null) : session.activeChildId,
      parentMode: { active: parentModeActive, hasPin: parentHasPin },
    };
  }

  @Put('locale')
  async setLocale(@Auth() auth: AuthContext, @ZodBody(LocaleSchema) body: Infer<typeof LocaleSchema>) {
    await this.prisma.user.update({ where: { id: auth.user.id }, data: { locale: body.locale } });
    return { locale: body.locale };
  }

  /** Unlock parent screens on a device where a child is playing. */
  @Roles('PARENT')
  @RateLimit({ name: 'parent-mode', limit: 10, windowSec: 300 })
  @HttpCode(200)
  @Post('parent-mode')
  async unlockParentMode(
    @Auth() auth: AuthContext,
    @ZodBody(ParentModeSchema) body: Infer<typeof ParentModeSchema>,
    @Req() req: Request,
  ) {
    const profile = await this.prisma.parentProfile.findUnique({ where: { userId: auth.user.id } });
    let ok = false;
    if (body.pin && profile?.pinHash) ok = await verifyPassword(profile.pinHash, body.pin);
    else if (body.password && auth.user.passwordHash)
      ok = await verifyPassword(auth.user.passwordHash, body.password);
    if (!ok) {
      const retry = await hit(this.redis, `parent-mode-fail:${auth.user.id}:${clientIp(req)}`, 5, 900);
      if (retry != null) throw Errors.tooMany(retry);
      throw Errors.badRequest('INVALID_PIN', 'Wrong PIN');
    }
    const until = new Date(Date.now() + PARENT_MODE_MINUTES * 60_000);
    await this.prisma.session.update({ where: { id: auth.session.id }, data: { parentModeUntil: until } });
    return { parentModeUntil: until };
  }

  /** Return the device to the child (locks parent screens again). */
  @Roles('PARENT')
  @HttpCode(200)
  @Post('parent-mode/lock')
  async lockParentMode(@Auth() auth: AuthContext) {
    await this.prisma.session.update({ where: { id: auth.session.id }, data: { parentModeUntil: null } });
    return { ok: true };
  }

  @Roles('PARENT')
  @Put('parent/pin')
  async setPin(@Auth() auth: AuthContext, @ZodBody(PinSchema) body: Infer<typeof PinSchema>) {
    const session = auth.session;
    if (session.activeChildId && !(session.parentModeUntil && session.parentModeUntil > new Date())) {
      throw Errors.badRequest('PARENT_MODE_LOCKED', 'Enter the parent PIN to continue');
    }
    await this.prisma.parentProfile.upsert({
      where: { userId: auth.user.id },
      update: { pinHash: await hashPassword(body.pin) },
      create: { userId: auth.user.id, pinHash: await hashPassword(body.pin) },
    });
    return { ok: true };
  }
}
