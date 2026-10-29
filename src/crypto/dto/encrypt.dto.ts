import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString, MaxLength } from 'class-validator';
import { ErrorCode } from '../../common/error-code.enum';

export const PAYLOAD_MAX_LENGTH = 2000;

export class EncryptRequestDto {
  @ApiProperty({
    description: `Plain text to encrypt (0 - ${PAYLOAD_MAX_LENGTH} characters).`,
    minLength: 0,
    maxLength: PAYLOAD_MAX_LENGTH,
    example: 'Hello, I am Renny',
  })
  @IsDefined()
  @IsString()
  @MaxLength(PAYLOAD_MAX_LENGTH)
  payload!: string;
}

export class EncryptedDataDto {
  @ApiProperty({
    description: 'AES key encrypted with the RSA private key (base64).',
  })
  data1!: string;

  @ApiProperty({
    description:
      'Payload encrypted with the AES key, AES-256-GCM (base64 of iv | auth tag | ciphertext).',
  })
  data2!: string;
}

export class EncryptResponseDto {
  @ApiProperty({ example: true })
  successful!: boolean;

  @ApiProperty({ example: ErrorCode.NONE })
  error_code!: string;

  @ApiProperty({ type: EncryptedDataDto, nullable: true })
  data!: EncryptedDataDto | null;
}
