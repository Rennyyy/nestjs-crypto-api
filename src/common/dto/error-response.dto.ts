import { ApiProperty } from '@nestjs/swagger';
import { ErrorCode } from '../error-code.enum';

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  successful!: boolean;

  @ApiProperty({
    example: ErrorCode.VALIDATION_ERROR,
    enum: Object.values(ErrorCode).filter((code) => code !== ErrorCode.NONE),
  })
  error_code!: string;

  @ApiProperty({ type: 'null', nullable: true, example: null })
  data!: null;
}
