import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validateProductionEnv } from './config/validate-env';
import { getAllowedOrigins } from './config/cors-origins';

async function bootstrap() {
  validateProductionEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // No ValidationPipe was registered anywhere in this app - every
  // class-validator decorator on every DTO was inert, so malformed input
  // (e.g. a missing required field) reached services unchecked and surfaced
  // as a raw DB constraint violation (500) instead of a clean 400. whitelist
  // strips unknown properties rather than rejecting them outright, to avoid
  // breaking any endpoint that currently tolerates extra fields.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const allowedOrigins = getAllowedOrigins();
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-Id',
      'X-Request-Id',
      'X-Trace-Id',
      'X-CSRF-Token',
    ],
  });

  // Serves files saved locally by surfaces with no External File Upload
  // Service integration of their own (e.g. widget attachments).
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const config = new DocumentBuilder()
    .setTitle('EasyDev Support AI API')
    .setDescription('The EasyDev Support AI API documentation')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
