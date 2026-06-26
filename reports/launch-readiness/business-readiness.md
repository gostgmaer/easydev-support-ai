# Business Readiness

Source: Billing + Analytics readiness audit (completed this pass) - payment-microservice and easydev-support-ai's analytics module. Full findings in `backend-readiness.md`'s Billing/Analytics sections; this file gives the business-facing verdict.

## Revenue operations: not yet accurate

The audit's own bar ("revenue operations are accurate") is not met:

- **Duplicate active subscriptions are possible** (RR-05) - no guard against `createSubscription` being called twice for the same tenant (e.g. a retried checkout request), and no DB constraint preventing two ACTIVE rows. This is a direct double-billing/entitlement-confusion risk, not theoretical.
- **Plan downgrades don't enforce the new plan's limits and have no proration** (RR-06) - a tenant who downgrades keeps full upgraded-tier access and resource limits indefinitely. This is real, ongoing revenue leakage, not a one-time bug.
- **Trial subscriptions never expire automatically** (RR-07) - the renewal sweep explicitly excludes `TRIALING` status, so an expired trial sits in that state forever unless someone manually intervenes. Free usage continues indefinitely past the intended trial window.
- **No usage-based metering exists at all** - billing is flat-rate only. The plan-quota sync that's supposed to connect billing plan data to actual resource enforcement (`UsageLimitService`) is a confirmed no-op today (this is the same gap already tracked as TEN-03 in `business-gap-analysis/remaining-risks.md` - not a new finding, but directly relevant to business readiness).

## What's solid

- **Webhook idempotency is correctly implemented** - a Redis lock plus persisted event-ID dedupe, with signature verification before any DB write, for both Stripe and Razorpay. This is the part of payment processing most prone to subtle bugs (duplicate webhook delivery double-processing a payment), and it's been done right.
- **Invoice generation is real and atomically tied to actual payment events** - not fabricated or estimated, genuinely created in DRAFT and advanced through real state transitions tied to provider confirmation.
- **Conversation, ticket, agent, and AI analytics are real**, computed from genuine event/usage data, not mocked.

## Reporting gaps

- **No revenue analytics category exists** in easydev-support-ai's analytics module at all - finance/ops have zero automated visibility into revenue trends, broken out by plan, or tied to usage.
- **Knowledge analytics category doesn't exist** either, despite being in the original audit's expected scope.
- **The export download endpoint is broken** - a hardcoded placeholder ID (`'dummy-report-id'`) means a customer who generates an analytics export can never actually download it via the documented endpoint (RR-15). This is a simple, cheap fix, but as-is it's a customer-facing broken feature, not a missing one.

## Verdict

**Not business-ready as-is.** The billing gaps (duplicate subscriptions, no downgrade enforcement, trials that never expire) are the kind of issue that erodes revenue quietly and would be hard to detect after the fact without dedicated reconciliation reporting — which also doesn't exist yet. None of these require a redesign; they're concrete, scoped fixes (a uniqueness constraint, a trial-inclusive renewal sweep, a proration/limit check on plan change). Recommend treating RR-05/06/07 as launch blockers and the analytics gaps as fast post-launch follow-ups with an explicit stakeholder sign-off if deferred.
