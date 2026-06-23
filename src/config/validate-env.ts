// Boot-time fail-fast for production. Several services in this app fall back
// to hardcoded, publicly-known defaults when their env var is unset (e.g.
// WidgetSessionService signs visitor JWTs with a literal fallback secret
// baked into the source, db.ts connects to a hardcoded local Postgres
// connection string) - safe for local/dev, but in production those silent
// fallbacks let the app boot "successfully" into an insecure or
// disconnected-from-nothing-real state instead of failing immediately.
// This only runs when NODE_ENV=production, so local/dev defaults are untouched.
export function validateProductionEnv(): void {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing: string[] = [];

  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }
  if (!process.env.REDIS_HOST) {
    missing.push('REDIS_HOST');
  }
  if (!process.env.WIDGET_JWT_SECRET) {
    missing.push('WIDGET_JWT_SECRET');
  }
  if (
    !process.env.EASYDEV_IAM_URL &&
    !process.env.IAM_SERVICE_INTERNAL_URL &&
    !process.env.IAM_SERVICE_URL
  ) {
    missing.push('EASYDEV_IAM_URL (or IAM_SERVICE_INTERNAL_URL / IAM_SERVICE_URL)');
  }

  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `Refusing to start in production: missing required environment variable(s):\n${missing
        .map((name) => `  - ${name}`)
        .join('\n')}`,
    );
    process.exit(1);
  }
}
