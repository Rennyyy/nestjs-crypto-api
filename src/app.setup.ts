import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppException } from './common/app.exception';
import { ErrorCode } from './common/error-code.enum';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

export const SWAGGER_PATH = 'api-docs';

export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: (errors) =>
        new AppException(
          ErrorCode.VALIDATION_ERROR,
          HttpStatus.BAD_REQUEST,
          errors.map(({ property, constraints }) => ({
            property,
            constraints,
          })),
        ),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Crypto API')
    .setDescription(
      'Encrypts a payload with a random AES key (wrapped with an RSA private key) and decrypts it back with the RSA public key.',
    )
    .setVersion('1.0.0')
    .build();
  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    SwaggerModule.createDocument(app, config),
  );
}
