import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Role } from '@engame/database';
import type { AuthContext, AuthedRequest } from './auth.types';

export const IS_PUBLIC = 'isPublic';
/** No session needed (login, registration, health, media). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const PARENT_MODE = 'parentMode';
/** Parent-only screens: on a device where a child is playing, the parent must unlock with PIN/password first. */
export const RequireParentMode = () => SetMetadata(PARENT_MODE, true);

export const Auth = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest>();
  if (!req.auth) throw new Error('Auth decorator used on a public route');
  return req.auth;
});

/** The child the request acts for; set by ChildGuard. */
export const ActingChild = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<AuthedRequest & { childId?: string }>();
  if (!req.childId) throw new Error('ActingChild used without ChildGuard');
  return req.childId;
});
