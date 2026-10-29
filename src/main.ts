import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp, SWAGGER_PATH } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(
    `Swagger docs available at http://localhost:${port}/${SWAGGER_PATH}`,
    'Bootstrap',
  );
}
void bootstrap();
