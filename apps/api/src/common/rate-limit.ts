import { CanActivate, ExecutionContext, Inject, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type Redis from 'ioredis';
import { REDIS } from '../infra/infra.module';
import { Errors } from './errors';

export interface RateLimitRule {
  /** Bucket name; requests share a bucket per client IP (and per user when signed in). */
  name: string;
  limit: number;
  windowSec: number;
}

const RATE_LIMIT = 'rateLimit';
export const RateLimit = (rule: RateLimitRule) => SetMetadata(RATE_LIMIT, rule);

const DEFAULT_RULE: RateLimitRule = { name: 'api', limit: 120, windowSec: 60 };

/** Fixed-window counter in Redis, shared by all API instances. */
export async function hit(
  redis: Redis,
  key: string,
  limit: number,
  windowSec: number,
): Promise<number | null> {
  const k = `rl:${key}`;
  const count = await redis.incr(k);
  if (count === 1) await redis.expire(k, windowSec);
  if (count > limit) {
    const ttl = await redis.ttl(k);
    return ttl > 0 ? ttl : windowSec;
  }
  return null;
}

export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const rule =
      this.reflector.getAllAndOverride<RateLimitRule | undefined>(RATE_LIMIT, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? DEFAULT_RULE;
    const req = ctx.switchToHttp().getRequest<Request & { auth?: { user: { id: string } } }>();
    const who = req.auth?.user.id ?? clientIp(req);
    const retry = await hit(this.redis, `${rule.name}:${who}`, rule.limit, rule.windowSec);
    if (retry != null) throw Errors.tooMany(retry);
    return true;
  }
}
