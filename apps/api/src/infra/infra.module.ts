import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@engame/database';
import Redis from 'ioredis';
import { ENV, loadEnv, type Env } from '../config/env';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
  }
}

export const REDIS = Symbol('REDIS');

@Injectable()
export class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}
  async onModuleDestroy() {
    await this.redis.quit().catch(() => undefined);
  }
}

@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: () => loadEnv() },
    PrismaService,
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: (env: Env) => new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false }),
    },
    RedisLifecycle,
  ],
  exports: [ENV, PrismaService, REDIS],
})
export class InfraModule {}
