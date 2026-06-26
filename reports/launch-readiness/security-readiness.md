# Security Readiness

**Audit completed** across all 6 backend repos + `infra/`. This is the second-most consequential category after tenant isolation, and it surfaced the largest number of Critical findings in the entire certification. Full detail and IDs in `risk-register.md` (RR-35 through RR-49); this file gives the security-specific narrative and verdict.

## CRITICAL findings (9)

1. **SSRF in connector health-checks** (easydev-support-ai) - `connector-health.service.ts:81` pings tenant-supplied URLs with no private-IP/internal-hostname blocking, on a periodic sweep across all tenants (RR-35).
2. **Plaintext webhook signing secret at rest** (easydev-support-ai) - `connector_webhooks.secret` stored unencrypted, used for outbound HMAC signing (RR-36).
3. **Six-plus hardcoded fallback secrets** (easydev-support-ai) - session security, file security, encryption, widget sessions, connector credentials, AI platform client all have `process.env.X || 'literal-default'` patterns; env validation only catches 2 of them (RR-37).
4. **Plaintext TOTP secrets + no rate limiting on login/2FA/OTP** (IAM) - the platform's two actual brute-force defenses (lockout, rate limiting) are both broken/absent on the exact endpoints that matter most (RR-38, RR-39).
5. **Cross-tenant data exposure + forgeable webhooks** (notification-service) - spoofable `x-tenant-id`, unverified inbound webhook signatures, unenforced OTP attempt cap (RR-40).
6. **Disabled-by-default encryption + dangerous CORS** (multi-tennet-ai-agent) - a working encryption module exists but isn't turned on, so all conversation/PII content is plaintext; CORS combines wildcard origin with credentials (RR-41).
7. **Unauthenticated exposed databases** (infra-wide) - MongoDB/Redis reachable on host ports with no auth in at least one service; only 1 of 6 services is actually behind the working Traefik TLS config (RR-42).
8. **Live committed credentials** (file-upload-service) - real MongoDB and Azure Storage credentials sitting in a git-tracked `env` file. **This is an active incident, not a backlog item - see RR-43, rotate immediately regardless of this certification's timeline.**
9. (Reinforces RR-02/Tenant Isolation) - the cross-tenant authorization gaps found and fixed in `tenant-readiness.md` are also, by definition, security findings.

## HIGH / MEDIUM findings

- No app-level HTTPS/HSTS enforcement anywhere; easydev-support-ai's NestJS app has no `helmet` (RR-44).
- Money-movement and public-ingestion endpoints rely only on generic rate limits, no stricter per-endpoint throttle (RR-45).
- Multiple "silently degrade to less-secure instead of fail closed" patterns: IAM backup-code encryption, payment-microservice CORS fallback, file-upload-service's missing S3 server-side encryption, a reused Traefik dashboard credential hash committed in `infra/.env.example` (RR-46).

## What's solid

- `.gitignore` correctly excludes `.env*` in all 6 repos - only the one already-known committed `env` file in file-upload-service is an exception, and the team is already aware of it (their own readiness doc documents it).
- SQL/NoSQL injection: checked widely across Drizzle/Prisma/Mongoose - no exploitable injection found; the few raw-query uses are on hardcoded internal strings, not user input.
- Mass assignment is globally mitigated via `ValidationPipe({whitelist:true})`/explicit DTO allowlists in IAM, payment-microservice, and easydev-support-ai.
- Real, actively-written audit tables exist in easydev-support-ai, IAM, payment-microservice, and multi-tennet-ai-agent (notification-service is the one gap here).
- Traefik itself, where it's actually wired (only `multi-tennet-ai-agent` today), is correctly configured - real HTTP→HTTPS redirect, ACME/Let's Encrypt, HSTS middleware.

## Verdict

**Not certifiable as secure.** Nine Critical findings is not a marginal result - several of these (SSRF, plaintext secrets at rest, broken brute-force defenses, a live credential exposure) are squarely in "fix before anyone outside the team touches this" territory, independent of the broader go-live timeline. None require architectural rework; all are scoped, identifiable fixes. The live credential exposure (file-upload-service) should be treated as an active incident today, not bundled into the launch-readiness remediation schedule.
