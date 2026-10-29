import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { fail } from '../api-result';
import { AppException } from '../app.exception';
import { ErrorCode } from '../error-code.enum';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, errorCode } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(exception);
    } else {
      const details =
        exception instanceof AppException ? exception.details : undefined;
      this.logger.warn(`${errorCode}: ${JSON.stringify(details ?? null)}`);
    }

    response.status(status).json(fail(errorCode));
  }

  private resolve(exception: unknown): { status: number; errorCode: string } {
    if (exception instanceof AppException) {
      return { status: exception.getStatus(), errorCode: exception.errorCode };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // e.g. 404 -> "NOT_FOUND", 413 -> "PAYLOAD_TOO_LARGE"
      const errorCode =
        (HttpStatus[status] as string | undefined) ?? `HTTP_${status}`;
      return { status, errorCode };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
    };
  }
}
