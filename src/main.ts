import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validateProductionEnv } from './config/validate-env';
import { getAllowedOrigins } from './config/cors-origins';
import { StructuredLogger } from './common/observability/logger.service';

async function bootstrap() {
  validateProductionEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // No security headers at the app level at all - the standalone edge nginx
  // (docker-compose.production.yml) sets some, but only services actually
  // deployed behind it benefit, and app-level headers shouldn't depend on
  // which edge layer happens to be in front. contentSecurityPolicy is
  // disabled specifically: this is a JSON API, not an HTML app, but it does
  // serve Swagger UI at /api/docs, which relies on inline scripts/styles
  // that helmet's default CSP blocks - the other headers (nosniff,
  // HSTS, disabling X-Powered-By, etc.) apply normally and have no such
  // conflict. X-Frame-Options is intentionally left at helmet's default
  // (deny) - the customer-facing widget is a separate frontend app that
  // calls this JSON API, not HTML this backend serves and that needs to be
  // iframe-embeddable itself.
  app.use(helmet({ contentSecurityPolicy: false }));

  // StructuredLogger (JSON logs correlated to trace/request/tenant IDs, PII
  // masking) existed but was never activated - app.useLogger() is required
  // for Nest to route its own internal logs (and every Logger.log/error call
  // app-wide) through it instead of plain unstructured console output.
  app.useLogger(app.get(StructuredLogger));

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
