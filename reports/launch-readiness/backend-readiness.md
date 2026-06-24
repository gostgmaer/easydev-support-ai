# Backend Readiness

Covers: easydev-support-ai (Support Platform + its internal Connector/Workflow/Knowledge/Analytics/Realtime engines), multi-tannet-auth-services (IAM), payment-microservice, notification-service, file-upload-service, multi-tennet-ai-agent (AI Platform). All findings below are from direct code audit this pass, with file:line citations preserved from the source agent reports.

**Not covered in this file**: Security/OWASP (own report), Tenant isolation/Authorization (own report). Database/Redis/Queue/File-Storage is now covered below.

## Service Inventory & Health

| Service | Health Check | Liveness/Readiness Split | Observability | Alerting |
|---|---|---|---|---|
| easydev-support-ai | Real DB+Redis+deps check, 503 on failure (`health.controller.ts:29-47`) | Yes - `/health/live` vs `/health/ready` | OTel, Prometheus `/metrics`, Tempo, Grafana datasources | `alert-rules.yml` exists - verify it's wired to a live Alertmanager |
| multi-tannet-auth-services (IAM) | Real DB check, **but Redis faked "ok" when disabled** (`health.controller.ts:40`) | **No** - single endpoint does both | None found (no OTel/Prometheus/structured logging) | None found |
| payment-microservice | Real Terminus DB+BullMQ/Redis check (`health.controller.ts:41-56`) | **No** - single endpoint | OTel wired (`app.module.ts`, `main.ts`, `worker.ts`) | None found |
| notification-service | Real Terminus Mongoose+memory check (`health.controller.ts:15-24`) | Yes - `/v1/health/live` vs `/v1/health`/`detailed` | Winston/pino present | None found |
| file-upload-service | Most thorough of all 6 - real Mongo/Redis/storage-adapter checks (`healthRoutes.js:13-207`) | Yes - `/live`, `/ready`, legacy `/` | **None** - console logging only | None found |
| multi-tennet-ai-agent (AI Platform) | Real per-component check with trace ID (`health.py:59-80`) | Yes, clean split | Full stack: OTel+OTLP, Prometheus client, structlog | **Only service with real Prometheus alert rules** (`monitoring/prometheus/alerts/ai-platform-alerts.yml`) |

**Gateway**: confirmed phantom. `easydev-gateway` exists only as a seed-data slug in IAM's `prisma/seed.ts:827` - zero deployed gateway code anywhere across all 6 repos or `infra/`. See RR-21.

**Edge proxy**: `infra/docker-compose.yml` runs only Traefik+Portainer; no backend service has Traefik labels or is composed into it. All 6 services sit on bare ports with no TLS/centralized perimeter. See RR-03 (Critical).

## Authentication (IAM)

- **Login**: real email/password + OTP; MFA is genuinely enforced via `TwoFactorService` (`two-factor.service.ts:151-188`), not a stub.
- **Brute-force lockout: broken.** Wrong-password/OTP failures never increment the lockout counter; the 5-attempt threshold (when reachable) only sends an email, never blocks (`auth.service.ts:654-712`). See RR-04 (High).
- **Logout**: real server-side revocation (DB `isActive=false` + Redis key delete, `auth.service.ts:915-926`).
- **Refresh tokens**: validated correctly but **no rotation or reuse detection** (`auth.service.ts:1095-1199`). See RR-13.
- **Session recovery/revocation**: real, both single-device and all-device (`sessions.service.ts`, `auth.service.ts:928-959`).
- **Password reset**: anti-enumeration safe, single-use tokens, rate-limited at the controller (`auth.controller.ts:253-254`). Solid.
- **Profile management**: no email-change field in the update DTO - no silent takeover vector.
- **Tenant switching**: correctly re-scopes permissions on a fresh session; prior session isn't revoked (minor, see RR-23).
- **Permission cache invalidation**: RBAC changes don't invalidate the Redis permission cache - up to 7-day staleness on revocation. See RR-14.
- **401 vs 403**: consistent throughout, no inversions found.
- **Concurrent sessions**: unbounded, no cap (RR-23).

## Customer Support Operations

- Conversation routing is real rule-based logic (language → category → default → least-busy fallback), not a stub (`ai-routing.service.ts:15-64`).
- Human-side assignment genuinely skill/load-aware: round-robin, least-loaded, skill-based, priority-based strategies, with live availability/capacity checks (`agent-assignment.service.ts:78-214`).
- Escalation/transfer, internal notes, @mentions (now produce real notifications), bookmarks, and snooze-with-auto-wake are all real and working end-to-end.
- Ticket/conversation state machine genuinely enforced (`value-objects.ts:106-122`) - no backdoor through the generic update path.
- **Risk**: `ConversationResolutionService` (the resolve→notify→CSAT→close→analytics chain) runs with `// @ts-nocheck` (RR-17, Medium) - the most consequential lifecycle code in the module has no compile-time safety net.
- **Critical, confirmed by direct trace (RR-55)**: everything above is real and correct *once a conversation exists* - but for every channel except the embeddable web widget (WhatsApp, Slack, Telegram, Email, Facebook, Instagram, Teams), no conversation ever gets created. `ChannelWebhookService` → `ChannelMessageService.processIncomingWebhook()` validates and normalizes an inbound message, then publishes two events whose only subscriber anywhere in the codebase is the analytics consumer - it never calls into `MessageInboundService.ingest()`, the pipeline that actually creates a Conversation and persists a Message. That pipeline exists, works correctly, and is exercised by the widget's own separate, working `widget-chat.controller.ts` path - it simply isn't invoked from the channel-webhook path at all. See `customer-onboarding-readiness.md` for the full trace.

## AI Operations

- Draft/suggestion generation is a real LLM call with real persistence (`ai-response.service.ts:343-438`), not a stub.
- Confidence-based escalation is real and wired (`ai-response.service.ts:228-240`, `ai-escalation.service.ts:66-76`).
- AI escalation to human is a real state change + realtime event + workflow trigger, not just a log line (`ai-escalation.service.ts:139-210`).
- AI tool-call execution genuinely wired to the real connector engine, with retry on result-submission failure - but **the connector-side action itself isn't idempotent**, only the result submission is (RR-18, Medium).
- AI memory/RAG is real (embedding → search → rerank → dedupe pipeline in `multi-tennet-ai-agent`), not keyword-only.
- AI cost tracking is real, per-tenant, on both the NestJS and Python sides, with Redis-backed daily quota enforcement.
- AI failure/timeout handling is real on both sides: NestJS escalates + sends a fallback message only on terminal retry (no duplicate escalations); Python has real exponential backoff + circuit breaker with provider failover.
- Human↔AI bidirectional takeover is real and is the actual enforcement point for whether auto-response fires (`inbox.service.ts:154-185`).
- The Python AI Platform service makes genuine calls to 11 real LLM providers - not a mock.
- **Gap**: no endpoint surfaces "which knowledge articles influenced this suggestion" to the conversation UI - grounding is invisible inside the prompt (RR-24, Low).

## Knowledge Engine

- Publishing/versioning is real (real version snapshots per publish).
- **ACL enforcement is inconsistent** - the document-read path enforces it, but `KnowledgeSearchController` and `PublicKnowledgeController` do not, combined with an open-by-default permission check. This is RR-02, **Critical**.
- Document upload has **no file-size or MIME-allowlist enforcement** in this module (RR-19, Medium) - actual upload bytes aren't verified here.
- Search/chunking/reranking is entirely delegated to an external AI Platform HTTP call defaulting to an apparently-unprovisioned placeholder URL (RR-09, Medium) - if that default is ever live, the RAG pipeline silently degrades to raw DB filtering.
- Retirement (archive) and search-analytics logging both exist and are real.

## Connector Engine

- Credentials are encrypted at rest, but **fall back to a hardcoded key if the env var is unset**, using unauthenticated AES-256-CBC (RR-08, High).
- Health checks are real upstream probes, not a stale stored field.
- Retry/backoff is real exponential backoff with a genuine circuit-breaker state machine, now correctly grouped by `connectorType+baseUrl` (this session's AI-07 fix, verified still in place).
- Execution logging is detailed (method/URL/latency/status per call) - real audit trail, not minimal.
- Failure recovery degrades gracefully (circuit breaker blocks before retry-storming an unhealthy upstream).

## Workflow Engine

- Creation/publishing uses real versioned definitions, not flat config blobs.
- Execution engine genuinely evaluates triggers/conditions and dispatches to real downstream services (ticket/message/connector/AI).
- **Approval timeout handling is broken** - this is RR-01, the single most severe finding in this audit: a timed-out approval never actually unblocks the paused execution.
- No per-step retry/dead-letter on action failure - any error fails the whole execution (visible via audit+incident, but no auto-recovery) - RR-16, Low-Medium.
- Audit logging is real and comprehensive (every lifecycle transition, not just a log line).

## Billing (payment-microservice)

- Invoice generation is real and provider-tied, atomically updated with subscription/cycle state on payment.
- **Webhook idempotency is solid** - Redis lock + persisted dedupe by event ID, signature-verified before any DB write, for both Stripe and Razorpay paths. This is the one area most prone to real-world bugs and it's been done correctly.
- **No duplicate-subscription guard** - `createSubscription` can create two ACTIVE rows for the same tenant on a retried call (RR-05, High).
- **No usage/metering module exists at all** - billing is flat-rate only, and `UsageLimitService`'s quota sync from billing plan metadata is a confirmed no-op today (already tracked as TEN-03 in `business-gap-analysis/remaining-risks.md`).
- **No proration/limit enforcement on plan change** - downgraded tenants keep upgraded-tier access indefinitely (RR-06, High).
- **TRIALING subscriptions never auto-expire** - the renewal sweep excludes them entirely (RR-07, High).

## Analytics (easydev-support-ai)

- Conversation, ticket, agent, and AI analytics are real, computed from actual event/usage tables.
- Workflow analytics data exists but has no exposed dashboard/route.
- **Knowledge and revenue analytics categories don't exist at all.**
- Export generation is real, but the **download endpoint is broken** - hardcoded `'dummy-report-id'` means a generated report can never actually be downloaded (RR-15, Medium - a real bug, not a design gap, cheap to fix).

## Database (easydev-support-ai, IAM, payment-microservice)

- **easydev-support-ai**: well-indexed - all 9 sampled high-volume tables have `tenantId` indexes plus composite covering indexes. Real FK enforcement via Drizzle `.references()` with onDelete rules. 16 migrations, none destructive. Real backup scripts exist (`scripts/backup-postgres.sh`/`backup-redis.sh` - pg_dump + AES-256 encryption + checksum) but **no confirmed scheduler/cron actually invokes them**, and the script hardcodes a fallback DB password/passphrase (secrets concern).
- **multi-tannet-auth-services (IAM)**: tenant-indexed throughout, with one gap - `Session.tenantId` has no index, risking table-scans on tenant-scoped session queries at volume. **No `prisma/migrations/` directory exists at all** - schema changes are untracked, unreviewable, with no rollback path. **No backup tooling found anywhere** - the repo's own `docs/PRODUCTION_READINESS_CHECKLIST.md:44` lists backup/restore validation as an unchecked TODO.
- **payment-microservice**: tenant-indexed with minor gaps (`Subscription.planId`, `Transaction.invoiceId` FKs not separately indexed - low-volume tables, minor). **Same migration-history gap as IAM** - no `prisma/migrations/` directory. **No backup tooling found anywhere.** `PaymentInvoice` model has no `@relation` declarations despite referencing transaction/subscription/order IDs as plain strings - app-enforced only, not DB-enforced. The subscription-renewal sweep query has **no row limit**, loading every due subscription into memory at once (RR-26).

See RR-26 through RR-30 in `risk-register.md` for severity-ranked detail.

## Redis & Queues

- **easydev-support-ai**: the resilient Redis pattern (lazyConnect + maxRetriesPerRequest:1 + enableOfflineQueue:false + error handlers) is used in most of 21 client instantiations, but **not consistently** - `packages/security/src/permission.guard.ts`, `session-security.service.ts`, `webhook-security.service.ts`, and `ai-security.service.ts` have no error handler and no lazyConnect, sitting on the hot path for every authenticated request. A Redis blip here risks a crash/hang on permission checks, session validation, and webhook signature checks specifically - the highest-traffic, highest-stakes call sites to get this wrong on (RR-27, High). Eviction/persistence is explicitly configured correctly in production compose (`appendonly yes`, `noeviction`).
- **multi-tannet-auth-services**: well-designed - a single shared Redis service with a full in-memory fallback toggle, but `getClient()`/`duplicate()` hand the raw client to two callers (billing-sync, iam-events processor), bypassing the fallback entirely for those two paths.
- **payment-microservice**: Redis client has connection logging but call sites (`idempotency.service.ts`, `idempotency.interceptor.ts`) have **no try/catch** - a Redis outage would 500 the request rather than degrade gracefully (RR-28, Medium). No eviction/persistence config found for this repo's Redis at all.
- **BullMQ**: easydev-support-ai has the strongest setup platform-wide - centralized retry policies, a real dead-letter queue wired through every processor, and explicit stalled-job recovery config applied to all 16 processors. payment-microservice has per-queue retry/backoff but **no dead-letter queue** (failed jobs sit in failed state, manual inspection only) and no stalled-job override (BullMQ defaults apply). IAM doesn't use BullMQ.

## File Storage (file-upload-service)

- **Critical authorization gap confirmed**: `getDownloadStream(id, tenantId)` is called without `userId` (`fileController.js:150`) - the underlying lookup only enforces tenant-scoping, not per-owner ownership. **Any authenticated user within a tenant can download any other user's file by ID.** A `requireOwnership()` middleware exists (`rbac.js:162-201`) but is **never wired into the routes** - this is RR-25, Critical.
- **No virus/malware scanning exists anywhere** in the upload pipeline (zero ClamAV/scanner hits).
- **`LocalAdapter`'s "signed" URL isn't actually signed** - it returns the raw path (`LocalAdapter.js:54-57`); S3 signed URLs do correctly expire (3600s).
- **No retention/cleanup job** - `File.js` defines an `expiresAt` field but nothing ever reads it; storage grows unbounded.
