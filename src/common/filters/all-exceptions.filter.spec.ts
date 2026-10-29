import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppException } from '../app.exception';
import { ErrorCode } from '../error-code.enum';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  const response = { status: jest.fn(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  beforeEach(() => {
    response.status.mockReset().mockReturnValue(response);
    response.json.mockReset();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('uses the error code of an AppException', () => {
    filter.catch(
      new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({
      successful: false,
      error_code: ErrorCode.VALIDATION_ERROR,
      data: null,
    });
  });

  it('derives the error code from the status of other HttpExceptions', () => {
    filter.catch(new NotFoundException(), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith({
      successful: false,
      error_code: 'NOT_FOUND',
      data: null,
    });
  });

  it('hides unknown errors behind INTERNAL_SERVER_ERROR', () => {
    filter.catch(new Error('database password is hunter2'), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith({
      successful: false,
      error_code: ErrorCode.INTERNAL_SERVER_ERROR,
      data: null,
    });
  });
});
