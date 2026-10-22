import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AgeGroup, Role, User } from '@engame/database';
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { createHash } from 'node:crypto';
import { ENV, type Env } from '../config/env';
import { randomToken, signPayload, verifyPayload } from '../common/crypto';
import { Errors } from '../common/errors';
import { PrismaService } from '../infra/infra.module';

interface Discovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

/** Claims from iMARLEN ID (see imarlen-id INTEGRATION.md). */
export interface IdpClaims {
  sub: string;
  name?: string;
  preferred_username?: string;
  role?: 'student' | 'teacher' | 'parent' | 'school_admin' | 'platform_owner';
  school?: { id: string; name: string; code: string } | null;
  class_name?: string | null;
  children?: { sub: string; name?: string; preferred_username?: string; class_name?: string | null }[];
  email?: string;
}

interface OidcState {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  exp: number;
}

const ROLE_MAP: Record<NonNullable<IdpClaims['role']>, Role> = {
  student: 'CHILD',
  parent: 'PARENT',
  teacher: 'TEACHER',
  school_admin: 'ADMIN',
  platform_owner: 'ADMIN',
};

/** Rough age group from a Kazakh school class name like "1А" or "4Б". */
export function ageGroupFromClass(className?: string | null): AgeGroup {
  const grade = Number.parseInt(className ?? '', 10);
  if (!Number.isFinite(grade) || grade <= 0) return 'AGE_6_7';
  if (grade === 1) return 'AGE_6_7';
  if (grade <= 3) return 'AGE_8_9';
  return 'AGE_10_11';
}

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private discovery?: { value: Discovery; at: number };
  private jwks?: JWTVerifyGetKey;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  get enabled(): boolean {
    return Boolean(this.env.OIDC_ISSUER && this.env.OIDC_CLIENT_ID && this.env.OIDC_CLIENT_SECRET);
  }

  get redirectUri(): string {
    return `${this.env.APP_ORIGIN}/api/v1/auth/idp/callback`;
  }

  private async config(): Promise<Discovery> {
    if (!this.enabled) throw Errors.badRequest('IDP_DISABLED', 'iMARLEN ID login is not configured');
    if (this.discovery && Date.now() - this.discovery.at < 3_600_000) return this.discovery.value;
    const res = await fetch(`${this.env.OIDC_ISSUER}/.well-known/openid-configuration`);
    if (!res.ok) throw Errors.badRequest('IDP_UNAVAILABLE', `Discovery failed: ${res.status}`);
    const value = (await res.json()) as Discovery;
    this.discovery = { value, at: Date.now() };
    this.jwks = createRemoteJWKSet(new URL(value.jwks_uri));
    return value;
  }

  /** Builds the authorize URL and the signed state cookie value. */
  async start(returnTo: string): Promise<{ url: string; cookie: string }> {
    const cfg = await this.config();
    const state: OidcState = {
      state: randomToken(16),
      nonce: randomToken(16),
      verifier: randomToken(32),
      returnTo: returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/',
      exp: Date.now() + 10 * 60_000,
    };
    const challenge = createHash('sha256').update(state.verifier).digest('base64url');
    const url = new URL(cfg.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: this.env.OIDC_CLIENT_ID!,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state: state.state,
      nonce: state.nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString();
    return { url: url.toString(), cookie: signPayload(this.env.APP_SECRET, state) };
  }

  /** Validates the callback, exchanges the code and returns verified claims. */
  async finish(params: { code?: string; state?: string; error?: string }, cookie: string | undefined) {
    if (params.error) throw Errors.badRequest('IDP_DENIED', params.error);
    const saved = cookie ? verifyPayload<OidcState>(this.env.APP_SECRET, cookie) : null;
    if (!saved || saved.exp < Date.now() || saved.state !== params.state || !params.code) {
      throw Errors.badRequest('IDP_STATE_INVALID', 'Login session expired, please try again');
    }
    const cfg = await this.config();
    const tokenRes = await fetch(cfg.token_endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${this.env.OIDC_CLIENT_ID}:${this.env.OIDC_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: this.redirectUri,
        code_verifier: saved.verifier,
      }),
    });
    if (!tokenRes.ok) {
      this.logger.warn({ status: tokenRes.status }, 'Token exchange failed');
      throw Errors.badRequest('IDP_TOKEN_FAILED', 'Could not complete sign-in');
    }
    const tokens = (await tokenRes.json()) as { id_token: string; access_token: string };
    const { payload } = await jwtVerify(tokens.id_token, this.jwks!, {
      issuer: cfg.issuer,
      audience: this.env.OIDC_CLIENT_ID,
    });
    if (payload.nonce !== saved.nonce) throw Errors.badRequest('IDP_NONCE_INVALID', 'Login session expired');

    const infoRes = await fetch(cfg.userinfo_endpoint, {
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) throw Errors.badRequest('IDP_USERINFO_FAILED', 'Could not read your profile');
    const claims = (await infoRes.json()) as IdpClaims;
    if (claims.sub !== payload.sub)
      throw Errors.badRequest('IDP_SUB_MISMATCH', 'Profile does not match sign-in');
    return { claims, returnTo: saved.returnTo, logoutUrl: cfg.end_session_endpoint ?? null };
  }

  logoutUrl(): string | null {
    if (!this.enabled || !this.discovery?.value.end_session_endpoint) return null;
    const url = new URL(this.discovery.value.end_session_endpoint);
    url.search = new URLSearchParams({
      client_id: this.env.OIDC_CLIENT_ID!,
      post_logout_redirect_uri: `${this.env.APP_ORIGIN}/`,
    }).toString();
    return url.toString();
  }

  /** Just-in-time provisioning: find by idp_sub, link by email once, else create. Refreshes role/name each login. */
  async provision(claims: IdpClaims): Promise<User> {
    const role = ROLE_MAP[claims.role ?? 'parent'] ?? 'PARENT';
    // Children are identified by login only; their real name is not stored.
    const displayName =
      role === 'CHILD'
        ? (claims.preferred_username ?? 'Learner')
        : (claims.name ?? claims.preferred_username ?? 'User');
    const email = role === 'CHILD' ? null : (claims.email?.toLowerCase() ?? null);

    return this.prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { idpSub: claims.sub } });
      if (!user && email) {
        const local = await tx.user.findUnique({ where: { email } });
        if (local && !local.idpSub)
          user = await tx.user.update({ where: { id: local.id }, data: { idpSub: claims.sub } });
      }
      if (!user) {
        user = await tx.user.create({ data: { idpSub: claims.sub, email, role, displayName } });
      } else {
        user = await tx.user.update({ where: { id: user.id }, data: { role, displayName } });
      }

      if (role === 'CHILD') {
        await tx.childProfile.upsert({
          where: { userId: user.id },
          update: { ageGroup: ageGroupFromClass(claims.class_name) },
          create: {
            userId: user.id,
            nickname: displayName.slice(0, 40),
            ageGroup: ageGroupFromClass(claims.class_name),
          },
        });
      }
      if (role === 'TEACHER') {
        await tx.teacherProfile.upsert({
          where: { userId: user.id },
          update: { schoolName: claims.school?.name ?? null, schoolCode: claims.school?.code ?? null },
          create: {
            userId: user.id,
            schoolName: claims.school?.name ?? null,
            schoolCode: claims.school?.code ?? null,
          },
        });
      }
      if (role === 'PARENT') {
        await tx.parentProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
        for (const c of claims.children ?? []) {
          let childUser = await tx.user.findUnique({
            where: { idpSub: c.sub },
            include: { childProfile: true },
          });
          if (!childUser) {
            const nickname = c.preferred_username ?? 'Learner';
            childUser = await tx.user.create({
              data: {
                idpSub: c.sub,
                role: 'CHILD',
                displayName: nickname,
                childProfile: {
                  create: { nickname: nickname.slice(0, 40), ageGroup: ageGroupFromClass(c.class_name) },
                },
              },
              include: { childProfile: true },
            });
          }
          if (childUser.childProfile) {
            await tx.guardianship.upsert({
              where: { parentId_childId: { parentId: user.id, childId: childUser.childProfile.id } },
              update: {},
              create: { parentId: user.id, childId: childUser.childProfile.id },
            });
          }
        }
      }
      return user;
    });
  }
}
