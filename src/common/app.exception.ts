import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code.enum';
export class AppException extends HttpException {
  constructor(
    readonly errorCode: ErrorCode,
    status: HttpStatus,
    readonly details?: unknown,
  ) {
    super(errorCode, status);
  }
}
