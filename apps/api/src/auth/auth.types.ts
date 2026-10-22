import type { Role, Session, User } from '@engame/database';
import type { Request } from 'express';

export interface AuthContext {
  user: User;
  session: Session;
}

export type AuthedRequest = Request & { auth?: AuthContext; id?: string };

export const SESSION_COOKIE = 'eg_sid';
export const CSRF_COOKIE = 'eg_csrf';
export const CSRF_HEADER = 'x-csrf-token';
export const OIDC_COOKIE = 'eg_oidc';

export const PARENT_MODE_MINUTES = 15;

export type { Role };
