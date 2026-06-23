# Remaining Risks

Everything below was verified real (file:line) but deliberately not fixed this pass, grouped by why.

## Needs a product/data-model decision (would be fabricating behavior, not fixing a bug)

- **TEN-01/TEN-02/AI-02** — Tenant resource quotas, AI cost caps, and AI tool/connector permissions all have real enforcement gaps, but the fix requires deciding *what happens* when a limit is hit (hard block with what error contract? soft warn? grace period?) and which resources are in scope first. Building this without that decision would mean inventing product behavior.
- **TEN-03/TEN-04** — Billing-plan sync (`PaymentClient`) and feature-flag gating need a decision on enforcement points (every tier-gated endpoint, or a single gateway-level check?) before a `@FeatureFlagGuard`-style decorator is worth building.
- **AI-10** — "No review gate before KB publish" is a request for a net-new approval workflow (states, permissions, endpoints), not a fix to existing disconnected wiring like the rest of today's fixes. Recommended for backlog, not attempted as a bug fix.
- **SUP-03/SUP-04** — Ticket close/reopen/cancel/creation customer notifications have no pre-built processor case or email template to wire up (unlike `resolve`, which already had `'ticket-resolution'` waiting). Building these means writing new templates and new handlers — explicitly out of scope for a "fix existing gaps" pass per this mission's "do not create new features" framing.

## Fixed in the follow-up pass (see issues-fixed.md for full detail)

SUP-01, SUP-02, OPS-01, OPS-02, AI-01 (original pass) plus, in direct response to "fix remaining issues": DR-05 (silent failure with no AI agent configured → now escalates), AI-06 (connector encryption key added to the production fail-fast list), DR-03 (all 16 BullMQ processors now have explicit `stalledInterval`/`lockDuration`/`maxStalledCount`), DR-01 (AI-timeout customer fallback message, gated on terminal retry attempt so it can't be sent 3x), SUP-09 (`NotificationService` now re-throws instead of swallowing, so the DLQ infrastructure its callers already extend actually engages), and `notification-queue.processor.ts`'s `default:` case (was throwing, now warns+acknowledges like every other processor fixed today).

## New discovery while attempting OPS-04 — two parallel, unsynced agent-availability systems

Investigating "no reassignment when an agent goes offline" surfaced something more fundamental than the original finding: there are **two separate availability-tracking systems** that don't appear to reference each other:
- `InboxPresenceService` / `inboxPresence` table (`status: ONLINE/OFFLINE/AWAY/BUSY`, `lastSeenAt`, plus a `heartbeat()` method) — used by the realtime inbox UI.
- `AgentAvailabilityService` / `AgentAvailability` (a separate status field) — this is the one `AgentAssignmentService.assignEntity()` actually queries when picking an agent for new auto-assignments.

Neither system has automatic offline-detection: both `setPresence()` and `updateAvailability()` are explicit-action-only (an agent or admin sets the status). `heartbeat()` exists and updates `lastSeenAt`, but nothing currently checks for staleness and flips status to OFFLINE. This means even "is this agent online" is not a single source of truth in this codebase today.

**This was not fixed.** Building a reassignment sweep on top of two systems whose relationship isn't established would risk either: building a sweep against the wrong system (so it has no effect on actual auto-assignment behavior), or papering over a deeper consistency question that should be a deliberate architecture decision (consolidate to one system, or define how they're meant to relate) rather than something to guess at while wiring a notification job. Recommended as the top item for the next architecture-level pass, not a quick fix.

## Needs new infrastructure (medium-to-large effort, not a quick wire-up)

- **DR-02 — `submitToolResult()` failure leaves the AI workflow hung.** Fix should decouple tool-result submission into its own durable queued job (reusing `AdminIncidentService` for operator visibility on repeated failure) instead of a synchronous fire-and-forget call inside the tool-execution path.
- **AI-04/AI-05 — Workflow approval timeouts and failed-execution dead-lettering.** Both real, both need new scheduled/queue plumbing, not a config flip.
- **OPS-03/OPS-05/OPS-06/OPS-07/OPS-08 — Agent/manager productivity gaps** (bulk actions, workload visibility, undo, reassignment tooling, shortcuts). All are net-new endpoints/UI surfaces, not fixes to broken existing code — explicitly out of scope for this pass, listed for product backlog.

## Quick win identified but not yet implemented

- **DR-07** — `readDb` (reader pool) has zero callers anywhere outside `db.ts` - confirmed by direct grep, not speculation. However, wiring it into read-heavy repositories is **not** a safe mechanical find-replace: each call site needs a judgment call about replication-lag tolerance (e.g. a list-inbox read can probably tolerate a few hundred ms of staleness; reading data immediately after writing it in the same request likely can't). Recommended as a per-repository review, not a blanket change.

## Not independently re-verified this pass (single-source claims, treat with appropriately lower confidence)

AI-03 (RAG bypasses knowledge ACLs), AI-07 (cross-tenant connector circuit breaker), AI-08 (AI tool-action audit trail), DR-04 (file upload failure handling), DR-06 (Redis-down rate-limiter behavior). These came from a single research pass each rather than being directly verified against the source the way every Critical-rated item and the items above were. Recommended to verify before committing fix effort, given two other raw claims this session (search isolation, snooze auto-wake) turned out to be false on direct inspection.
