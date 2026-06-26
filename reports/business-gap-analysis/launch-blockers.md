# Launch Blockers

## Status: all three originally-identified hard blockers are now fixed

1. ~~No tenant resource/cost enforcement (TEN-01, TEN-02).~~ **Fixed.** `UsageLimitService.enforceLimit()` now hard-blocks conversation creation, connector installation, and AI auto-response once a tenant reaches its plan's `maxConversations`/`maxConnectors`/`maxAiRequests`, and opens an operational incident so ops has overage/billing visibility.
2. ~~AI platform failure leaves the customer with total silence (DR-01).~~ **Fixed.** Customer now gets a one-time "we're having trouble, a team member will follow up" message, correctly gated to the terminal retry attempt only.
3. ~~Notification delivery has no retry or failure visibility (SUP-09).~~ **Fixed.** `NotificationService` now propagates failures into the retry/DLQ infrastructure its callers already extend.

**TEN-03/TEN-04 (billing-plan sync, feature-flag gating) remain open** but are a different, narrower risk than the original "zero enforcement" finding: a tenant's resource *usage* is now capped at their plan limit regardless of whether their billing subscription status or tier-gated feature flags are independently in sync. This is a monetization-completeness gap (a tenant could be on an expired/downgraded plan with stale cached limits until something re-syncs them), not a "tenant can use unlimited resources for free" gap. Recommended before general commercial launch, but distinctly lower severity than what it replaces.

## Should still fix before launch, doesn't block a controlled/invite-only launch

- AI-03 is now fixed (AI knowledge retrieval correctly excludes internally-restricted documents).
- Remaining workflow risk is AI-02/AI-07 class items (connector permission granularity, cross-tenant breaker grouping) — both confirmed real, both judged lower-value-relative-to-risk this pass.
- TEN-03 (above) — investigated the real payment-microservice directly: confirmed not a quick fix (missing endpoint, no tenant↔billing-customer mapping, no quota fields on Plan anywhere). User confirmed: leave as-is rather than modify a sibling service's data model as a drive-by change.
- TEN-04 (above) — needs a product decision on which endpoints are tier-gated.

## Does not block launch

OPS-06/07/08 (undo, manager bulk-reassign tooling, keyboard shortcuts) and AI-08 (structured tool-action audit trail) — genuine improvements, none launch-blocking on their own.

## Bottom line

This further narrows the same-day Business Validation verdict. The morning's hardening pass closed the infrastructure blockers. This gap-analysis pass found three business-logic blockers and closed all three. **No identified hard blocker remains for a closed/invite-only pilot, and the remaining gap for general self-serve commercial launch (TEN-03/TEN-04 billing/feature-flag sync) is narrower and lower-severity than the zero-enforcement gap it replaces.** Recommend a focused look at TEN-03/TEN-04 and AI-03 before opening up to general self-serve signup; everything else identified today is a real improvement, not a blocker.
