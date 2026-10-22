import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { ENV, type Env } from './config/env';

export const API_PREFIX = 'api/v1';

export async function createApp(opts: { logger?: boolean } = {}) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    logger: opts.logger === false ? false : undefined,
  });
  const env = app.get<Env>(ENV);
  if (opts.logger !== false) app.useLogger(app.get(Logger));

  // Only the configured number of proxy hops is trusted when reading the client IP from X-Forwarded-For.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');
  app.use(
    helmet({
      // The API serves JSON and media only; the web app sets its own CSP.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  // Offline sync batches carry run tokens, so allow more than the 100 kB default.
  app.useBodyParser('json', { limit: '2mb' });
  app.useBodyParser('urlencoded', { extended: false, limit: '100kb' });
  app.use(cookieParser());
  app.enableCors({ origin: env.APP_ORIGIN, credentials: true });
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();
  return { app, env };
}

export function openApiDocument(app: NestExpressApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('EnGame API')
    .setDescription(
      'English phonics for primary-school children. Session cookie auth; writes need the X-CSRF-Token header.',
    )
    .setVersion('1.0')
    .addCookieAuth('eg_sid')
    .build();
  return SwaggerModule.createDocument(app, config);
}
