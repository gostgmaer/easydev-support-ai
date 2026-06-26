// Shared with main.ts's HTTP CORS config so the agent/admin-facing realtime
// gateways can't drift out of sync with the HTTP allowlist - one for the
// websocket transport, one for HTTP, both gated by the same env var.
export function getAllowedOrigins(): string[] {
  return (
    process.env.CORS_ALLOWED_ORIGINS ??
    'http://localhost:3011,http://localhost:3012,http://localhost:3013,http://localhost:3014'
  ).split(',');
}
