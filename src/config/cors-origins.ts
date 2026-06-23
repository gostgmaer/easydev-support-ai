// Shared with main.ts's HTTP CORS config so the agent/admin-facing realtime
// gateways can't drift out of sync with the HTTP allowlist - one for the
// websocket transport, one for HTTP, both gated by the same env var.
export function getAllowedOrigins(): string[] {
  return (
    process.env.CORS_ALLOWED_ORIGINS ??
    'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3005'
  ).split(',');
}
