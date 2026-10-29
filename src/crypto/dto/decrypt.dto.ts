import { ApiProperty } from '@nestjs/swagger';
import { IsBase64, IsNotEmpty, IsString } from 'class-validator';
import { ErrorCode } from '../../common/error-code.enum';

export class DecryptRequestDto {
  @ApiProperty({ description: '`data1` returned by /get-encrypt-data.' })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  data1!: string;

  @ApiProperty({ description: '`data2` returned by /get-encrypt-data.' })
  @IsString()
  @IsNotEmpty()
  @IsBase64()
  data2!: string;
}

export class DecryptedDataDto {
  @ApiProperty({ example: 'Hello, I am Renny' })
  payload!: string;
}

export class DecryptResponseDto {
  @ApiProperty({ example: true })
  successful!: boolean;

  @ApiProperty({ example: ErrorCode.NONE })
  error_code!: string;

  @ApiProperty({ type: DecryptedDataDto, nullable: true })
  data!: DecryptedDataDto | null;
}
