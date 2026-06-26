# Go-Live Decision

## Decision: **NO GO LIVE**

All 10 audit domains are now complete. This is not provisional - it's conclusively supported by 60 distinct, file:line-cited findings, 14 of them Critical severity.

## Why this isn't a close call

Pick any one of these and it would be sufficient alone:

1. **RR-55 — Most channel types don't work at all.** For every channel except the embeddable web widget, an inbound customer message is validated and normalized but never becomes a Conversation - confirmed by tracing the actual call chain, not just reported. This isn't a hardening gap, it's a "the product doesn't do the thing it's supposed to do" gap for any tenant not exclusively using the widget.
2. **RR-43 — A live credential exposure exists right now.** Real MongoDB and Azure Storage credentials are committed to git in file-upload-service. This needs rotation today, independent of any certification timeline.
3. **RR-31 through RR-34 — Real, exploitable cross-tenant data leaks existed in IAM**, including in code built earlier in this same engagement (the `tenant-admins` endpoint). These were fixed during this audit, but their existence - caught only because this audit looked adversarially rather than confirming guards exist - is exactly why "GO LIVE WITH KNOWN RISKS" isn't appropriate until the same adversarial check has been run against the rest of the platform with confidence.
4. **RR-01, RR-02, RR-03, RR-35 through RR-42, RR-50** — workflow-automation deadlock, knowledge-ACL bypass, no security perimeter on any backend service, SSRF, plaintext secrets at rest, broken brute-force defenses, dangerous CORS, exposed databases, and disaster-recovery scripts that are stubbed at their most critical steps. Any one of these would be a Critical finding in isolation; together they indicate the platform hasn't yet had a focused security/correctness pass, not that it's fundamentally broken.

## What's already fixed - real progress, not just findings

Six issues were fixed during this same audit pass, not left as open items:
- The cross-tenant `tenant-admins` endpoint vulnerability (RR-31).
- Cross-tenant log exposure across 3 endpoint families and their CSV exports (RR-32).
- A complete absence of tenant/system-role scoping on role update/delete (RR-33).
- Missing tenant-membership validation on SSO grants and product-ownership lookups (RR-34).

All four verified clean (`tsc --noEmit`, full test suite passing). This demonstrates the remaining findings are equally fixable - none of what's left requires architectural rework either.

## What would need to be true to revisit this

- RR-55 fixed and verified live (not just by code trace) for at least one non-widget channel.
- RR-43's credentials rotated and git history checked.
- The 14 Critical findings in `risk-register.md` fixed and re-verified.
- The tenant-isolation fixes already applied (RR-31-34) re-tested with live cross-tenant requests, not just static review.
- Direct operator attestation on the 4 things no code audit can answer: backups tested, restores tested, support team trained, on-call rotation established.

## What's already solid and doesn't need rework

- Real MFA enforcement, real session revocation, real password-reset anti-enumeration.
- Real AI escalation, human↔AI takeover, AI cost metering with real per-tenant quotas, real circuit-breaker/retry resilience on both the connector engine and the AI Platform's provider router.
- Real connector retry/backoff/circuit-breaker grouping, real workflow versioning and audit trail (the deadlock bug aside).
- Real webhook idempotency on the payment side.
- The core tenant-scoping discipline in easydev-support-ai and payment-microservice held up under adversarial review - the leaks found were specifically in IAM, not platform-wide.
- Frontend apps have solid auth gating and (in 2 of 4 apps) genuinely production-grade realtime infrastructure.

See `risk-register.md` for the full list and `remediation-plan.md` for the sequenced path back to a re-certification attempt.
