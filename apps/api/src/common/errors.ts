import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Application error with a stable machine-readable code. Clients translate `code` (e.g. errors.LESSON_NOT_FOUND),
 * never the message.
 */
export class AppError extends HttpException {
  constructor(
    public readonly code: string,
    status: HttpStatus,
    message?: string,
    public readonly details?: unknown,
  ) {
    super({ code, message: message ?? code, details }, status);
  }
}

export const Errors = {
  unauthorized: () => new AppError('UNAUTHORIZED', HttpStatus.UNAUTHORIZED, 'Please sign in'),
  forbidden: (msg = 'Not allowed') => new AppError('FORBIDDEN', HttpStatus.FORBIDDEN, msg),
  notFound: (what: string) =>
    new AppError(`${what.toUpperCase()}_NOT_FOUND`, HttpStatus.NOT_FOUND, `${what} not found`),
  badRequest: (code: string, msg?: string, details?: unknown) =>
    new AppError(code, HttpStatus.BAD_REQUEST, msg, details),
  conflict: (code: string, msg?: string) => new AppError(code, HttpStatus.CONFLICT, msg),
  tooMany: (retryAfterSec: number) =>
    new AppError('RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS, 'Too many requests', { retryAfterSec }),
  noChild: () => new AppError('NO_ACTIVE_CHILD', HttpStatus.CONFLICT, 'Select a child profile first'),
};
