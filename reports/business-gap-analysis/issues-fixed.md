# Issues Fixed

All fixes below: typechecked clean (`tsc --noEmit` exit 0), full app boots clean against the live dev server after every change, existing test suite green throughout (7 suites / 69 tests — see `regression-results.md` for why this baseline is smaller than earlier in the day). Each reuses already-built infrastructure (existing services, existing queue processors, established per-item dispatch patterns) rather than inventing new mechanisms, per this mission's "do not create new features" framing — except the two items explicitly approved as net-new (OPS-03, OPS-05).

## Pass 1 — initial gap-analysis fixes

**SUP-01 — SLA breach notifications never fired.** `ticket-sla.service.ts`'s `runBreachSweep` now enqueues the already-built `'sla-breach'` notification job.

**SUP-02 — Ticket resolution never notified the customer.** `ticket.service.ts`'s `resolve()` now enqueues the already-built `'ticket-resolution'` job, best-effort (wrapped so a notification failure can't fail the actual resolution).

**OPS-01 — Ticket/conversation analytics events silently dropped.** `AnalyticsQueueProcessor` had no case for `'ticket-event'`/`'conversation-event'` despite real producers; both now route into the existing `AnalyticsEventConsumer`.

**OPS-02 — Realtime analytics dashboards showed random fake data.** `AnalyticsRealtimeService`'s three methods replaced with real DB queries. Two fields (`currentAiResolutionRate`, `liveAverageResponseTimeMs`) intentionally return `null` — no schema field exists to compute them honestly.

**AI-01 — AI confidence/escalation/auto-response settings had no effect.** `AiResponseService` now reads `AiSettings` (already fully modeled, never wired) and gates auto-response/escalates low-confidence replies instead of always auto-posting.

## Pass 2 — "fix them" follow-up

**DR-05 — Silent failure with no AI agent configured.** Now escalates to a human instead of returning nothing.

**AI-06 — Connector encryption key had a hardcoded fallback.** Added `CONNECTOR_ENCRYPTION_KEY` to the production fail-fast list (`validate-env.ts`).

**DR-03 — No stalled-job recovery config on any BullMQ processor.** Added shared `WORKER_OPTIONS` (`lockDuration: 60000`, `stalledInterval: 30000`, `maxStalledCount: 2`), applied to all 16 processors. Also fixed `notification-queue.processor.ts`'s `default:` case (was throwing, now warns+acknowledges).

**DR-01 — AI platform timeout left the customer with total silence.** Fixed properly this time: `conversation-queue.processor.ts` computes `isLastAttempt` from `job.attemptsMade`/`job.opts.attempts` and threads it through, so the customer-facing fallback message and the escalation record are only created once, on the terminal retry — not once per attempt.

**SUP-09 — `NotificationService` silently swallowed every send failure.** Both `sendEmail`/`sendPushNotification` now re-throw after logging, so the retry+DLQ infrastructure their callers (`NotificationQueueProcessor`, `AnalyticsExportService` via `analytics-queue.processor.ts`) already extend actually engages.

**SUP-03/04 — Ticket close/reopen/cancel/creation had no customer notification.** Added `'ticket-created'`/`'ticket-closed'`/`'ticket-reopened'`/`'ticket-cancelled'` cases to `NotificationQueueProcessor` and a shared `notifyCustomer()` helper in `ticket.service.ts` (best-effort, used by `create`/`resolve`/`close`/`reopen`/`cancel`).

**TEN-01/02 — Zero tenant quota/cost enforcement.** Per your direction ("hard block + overage billing warning"): added `UsageLimitService.enforceLimit()` - hard-blocks (`ForbiddenException`) once usage reaches the plan limit and opens/escalates an operational incident (reusing the `admin-incident-job` pipeline) so ops has billing/overage visibility. Wired into conversation creation (`maxConversations`), connector installation (`maxConnectors`), and AI auto-response (`maxAiRequests`, monthly, escalates to a human instead of throwing since this runs inside a retrying job).

**OPS-04 — No reassignment when an agent goes offline.** Per your direction (`AgentAvailability` as canonical): added `findOfflineAgents()` to the repository, `reassignFromOfflineAgents()` to both `ConversationAssignmentService` and `TicketAssignmentService` (reuses the existing `autoAssign`/`assignEntity` engine, which already excludes non-`ONLINE` agents by construction), and a new `AgentOfflineReassignmentScheduler` sweeping every 2 minutes.

**DR-02 — `submitToolResult()` failure left the AI workflow hung.** Found a second, worse bug while fixing this: the success path had *no* try/catch at all, so a submission failure would corrupt a successful tool execution into a recorded failure. Both paths now route through a private wrapper that falls back to a durable `'ai-tool-result-submission-job'` (on the existing `BaseWorker`-backed `ai-queue`) instead of swallowing or corrupting state.

**AI-04 — Workflow approval timeouts were never proactively detected.** The existing expiry-check logic (`workflow-queue.processor.ts`'s `'workflow-approval-job'` case) only ever ran *immediately* on approval creation (no `delay`), so `isExpired()` was always false there - a functional no-op. Added `findExpiredPendingApprovals()`, `WorkflowApprovalService.sweepExpiredApprovals()`, and a new scheduler running every 5 minutes that proactively rejects expired approvals and raises an incident.

**AI-05 — Failed workflow executions had no alert.** Added `alertExecutionFailure()` to `workflow-engine.service.ts`, called from both failure-catch sites, reusing the same incident pipeline.

**DR-04 — File upload service failures had no retry.** `FileUploadIntegrationService.request()` now retries up to 3 times with exponential backoff before giving up - confirmed safe since every call (finalize/signed-url/scan/thumbnail/delete) is an idempotent confirmation against state the upstream service already owns.

**Bonus discovery — bulk ticket status update bypassed every state-machine guard.** Found while building OPS-03: the *existing* `POST /v1/tickets/bulk/status` endpoint called a raw `UPDATE ... WHERE id IN (...)` with zero validation - completely bypassing `canTransitionTo()` (the exact guard fixed earlier this engagement), no domain events, no SLA recalc, no notifications. Rewrote `bulkUpdateStatus()` to dispatch each ticket through the same guarded single-item method real single-ticket requests use, and removed the now-dead raw repository method entirely (a footgun otherwise).

**OPS-03 — No bulk close/resolve/tag for conversations (approved net-new).** Added `bulkResolve`/`bulkClose` to `ConversationService` and `bulkAddTag` to `ConversationTagService`, mirroring the established safe per-item dispatch pattern from `InboxAssignmentService.bulkAssign()`. New `POST /v1/conversations/bulk/{resolve,close,tag}` endpoints, registered before the `:id/...` routes (same path shape, registration order matters - verified via live boot log).

**OPS-05 — No manager team-workload view (approved net-new).** Added `getTeamWorkload()` to `AgentAssignmentService` (reuses the existing per-agent profile/availability lookup already inside `assignEntity()`, without the online-only filter). New `GET /v1/assignments/:teamId/workload` endpoint (manager/tenant_admin only).

## Verified false, not fixed (no action needed)

- **DR-06 — "Redis failure breaks rate limiting hard."** False on direct verification: the connector engine's `checkRateLimit()` already gracefully degrades to a DB-backed fallback when Redis is unavailable, and the HTTP `ThrottlerModule` doesn't use Redis storage at all (default in-memory) - there was nothing to fix.
