# Support Readiness

This category splits into two halves with very different status. Both are now audited.

## Support OPERATIONS readiness — AUDITED, mostly solid, with one important caveat

Source: Customer Support Operations + AI Operations audit. Full detail in `backend-readiness.md`.

The functional support workflow - conversation routing, agent assignment (genuinely skill/load-aware, not a stub), escalation/transfer, internal notes, @mentions (real notifications), bookmarks, snooze-with-auto-wake, and the ticket/conversation state machine - is real and enforced end-to-end **once a conversation exists**. A support team could operate the core conversation/ticket lifecycle today without engineering intervention for normal cases.

**Important caveat, found by the later Customer Onboarding audit (RR-55)**: for every channel except the embeddable web widget, a conversation never gets created in the first place - the channel-webhook pipeline normalizes inbound messages and publishes analytics-only events, never reaching the conversation-creation logic. So "support operations are solid" is true and real, but only for conversations that exist - which today means widget conversations, not WhatsApp/Slack/Email/etc. See `customer-onboarding-readiness.md` for the full trace.

The other notable risk here is operational-quality rather than functional: `ConversationResolutionService`, which orchestrates the resolve → notify-customer → CSAT → close → analytics chain, runs with `// @ts-nocheck` (RR-17) - meaning a type error in this specific multi-step business flow would only be caught at runtime, in production, on the highest-traffic lifecycle path in the module. Recommend removing the suppression and fixing whatever surfaces before launch; it's a contained, low-effort fix for a meaningfully reduced risk.

AI-assisted support (draft suggestions, confidence-based escalation, human↔AI takeover) is real and functions as a genuine assist rather than a blocker - see `backend-readiness.md`'s AI Operations section for full detail.

## Support TEAM readiness (documentation, runbooks, training) — AUDITED

| Doc Type | easydev-support-ai | IAM | payment-svc | notification-svc | file-upload-svc | AI agent | infra |
|---|---|---|---|---|---|---|---|
| Admin/Agent Guide | EXISTS (`PRODUCT_MANUAL.md`) | — | — | — | — | — | — |
| Connector Guide | EXISTS | — | — | — | — | — | — |
| Knowledge Guide | EXISTS | — | — | — | — | — | — |
| Workflow Guide | EXISTS | — | — | — | — | EXISTS | — |
| Troubleshooting | — | — | — | EXISTS | partial | EXISTS | — |
| Runbooks/Incident Response | EXISTS (4 files, read in full - real, concrete procedures, see `disaster-recovery-readiness.md`) | — | — | — | — | EXISTS (16 procedures) | — |
| Production Readiness self-assessment | partial | EXISTS, credible (spot-checks confirmed accurate) | — | — | EXISTS, but **overstated** (see below) | EXISTS, candid (self-scored 76/100) | — |

**file-upload-service's `PRODUCTION_READINESS.md` is not credible as "production-ready"** as the broader README implies: the doc itself self-labels "NEARLY READY," documents real committed MongoDB/Azure credentials needing rotation (RR-43 - an active incident, not a backlog item), and admits "No metrics endpoint yet" - independently confirmed true (zero real metrics instrumentation found, only an auto-tag CI workflow with no actual deploy pipeline). The doc is internally honest; the broader claim built on top of it is not.

**multi-tannet-auth-services' own production-readiness checklist holds up** - three independent spot-checks (rate limiting, helmet/CORS, graceful shutdown+JWKS) all confirmed accurate against the actual code, even though the broader security audit (RR-38, RR-39) found real gaps the checklist doesn't cover (TOTP rate limiting specifically).

payment-microservice, notification-service, and `infra/` have no runbooks or incident-response documentation at all.

## Verdict

Support **operations** are real and solid for the conversations that actually get created - with the major caveat that most channel types don't currently create conversations at all (RR-55). Support **team enablement** is genuinely mixed: easydev-support-ai and `multi-tennet-ai-agent` have real, substantive documentation; the other 4 services have little to none. `file-upload-service`'s self-assessment is the one documentation-integrity concern worth flagging on its own - its README overstates readiness in a way its own more detailed doc contradicts.
