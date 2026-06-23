# Business Flow, Workflow & Operational Gap Analysis — Issues Found

Audit method: 5 parallel domain audits (Tenant Onboarding/Multi-Tenant, Customer Support/Ticket Lifecycle/Notifications, Agent Workspace/Manager Ops/Analytics, Knowledge Base/AI Ops/Workflow/Connector, Disaster Scenarios), each instructed to exclude items already fixed in the same-day Business Validation and Production Hardening passes. Every "Critical"-rated finding and several "High" findings were independently re-verified against the actual source (file:line) before being trusted — two raw agent claims were found false on verification and discarded (see note at bottom).

Severity legend: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low. Status: ✅ Fixed · 📋 Documented, not fixed · ❌ Verified false.

## Tenant Onboarding & Multi-Tenant

| ID | Description | Severity | Status |
|---|---|---|---|
| TEN-01 | `UsageLimitService` tracks tenant plan limits but no resource-creation path (conversations/channels/connectors/teams) ever checks them before creating | 🔴 | ✅ |
| TEN-02 | `CostTrackerService.trackAiUsage/trackConnectorUsage/trackStorageUsage` fully built, never invoked — no daily cost-cap enforcement | 🔴 | ✅ (AI request cap enforced via `UsageLimitService`; `CostTrackerService` itself still unused — see remaining-risks) |
| TEN-03 | `PaymentClient.getSubscriptionStatus()` never called anywhere — billing-plan quotas can't sync to enforcement | 🟠 | 📋 |
| TEN-04 | Feature flags set at provisioning per plan, never checked via a guard before tier-gated features execute | 🟠 | 📋 |
| TEN-05 | No suspended/quota-exceeded tenant guard on resource-creation endpoints | 🟠 | 📋 |
| TEN-06 | Tenant provisioning doesn't initialize business hours, knowledge base workspace, or a default channel | 🟡 | 📋 |
| TEN-07 | `tenantLimits` table not populated at provisioning time (limits live only in service defaults) | 🟡 | 📋 |
| TEN-08 | No idempotency key on tenant-provision endpoint — retried requests can duplicate API keys | 🟡 | 📋 |

## Customer Support Lifecycle, Ticket Lifecycle & Notifications

| ID | Description | Severity | Status |
|---|---|---|---|
| SUP-01 | `ticket-sla.service.ts`'s breach sweep never enqueued the already-built `'sla-breach'` notification job | 🟠 | ✅ |
| SUP-02 | `ticket.service.ts`'s `resolve()` never enqueued the already-built `'ticket-resolution'` customer-email job | 🟠 | ✅ |
| SUP-03 | `close()`/`reopen()`/`cancel()` have no customer notification at all (no pre-built handler/template exists for these — would need new processor cases + email templates) | 🟠 | ✅ |
| SUP-04 | Ticket creation sends no customer confirmation/reference number | 🟠 | ✅ |
| SUP-05 | Abandoned/idle conversations have no timeout, reminder, or auto-escalation | 🟡 | 📋 |
| SUP-06 | Escalation-to-human alerts go to agent/team only, never inform the customer a handoff is happening | 🟡 | 📋 |
| SUP-07 | Conversation closure reason isn't surfaced to the customer | 🟡 | 📋 |
| SUP-08 | SLA breach escalation doesn't auto-reassign if the responsible agent never acts | 🟡 | 📋 |
| SUP-09 | `NotificationService.sendEmail/sendPushNotification` swallow all errors — no retry, no dead-letter path, silent permanent loss on transient outage (corroborated independently by 2 of the 5 audits) | 🟠 | ✅ |

## Agent Workspace, Manager Operations & Analytics

| ID | Description | Severity | Status |
|---|---|---|---|
| OPS-01 | `AnalyticsQueueProcessor` had no case for `'ticket-event'`/`'conversation-event'` — both producers existed, jobs were silently acknowledged-and-dropped via the `default:` warn-handler | 🔴 | ✅ |
| OPS-02 | `AnalyticsRealtimeService.getLiveCounters/getLiveSlaMetrics/getLiveAiMetrics` returned `Math.random()` placeholders — every dashboard refresh showed different, meaningless numbers | 🔴 | ✅ (partial — see note) |
| OPS-03 | No bulk close/resolve/tag operations in the inbox — agents act on one conversation/ticket at a time | 🟠 | ✅ (conversations; tickets already had a bulk endpoint — see issues-fixed.md bonus discovery) |
| OPS-04 | No automatic conversation/ticket reassignment when the assigned agent goes offline (corroborated independently by the Disaster Scenarios audit) | 🟠 | ✅ |
| OPS-05 | No manager-facing "team workload" view (per-agent active-conversation counts) | 🟠 | ✅ |
| OPS-06 | No undo window for destructive agent actions (close/assign/transfer) | 🟠 | 📋 |
| OPS-07 | No manager tool to bulk-reassign conversations away from an overloaded agent | 🟡 | 📋 |
| OPS-08 | No keyboard-shortcut backend infrastructure | 🟡 | 📋 |

**OPS-02 note:** `activeConversations`, `activeAgents`, `queuedTickets`, `slaBreachRiskCount`, `slaComplianceRate`, and `averageWaitTimeMs` are now real DB-backed queries (verified by direct query execution against live data). `currentAiResolutionRate` and `liveAverageResponseTimeMs` are returned as `null` rather than fabricated — no field in the data model tracks "resolved by AI without takeover" or per-call AI latency, so there is nothing honest to compute them from yet.

## Knowledge Base, AI Operations, Workflow & Connector

| ID | Description | Severity | Status |
|---|---|---|---|
| AI-01 | `AiSettings.confidenceThreshold/escalationThreshold/autoResponseEnabled/autoEscalationEnabled` were fully modeled (entity, DTO, repository, service) but `ai-response.service.ts` never read any of them — a low-confidence AI reply went to the customer exactly like a fully-confident one | 🟠 | ✅ |
| AI-02 | AI tool execution has no tenant-specific connector-permission check beyond "capability enabled" — a tenant's AI agent can invoke any capability a connector exposes | 🟠 | 📋 |
| AI-03 | Knowledge retrieval for AI grounding (RAG) doesn't pass `userId`/`teamId` through to permission checks the HTTP knowledge endpoints already enforce | 🟠 | ✅ |
| AI-04 | Workflow approval pauses are not strictly enforced against execution proceeding; no escalation on approval timeout | 🟠 | ✅ |
| AI-05 | Failed workflow executions have no dead-letter routing or tenant-facing alert | 🟠 | ✅ |
| AI-06 | Connector credential encryption key has a hardcoded fallback string (same pattern as the JWT/encryption fallbacks found and partly fixed in this morning's hardening pass — this one wasn't added to the fail-fast list) | 🟡 | ✅ |
| AI-07 | No cross-tenant circuit breaker for a shared upstream connector API — one tenant's misbehaving integration can rate-limit the upstream for everyone | 🟡 | 📋 |
| AI-08 | AI tool-call results aren't linked to a structured business-outcome audit trail (compliance gap for actions like refunds) | 🟡 | 📋 |
| AI-09 | Knowledge documents have no RETIRED state distinct from ARCHIVED — can't exclude from AI retrieval while keeping for audit | 🟡 | 📋 |
| AI-10 | No knowledge base "no review gate before publish" — flagged by the audit as Critical, reclassified here: this is a net-new approval workflow (states, permissions, endpoints), not a fix to existing broken wiring, so it's a recommendation rather than a bug | 🟡 | 📋 |

## Disaster Scenarios

| ID | Description | Severity | Status |
|---|---|---|---|
| DR-01 | AI platform timeout/error: customer receives **nothing** — an internal escalation is created but no message is ever posted to the conversation | 🔴 | ✅ (fixed properly with an attempt-count guard — see issues-fixed.md) |
| DR-02 | `submitToolResult()` failure after a connector tool call is silently logged — the AI platform never learns the tool failed and the workflow can hang waiting for a result that will never arrive | 🟠 | ✅ |
| DR-03 | BullMQ workers have no explicit `stalledInterval`/`lockDuration`/`maxStalledCount` — a worker crash mid-job relies entirely on BullMQ defaults with no escalation if a job stalls repeatedly | 🟡 | ✅ |
| DR-04 | File upload service outage throws a raw 503 mid-request with no retry and no cleanup of any partial state | 🟡 | ✅ |
| DR-05 | Tenant with no AI agent configured: `processInboundMessage` logs a warning and returns with no result — customer message is processed but generates total silence, no error surfaced anywhere | 🟡 | ✅ |
| DR-06 | Rate-limiting / `ThrottlerModule` has no documented fallback if Redis is down — claimed to fail closed (block all requests) rather than degrade open | 🟡 | ❌ verified false: connector engine already degrades to a DB fallback; HTTP throttler isn't Redis-backed at all |
| DR-07 | `readDb` (reader pool) is exported but no repository was confirmed to actually use it for read-heavy queries — all reads may be going to the writer pool | 🟡 | 📋 |

## Discarded false positives (verified incorrect, not included above)

- **"Search results aren't tenant-scoped"** — checked directly: all 5 search services (conversations, customers, messages, knowledge, inbox) filter by `eq(schema.X.tenantId, tenantId)` via Drizzle. Confirmed correct, not a gap.
- **"Snooze never auto-wakes"** — checked directly: `inbox-queue.processor.ts` has a real `'inbox-cleanup-job'` case calling `snoozeService.processDueSnoozes()`. Confirmed correct, not a gap.
