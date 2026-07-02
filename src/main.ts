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
import { HealthService } from '@easydev/observability';
import { runMigrations } from '@easydev/database';

async function bootstrap() {
  validateProductionEnv();

  // Only the api container sets RUN_MIGRATIONS_ON_BOOT (see
  // easydev-infra's stacks/support-ai/docker-compose.production.yml) - one
  // designated runner avoids api/webhook/worker racing each other to apply
  // the same migrations concurrently on a fresh deploy. Runs before the Nest
  // app is even constructed so nothing serves traffic against an unmigrated
  // schema.
  if (process.env.RUN_MIGRATIONS_ON_BOOT === 'true') {
    await runMigrations();
  }

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
    // Every other service in this platform exposes the Swagger "Authorize"
    // button; this one didn't, so permission-gated endpoints couldn't be
    // exercised from the docs UI at all. Paste an IAM access token once
    // (persistAuthorization keeps it across page reloads) and every request
    // carries it.
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    // Direct login from the Authorize dialog: exchanges username+password
    // at IAM's OAuth2 password-grant endpoint (auth/oauth/token) instead
    // of requiring a manually pasted token. Cross-origin fetch: IAM's
    // CORS_ORIGINS must include this docs origin. Override the tokenUrl
    // for non-local setups via SWAGGER_IAM_TOKEN_URL.
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          password: {
            tokenUrl:
              process.env.SWAGGER_IAM_TOKEN_URL ||
              'http://localhost:3304/api/v1/iam/auth/oauth/token',
            scopes: {},
          },
        },
      },
      'password-login',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(process.env.PORT ?? 3100);

  // Visibility, not a boot gate: a downstream outage (IAM/AI platform/etc
  // blipping) shouldn't crash-loop this process - validateProductionEnv()
  // above already hard-fails on missing config, this just reports actual
  // reachability of every dependency (and, for queues this process is
  // configured to run via PROCESS_QUEUE, whether a worker actually attached)
  // right in the boot log instead of requiring someone to separately poll
  // GET /health to find out something's unreachable.
  void (async () => {
    try {
      const healthService = app.get(HealthService);
      const { status, components } = await healthService.runFullLivenessCheck();
      const logger = app.get(StructuredLogger);
      const summary = Object.entries(components)
        .map(([name, result]: [string, any]) => `${name}=${result.status}`)
        .join(', ');
      const message = `Startup dependency check: ${status} (${summary})`;
      if (status === 'UP') {
        logger.log(message, 'Bootstrap');
      } else {
        logger.warn(message, 'Bootstrap');
      }
    } catch (e: any) {
      app
        .get(StructuredLogger)
        .warn(
          `Startup dependency check failed to run: ${e.message}`,
          'Bootstrap',
        );
    }
  })();
}
bootstrap();
