# Launch Blockers

Distinguishing genuine blockers (will cause real harm/failure for paying customers in normal operation) from recommended improvements (real gaps, but the platform functions without them).

**Update after the follow-up fix pass:** blockers #2 (AI timeout → customer silence) and #3 (notification delivery had no retry/visibility) from the original assessment are now fixed — see `issues-fixed.md`. Only the billing/quota enforcement gap remains as a hard blocker for general commercial launch.

## Blocks general (unrestricted, self-serve, paid) commercial launch

1. **No tenant resource/cost enforcement (TEN-01, TEN-02, TEN-03).** A tenant on the cheapest plan can consume unlimited conversations, AI tokens, and connector executions with zero rejection — there is no enforcement point anywhere in the request path. This isn't a missing nicety, it's a missing monetization/abuse control: the billing model has no technical backing. For a closed/invite-only pilot with trusted tenants this is acceptable to launch without; for general self-serve signup it is not.

## Fixed since the original assessment

2. ~~AI platform failure leaves the customer with total silence (DR-01).~~ Fixed: the customer now gets a "we're having trouble, a team member will follow up" message, sent exactly once (gated on the terminal BullMQ retry attempt, not every attempt).
3. ~~Notification delivery has no retry or failure visibility (SUP-09).~~ Fixed: `NotificationService` now propagates failures into the retry/DLQ infrastructure its callers already extend, instead of swallowing them.

## Should fix before launch, but doesn't block a controlled/invite-only launch

4. No automatic reassignment when an agent goes offline mid-conversation (OPS-04) — investigation surfaced a deeper issue (two parallel, unsynced agent-availability systems, neither with automatic offline-detection) that needs an architecture decision before a sweep can be built correctly. Conversations get stuck, but a manager can manually notice and reassign in a small pilot.
5. AI tool-call/connector-permission gaps (AI-02, AI-03) — real, but exploitable only by a tenant's own configured AI agent against their own tenant's connectors/knowledge in the cases verified; cross-tenant impact not established.
6. Workflow approval/failure handling gaps (AI-04, AI-05) — affects tenants actively using workflow automation with approval steps; not all tenants will hit this immediately.

## Does not block launch (real, but lower-impact or cosmetic)

Everything in `remaining-risks.md`'s "agent/manager productivity gaps" section (bulk actions, undo, workload dashboards, keyboard shortcuts) and "quick wins" section (connector key fallback, BullMQ stall config, missing-AI-agent error message, read-replica usage) — genuine improvements, none are launch-blocking on their own.

## Bottom line

This narrows the earlier same-day Business Validation verdict ("FAIL for general multi-tenant commercial launch; PASS WITH WARNINGS for a closed/invite-only pilot") further than it stood after the morning's hardening pass alone. Today's hardening pass closed the infrastructure-level blockers (ValidationPipe, health checks, DB/queue resilience, CORS, upload security, env validation). This gap-analysis pass found and then closed two of the three business-logic blockers it surfaced (AI-failure customer silence, notification reliability). **The single remaining hard blocker for general self-serve commercial launch is tenant resource/cost/billing enforcement (item 1 above).** A closed/invite-only pilot with trusted tenants was already reasonable and remains so.
