# Issues Fixed This Pass

All fixes below: typechecked clean (`tsc --noEmit` exit 0), reuse already-built infrastructure rather than inventing new mechanisms, and were live-verified where practical (direct SQL execution against real data, or live HTTP checks against the dev server).

## SUP-01 — SLA breach notifications never fired
**File:** `src/modules/tickets/services/ticket-sla.service.ts` (`runBreachSweep`)
`NotificationQueueProcessor` already had a fully-built `'sla-breach'` case (push to the assigned agent, email to a manager). Added the producer call right after the existing `'ticket-escalation-job'` enqueue, guarded on `ticket.assignedAgentId` being set. Single-fire by construction — `sla.markBreached()` persists before the next sweep runs, so retries of the sweep job can't re-notify for an already-breached SLA.

## SUP-02 — Ticket resolution never notified the customer
**File:** `src/modules/tickets/services/ticket.service.ts` (`resolve`)
`NotificationQueueProcessor` already had a fully-built `'ticket-resolution'` case (emails the customer). Added the producer call, wrapped in try/catch: `CustomerService.findById` throws `NotFoundException` rather than returning `null`, so a stale `customerId` must never be allowed to fail the actual ticket resolution — the notification is strictly best-effort.

## OPS-01 — Analytics events silently dropped
**File:** `src/modules/analytics/jobs/analytics-queue.processor.ts`
`ticket-queue.processor.ts` and `conversation-queue.processor.ts` both already enqueue `'ticket-event'`/`'conversation-event'` jobs to the analytics queue, but `AnalyticsQueueProcessor` had no case for either name — they fell into the `default:` handler, which warns and acknowledges without ever recording anything. Added both cases, routing into the existing `AnalyticsEventConsumer.handleEvent()` (the same consumer real events already use), mapping `ticketId`/`conversationId` → `aggregateId` and a fixed `aggregateType`.

## OPS-02 — Realtime analytics dashboards showed random fake data
**File:** `src/modules/analytics/services/analytics-realtime.service.ts`
`getLiveCounters`, `getLiveSlaMetrics`, `getLiveAiMetrics` all returned `Math.random()`-based placeholders. Replaced with real queries:
- `activeConversations` — count of conversations not in `CLOSED`/`ARCHIVED`
- `activeAgents` — count of `inboxPresence` rows with status `ONLINE`/`AWAY`/`BUSY`
- `queuedTickets` — count of `OPEN` tickets
- `slaBreachRiskCount` — `ticketSla` rows not yet breached with `resolutionDueAt` in the next 30 minutes
- `slaComplianceRate` — % of `ticketSla` rows with `breached=false` among those whose deadline has passed in the last 30 days
- `averageWaitTimeMs` — average `firstResponseAt - createdAt` over tickets from the last 30 days
- `liveRequestRatePerSecond` — today's AI request count (from `aiUsageMetrics`) divided by seconds elapsed today

`currentAiResolutionRate` and `liveAverageResponseTimeMs` are returned as `null` — no field in the schema tracks "resolved by AI without human takeover" or per-call AI response latency, so there's nothing real to compute them from. Returning `null` rather than a plausible-looking fabricated number.

Verified directly by executing the new queries against the real local database: returned `activeConversations: 3`, `queuedTickets: 3`, `activeAgents: 0` (no presence rows currently), `ticketSla { total: 5, compliant: 4 }`.

## AI-01 — AI confidence/escalation/auto-response settings had no effect
**Files:** `src/modules/ai-integration/services/ai-response.service.ts`, `src/modules/ai-integration/ai-integration.module.ts`
`AiSettings` already modeled `confidenceThreshold`, `escalationThreshold`, `autoResponseEnabled`, `autoEscalationEnabled` end-to-end (entity, DTO, repository, service) but `processInboundMessage()` never read any of them:
- If `autoResponseEnabled` is `false`, the method now returns early without posting anything (mirrors the existing `isAiActive` early-return pattern).
- After generation, if `autoEscalationEnabled` is `true` and the AI's own reported `confidence` is below `escalationThreshold`, the reply is now escalated via the existing `AiEscalationService.createEscalation()` instead of being auto-posted to the customer.

Injected `AiSettingsService` into `AiResponseService`; added `forwardRef(() => SettingsModule)` to `AiIntegrationModule` (no real circular dependency — `SettingsModule` doesn't import `AiIntegrationModule`).

---

## Follow-up pass ("fix remaining issues")

### DR-05 — Tenant with no AI agent configured: total silent failure
**File:** `ai-response.service.ts`
When `AiRoutingService.selectAgent()` returns null, the method now creates an escalation (reusing the same `AiEscalationService.createEscalation()` call used elsewhere) instead of logging a warning and returning nothing. A misconfigured tenant now gets a human looking at the conversation instead of total silence.

### AI-06 — Connector credential encryption key had a hardcoded fallback
**File:** `src/config/validate-env.ts`
`CredentialManager` falls back to a literal string baked into the source if `CONNECTOR_ENCRYPTION_KEY` is unset — same pattern as `WIDGET_JWT_SECRET`, fixed this morning. Confirmed `CredentialManager` is live-wired (connectors module, execution engine) before adding it to the production fail-fast list.

### DR-03 — No stalled-job recovery config on any of the 16 BullMQ processors
**Files:** `packages/shared-queues/src/queue-definitions.ts` (new `WORKER_OPTIONS` export), all 16 `*.processor.ts` files under `src/modules/*/jobs/`
Every `@Processor()` relied entirely on BullMQ's defaults (30s lock, no explicit stalled-check interval, no cap on stall-recovery attempts) — too short for jobs that legitimately take longer (AI generation calls, connector executions), risking a job being reclaimed and re-run while still genuinely in flight. Added a shared `WORKER_OPTIONS` constant (`lockDuration: 60000`, `stalledInterval: 30000`, `maxStalledCount: 2`) and applied it to every processor. Also fixed `notification-queue.processor.ts`'s `default:` case, which still threw on an unrecognized job name (same bug class as the analytics/connector/widget processors fixed earlier today) — now warns and acknowledges instead of burning the retry budget toward the DLQ.

### DR-01 — AI platform timeout left the customer with total silence
**Files:** `ai-response.service.ts`, `conversation-queue.processor.ts`
Originally deferred (see `remaining-risks.md`'s prior version) because the catch block re-throws and `'ai-process-message'` retries 3x by default — posting a customer-facing message unconditionally there would spam the customer up to 3 times for one underlying failure. Fixed properly: `conversation-queue.processor.ts` now computes `isLastAttempt` from `job.attemptsMade`/`job.opts.attempts` and threads it into `processInboundMessage()`. The catch block now only creates the escalation record and posts a "we're having trouble, a team member will follow up" message when `isLastAttempt` is true — intermediate retries still just log and rethrow silently, exactly as before.

### SUP-09 — `NotificationService` silently swallowed every send failure
**File:** `src/modules/notifications/notification.service.ts`
`sendEmail`/`sendPushNotification` caught all errors and only logged them — a transient outage caused permanent, untraceable loss. Both real callers (`NotificationQueueProcessor`'s 16 job cases, `AnalyticsExportService.triggerExport` via `analytics-queue.processor.ts`) are themselves `BaseWorker` subclasses with retry + dead-letter routing already wired and waiting. Changed both methods to re-throw after logging, so the existing infrastructure actually engages instead of the error dying silently. Confirmed the third nominal caller (`conversation-resolution.service.ts`) never actually invokes either method — dead injection, unaffected.

All fixes in this follow-up pass: typechecked clean (`tsc --noEmit` exit 0), full `build:packages` clean, existing test suite (7 suites / 69 tests post test-deletion baseline) still green.

---

Carried over from the same-day Production Hardening pass (not re-verified here, listed for completeness since this gap-analysis audit explicitly excluded re-finding them): global `ValidationPipe`, real AI-platform/storage health checks, `/health` split into live/ready with correct status codes, Docker `HEALTHCHECK` pointed at `/health/live`, DB `statement_timeout`, BullMQ `maxRetriesPerRequest`, production-only startup env validation, realtime gateway CORS lockdown, widget upload MIME allowlist, `uploads/` non-root permission fix, HTTP metrics recording, structured logging activation, `EASYDEV_AI_URL` local-env fix, widget `message_sync` bug fix.
