# Customer Onboarding Readiness

**Audit completed, then independently re-verified by direct code trace given the severity of what it found.** Verdict: a new customer **cannot** go from zero to first conversation in under 60 minutes today - not due to friction, but because the chain is broken at multiple points, one of which is severe enough to warrant its own entry as the most significant functional finding in this entire certification (RR-55).

## Walkthrough, step by step

1. **Tenant creation** - admin-only. `POST /tenants` requires `TENANT_CREATE` permission. `POST /auth/register` is public but only adds a user to the *existing default* tenant. **There is no real self-service tenant signup.**
2. **Branding** - working: `PUT /v1/settings/branding`.
3. **Channel configuration** - working: `POST /v1/channels` (confirmed real and tested earlier this engagement).
4. **Connector configuration** - working: `POST /v1/connectors/install` (confirmed real and tested earlier this engagement).
5. **Knowledge configuration** - working: `POST /v1/knowledge-documents`.
6. **AI configuration** - working, per-tenant: `PUT /v1/settings/ai`.
7. **Workflow configuration** - the originally-dispatched audit flagged `POST /v1/workflows` as a stub. **Important nuance, confirmed elsewhere this engagement**: that's the orphaned, unregistered `WorkflowsController` - the real, working workflow creation endpoint is `WorkflowTemplateController`'s `POST /v1/workflows/templates`, which is genuinely wired and was the one gated behind the `workflow.automation` feature flag earlier this pass. So this step is **not actually broken**, provided onboarding documentation/tooling points customers at the real endpoint and not the dead one.
8. **Agent invite** - partially real: `POST /tenants/:id/users` sends a genuine invite email, but only for an *existing* user record - no atomic "invite a stranger by email, they accept and create an account" endpoint was found.
9. **First conversation received** - **confirmed broken for every channel except the embeddable web widget.** See below - this is RR-55, independently re-verified by tracing the actual call chain, not just taken on the original audit's word.

## RR-55 in detail (independently confirmed via direct trace)

Two parallel inbound message pipelines exist and were never connected:

- **Pipeline A** (`InboundController` → `MessageInboundService.ingest()`) genuinely works - resolves or creates a real Conversation, persists a real Message.
- **Pipeline B** - the one every channel webhook (WhatsApp, Slack, Telegram, Email, Facebook, Instagram, Teams) actually goes through (`ChannelWebhookController` → `ChannelWebhookService` → `ChannelMessageService.processIncomingWebhook()`) - validates, normalizes, and publishes two analytics-only events, then stops. It never calls into Pipeline A. Confirmed via grep that the only subscriber to those published events anywhere in the codebase is the analytics consumer.
- **The customer-widget channel is unaffected** - it has its own dedicated, independently-working message-send path (`widget-chat.controller.ts`) that never touches either pipeline above.

**Practical impact**: a tenant who only uses the embeddable web widget is fine. A tenant who connects WhatsApp, Slack, Email, or any other channel will have those messages silently validated-and-dropped from ever becoming a conversation - probably the single most damaging finding for any tenant whose primary channel isn't the widget.

## Verdict

**Not ready**, but more precisely fixable than "the product doesn't work" - it's two specific, identifiable gaps:

1. Build a real self-service tenant signup flow, or explicitly accept that onboarding remains an admin-assisted process (a legitimate product choice, just needs to be a stated decision, not an assumed gap).
2. Wire `ChannelMessageService.processIncomingWebhook()` to actually call into `MessageInboundService.ingest()` (or equivalent) - the conversation-creation logic already exists and works in Pipeline A; it just needs to be invoked from Pipeline B. This is the highest-priority fix in this entire onboarding category, and arguably one of the highest-priority fixes in the whole certification, since it affects every non-widget channel's core functionality.

The "60 minutes from zero to first conversation" bar cannot be met until #2 is fixed, regardless of how fast every other individual step is.
