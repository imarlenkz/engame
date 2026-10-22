import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@engame/database';
import { Errors } from '../common/errors';
import { safeEqual } from '../common/crypto';
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, type AuthedRequest } from './auth.types';
import { IS_PUBLIC, PARENT_MODE, ROLES } from './decorators';
import { SessionService } from './session.service';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Global guard: session cookie → req.auth, CSRF on writes, role checks, parent-mode lock. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    const targets = [ctx.getHandler(), ctx.getClass()];
    const resolved = await this.sessions.resolve(req.cookies?.[SESSION_COOKIE]);
    if (resolved) req.auth = resolved;

    // CSRF: any state-changing request made with a session cookie must echo the CSRF cookie in a header.
    if (resolved && !SAFE_METHODS.has(req.method)) {
      const header = req.header(CSRF_HEADER) ?? '';
      const cookie = req.cookies?.[CSRF_COOKIE] ?? '';
      if (!cookie || !safeEqual(header, cookie)) throw Errors.forbidden('CSRF token missing or invalid');
    }

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;
    if (!resolved) throw Errors.unauthorized();

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.includes(resolved.user.role)) throw Errors.forbidden();

    if (this.reflector.getAllAndOverride<boolean>(PARENT_MODE, targets)) {
      const { session } = resolved;
      const locked =
        session.activeChildId != null && !(session.parentModeUntil && session.parentModeUntil > new Date());
      if (locked) throw Errors.badRequest('PARENT_MODE_LOCKED', 'Enter the parent PIN to continue');
    }
    return true;
  }
}
