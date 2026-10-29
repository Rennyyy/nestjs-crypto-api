import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ok } from '../common/api-result';
import { AppException } from '../common/app.exception';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { ErrorCode } from '../common/error-code.enum';
import { CryptoService, DecryptionFailedError } from './crypto.service';
import { DecryptRequestDto, DecryptResponseDto } from './dto/decrypt.dto';
import { EncryptRequestDto, EncryptResponseDto } from './dto/encrypt.dto';

@ApiTags('Crypto')
@Controller()
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Post('get-encrypt-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Encrypt a payload',
    description:
      'Generates a random AES key, encrypts the payload with it (data2), then encrypts the AES key with the RSA private key (data1).',
  })
  @ApiOkResponse({ type: EncryptResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      '`VALIDATION_ERROR` when the payload is missing, not a string or longer than 2000 characters.',
  })
  getEncryptData(@Body() body: EncryptRequestDto): EncryptResponseDto {
    return ok(this.cryptoService.encrypt(body.payload));
  }

  @Post('get-decrypt-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Decrypt data1 / data2 back to the payload',
    description:
      'Decrypts the AES key from data1 with the RSA public key, then decrypts data2 with that AES key.',
  })
  @ApiOkResponse({ type: DecryptResponseDto })
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
    description:
      '`VALIDATION_ERROR` when data1/data2 are missing or not base64; `DECRYPTION_FAILED` when they cannot be decrypted.',
  })
  getDecryptData(@Body() body: DecryptRequestDto): DecryptResponseDto {
    try {
      return ok({
        payload: this.cryptoService.decrypt(body.data1, body.data2),
      });
    } catch (error) {
      if (error instanceof DecryptionFailedError) {
        throw new AppException(
          ErrorCode.DECRYPTION_FAILED,
          HttpStatus.BAD_REQUEST,
          error.cause,
        );
      }
      throw error;
    }
  }
}
