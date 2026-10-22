import {
  Controller,
  Get,
  Header,
  Inject,
  Injectable,
  Module,
  Req,
  Res,
  type NestMiddleware,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import type Redis from 'ioredis';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';
import { Public } from '../auth/decorators';
import { safeEqual } from '../common/crypto';
import { Errors } from '../common/errors';
import { ENV, type Env } from '../config/env';
import { PrismaService, REDIS } from '../infra/infra.module';
import { STORAGE, type StorageProvider } from '../media/storage';

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry, prefix: 'engame_' });
const httpDuration = new Histogram({
  name: 'engame_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

/** Records request latency by route pattern (never by raw URL, which would leak ids into labels). */
@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const end = httpDuration.startTimer();
    res.on('finish', () => {
      const route = (req.route as { path?: string } | undefined)?.path ?? 'unmatched';
      end({ method: req.method, route, status: String(res.statusCode) });
    });
    next();
  }
}

async function timed<T>(fn: () => Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(STORAGE) private readonly storage: StorageProvider,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Liveness: the process is up. */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok', uptimeSec: Math.round(process.uptime()) };
  }

  /** Readiness: dependencies answer. Used by Docker healthchecks and the deploy script. */
  @Public()
  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const checks: Record<string, 'ok' | 'fail'> = {};
    const run = async (name: string, fn: () => Promise<unknown>) => {
      try {
        await timed(fn);
        checks[name] = 'ok';
      } catch {
        checks[name] = 'fail';
      }
    };
    await Promise.all([
      run('database', () => this.prisma.$queryRaw`SELECT 1`),
      run('redis', () => this.redis.ping()),
      run('storage', async () => {
        if (!(await this.storage.ping())) throw new Error('storage');
      }),
    ]);
    const ok = Object.values(checks).every((c) => c === 'ok');
    if (!ok) res.status(503);
    return { status: ok ? 'ready' : 'degraded', checks };
  }

  /** Prometheus metrics; requires `Authorization: Bearer $METRICS_TOKEN`. Disabled when the token is unset. */
  @Public()
  @ApiExcludeEndpoint()
  @Get('metrics')
  @Header('Content-Type', metricsRegistry.contentType)
  async metrics(@Req() req: Request) {
    const token = this.env.METRICS_TOKEN;
    const given = req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    if (!token || !safeEqual(given, token)) throw Errors.notFound('Route');
    return metricsRegistry.metrics();
  }
}

@Module({ controllers: [HealthController], providers: [MetricsMiddleware] })
export class HealthModule {}
