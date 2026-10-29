import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppException } from '../common/app.exception';
import { ErrorCode } from '../common/error-code.enum';
import { CryptoController } from './crypto.controller';
import { CryptoService, DecryptionFailedError } from './crypto.service';

describe('CryptoController', () => {
  let controller: CryptoController;
  const cryptoService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CryptoController],
      providers: [{ provide: CryptoService, useValue: cryptoService }],
    }).compile();

    controller = moduleRef.get(CryptoController);
  });

  describe('getEncryptData', () => {
    it('wraps the encrypted data in a successful response', () => {
      cryptoService.encrypt.mockReturnValue({ data1: 'd1', data2: 'd2' });

      expect(controller.getEncryptData({ payload: 'hello' })).toEqual({
        successful: true,
        error_code: '',
        data: { data1: 'd1', data2: 'd2' },
      });
      expect(cryptoService.encrypt).toHaveBeenCalledWith('hello');
    });
  });

  describe('getDecryptData', () => {
    it('wraps the decrypted payload in a successful response', () => {
      cryptoService.decrypt.mockReturnValue('hello');

      expect(controller.getDecryptData({ data1: 'd1', data2: 'd2' })).toEqual({
        successful: true,
        error_code: '',
        data: { payload: 'hello' },
      });
      expect(cryptoService.decrypt).toHaveBeenCalledWith('d1', 'd2');
    });

    it('maps DecryptionFailedError to a DECRYPTION_FAILED bad request', () => {
      cryptoService.decrypt.mockImplementation(() => {
        throw new DecryptionFailedError();
      });

      let thrown: unknown;
      try {
        controller.getDecryptData({ data1: 'd1', data2: 'd2' });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(AppException);
      expect((thrown as AppException).errorCode).toBe(
        ErrorCode.DECRYPTION_FAILED,
      );
      expect((thrown as AppException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('rethrows unexpected errors', () => {
      const unexpected = new Error('boom');
      cryptoService.decrypt.mockImplementation(() => {
        throw unexpected;
      });

      expect(() =>
        controller.getDecryptData({ data1: 'd1', data2: 'd2' }),
      ).toThrow(unexpected);
    });
  });
});
