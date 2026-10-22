import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.service';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { AuditModule } from './common/audit';
import { GamesModule } from './games/games.module';
import { HealthModule, MetricsMiddleware } from './health/health.module';
import { InfraModule } from './infra/infra.module';
import { LearningModule } from './learning/learning.module';
import { MediaModule } from './media/media.module';
import { ProgressModule } from './progress/progress.module';
import { SpeechModule } from './speech/speech.module';
import { SyncModule } from './sync/sync.module';
import { TeacherModule } from './teacher/teacher.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        genReqId: (req, res) => {
          const incoming = req.headers['x-request-id'];
          const id = typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
          res.setHeader('X-Request-Id', id);
          return id;
        },
        // Never log cookies, auth headers, or bodies (children's data, audio).
        redact: {
          paths: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.headers["x-csrf-token"]',
            'res.headers["set-cookie"]',
          ],
          remove: true,
        },
        autoLogging: {
          ignore: (req) =>
            req.url === '/api/v1/health' || req.url === '/api/v1/ready' || req.url === '/api/v1/metrics',
        },
      },
    }),
    InfraModule,
    AuditModule,
    AnalyticsModule,
    MediaModule,
    AuthModule,
    LearningModule,
    GamesModule,
    ProgressModule,
    ChildrenModule,
    TeacherModule,
    SyncModule,
    SpeechModule,
    AdminModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*path');
  }
}
