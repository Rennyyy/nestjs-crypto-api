import { ErrorCode } from './error-code.enum';
export interface ApiResult<T> {
  successful: boolean;
  error_code: string;
  data: T | null;
}

export function ok<T>(data: T): ApiResult<T> {
  return { successful: true, error_code: ErrorCode.NONE, data };
}

export function fail(errorCode: string): ApiResult<never> {
  return { successful: false, error_code: errorCode, data: null };
}
