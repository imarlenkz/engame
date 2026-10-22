import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors';

/** Every error leaves the API as { error: { code, message, requestId, details? } }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const requestId = String(req.id ?? '');

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Something went wrong';
    let details: unknown;

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_FAILED';
      message = 'Invalid request';
      details = exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    } else if (exception instanceof AppError) {
      status = exception.getStatus();
      const body = exception.getResponse() as { code: string; message: string; details?: unknown };
      code = body.code;
      message = body.message;
      details = body.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      code = HttpStatus[status] ?? 'HTTP_ERROR';
      message =
        typeof body === 'string' ? body : ((body as { message?: string }).message ?? exception.message);
      if (Array.isArray(message)) message = message.join('; ');
    }

    if (status >= 500) this.logger.error({ err: exception, requestId }, 'Unhandled error');
    if (
      status === HttpStatus.TOO_MANY_REQUESTS &&
      details &&
      typeof details === 'object' &&
      'retryAfterSec' in details
    ) {
      res.setHeader('Retry-After', String((details as { retryAfterSec: number }).retryAfterSec));
    }
    res
      .status(status)
      .json({ error: { code, message, requestId, ...(details !== undefined ? { details } : {}) } });
  }
}
