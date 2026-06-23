# Retest Results

## What was actually exercised end-to-end vs. verified by other means

| Fix | Retest method | Result |
|---|---|---|
| OPS-02 (realtime analytics real data) | Ran the exact new SQL queries directly against the live local database (bypassing HTTP/auth) | `activeConversations: 3`, `queuedTickets: 3`, `activeAgents: 0`, `ticketSla: {total: 5, compliant: 4}` — all real, all plausible, no errors |
| OPS-01 (ticket/conversation analytics wiring) | Typecheck + full Jest run only — **not** exercised via a live enqueue→consume round trip | Typechecks clean; not live-retested this pass |
| SUP-01 (SLA breach notification) | Typecheck + full Jest run only — **not** exercised by forcing a real SLA breach through the sweep job | Typechecks clean; not live-retested this pass |
| SUP-02 (ticket-resolution notification) | Typecheck + full Jest run only — **not** exercised by calling `resolve()` against a seeded ticket+customer | Typechecks clean; not live-retested this pass |
| AI-01 (confidence/escalation gating) | Typecheck + full Jest run only — **not** exercised against a real AI platform response with a deliberately low confidence score | Typechecks clean; not live-retested this pass |
| `/v1/widget/session/start` 400 (carried over fix) | Live HTTP call against the running dev server | Returns 400 as expected |
| `/health/live`, `/health/ready` (carried over fix) | Live HTTP call against the running dev server | `/health/live` → 200; `/health/ready` → 200 with all 4 components UP including real AI platform latency (~260ms) once `EASYDEV_AI_URL` was corrected |
| `/metrics` HTTP request counting (carried over fix) | Live HTTP call against the running dev server | `http_requests_total` populated with real method/route/status/tenant labels |

**Honest gap:** the four fixes made in direct response to this gap-analysis mission (analytics event wiring, SLA-breach notification, ticket-resolution notification, AI confidence gating) were verified by typecheck + the existing automated test suite, and one of them (the realtime-analytics SQL) was additionally verified by direct query execution against real data. None of the four were exercised through a full authenticated HTTP round trip (seed a tenant → create a ticket → breach its SLA → assert the notification job was enqueued with the right payload), because that requires test fixtures (a real ticket, a real customer with an email, a real SLA policy) that don't currently exist in this dev environment and take meaningful setup time to construct safely. Recommended before sign-off: a small integration test or manual run-through for each of these four specifically.

## Regression check on permission validation, audit logging, realtime events, tenant isolation

- **Tenant isolation:** unaffected by any fix this pass — none of the four fixes touch `tenantId` scoping, and the queries added (OPS-02) all explicitly filter by `tenantId`.
- **Audit logging:** `ticket.service.ts`'s `resolve()` still calls `auditService.log()` exactly as before; the new notification block was added after it, doesn't replace or skip it.
- **Permission validation:** no `@Roles`/`@UseGuards` decorators were touched by any fix this pass.
- **Realtime events:** `ticket.service.ts`'s `persist()` (which emits the realtime ticket-update event) runs before the new notification block in `resolve()` — unaffected.
