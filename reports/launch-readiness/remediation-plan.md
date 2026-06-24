# Remediation Plan — Path to Go-Live

Status: **COMPLETE. All 10 audit domains done.** 60 risk items found total; 6 were fixed directly during this audit pass (see "Already fixed" below). Sequenced so each phase is independently shippable and verifiable. Every item references its `risk-register.md` ID.

## Already fixed during this audit pass

No action needed - listed here so remediation work doesn't duplicate it. All verified with `tsc --noEmit` + Jest passing.

- **RR-31**: `PermissionsGuard` (IAM) now checks `request.query?.tenantId` in addition to `request.params?.tenantId`, closing the cross-tenant query-param spoofing gap - including in the `tenant-admins` endpoint built earlier this engagement.
- **RR-32**: `LogsService` (IAM) now always enforces the caller's own tenant for non-super-admins across all 6 log/export methods, instead of only filtering when a tenantId happened to be supplied.
- **RR-33**: `RbacService.updateRole`/`deleteRole` (IAM) now reject cross-tenant or system-role modification by non-super-admins.
- **RR-34**: `SsoService.listUserGrants`/`ProductOwnershipService.listForUser` (IAM) now validate the target user belongs to the caller's tenant before returning anything.

## Immediate - outside the normal remediation timeline

| ID | Action | Why it can't wait |
|----|--------|---------------------|
| RR-43 | **Rotate the MongoDB and Azure Storage credentials committed in file-upload-service's `env` file, today.** Then check whether that file was ever pushed to a remote; if so, scrub git history. | This is a live credential exposure, not a backlog item. Every day it sits is a day those credentials are usable by anyone with repo access. |
| RR-55 | **Wire `ChannelMessageService.processIncomingWebhook()` to actually create a Conversation** (call into `MessageInboundService.ingest()` or equivalent). | Every channel except the embeddable widget is currently non-functional for receiving customer messages. This is a core-functionality gap, not a hardening item - arguably more urgent than several of the Phase 0 security items below, since the product doesn't work for these channels at all right now. |

## Phase 0 — Critical, blocks any go-live decision

None require architectural rework — each is a scoped, identifiable fix.

| ID | Fix | Where | Effort |
|----|-----|-------|--------|
| RR-01 | Wire `WorkflowApprovalTimeoutScheduler`'s expiry sweep to actually call `resumeExecution()` on the paused `WorkflowExecution`, not just reject the approval row. | `workflow-approval.service.ts:137-171` | Small |
| RR-02 | Add `checkAccess`/`checkPermission` enforcement to `KnowledgeSearchController.search()` and `PublicKnowledgeController` (search + `getDocumentBySlug`). Confirmed within-tenant only, not cross-tenant - still Critical for the tenants affected. | `knowledge-search.controller.ts`, `public-knowledge.controller.ts` | Small-Medium |
| RR-03 | Wire real backend services behind Traefik with TLS, or document + verify the actual production topology if something else handles this. | `infra/docker-compose.yml`, `infra/traefik/` | Medium (infra work) |
| RR-25 | Wire the existing `requireOwnership()` middleware into file-upload-service's download route. | `fileController.js:150`, `rbac.js:162-201` | Small |
| RR-35 | Add a private-IP/internal-hostname block before `connector-health.service.ts`'s health-check request (SSRF). | `connector-health.service.ts:81` | Small-Medium |
| RR-36 | Encrypt `connector_webhooks.secret` at rest (currently plaintext, used for HMAC signing). | Migration + `connector-webhooks` write path | Medium |
| RR-37 | Remove all hardcoded fallback secrets across easydev-support-ai; extend `validate-env.ts` to fail closed at boot if any are missing. | 6+ locations, see `risk-register.md` RR-37 | Medium |
| RR-38 | Encrypt `twoFactorSecret` at rest (IAM); make backup-code encryption fail closed instead of silently degrading to plaintext. | `schema.prisma:32`, `two-factor.service.ts:67` | Medium |
| RR-39 | Add `@Throttle` to IAM's login/refresh/otp-verify/password-reset/all of two-factor.controller.ts; fix notification-service's OTP attempt cap to actually reject after N tries. | IAM auth controllers, notification-service OTP service | Small-Medium |
| RR-40 | Make notification-service's `x-tenant-id` mandatory and validated; actually verify inbound webhook signatures before trusting payloads. | notification-service webhook/tenant-scoping code | Medium |
| RR-41 | Enable multi-tennet-ai-agent's existing encryption module by default; fix the CORS wildcard+credentials combination. | `app/db/models.py`, FastAPI CORS config | Small-Medium |
| RR-42 | Require auth on exposed MongoDB/Redis ports; bind to internal network only where external access isn't needed. | Various `docker-compose.yml` files | Medium (infra work) |
| RR-50 | Finish the stubbed steps in `restore-postgres.sh` (PITR branch) and `restore-redis.sh` (the actual file-swap step) - both currently simulate rather than execute the critical recovery action. | `deployment/disaster-recovery/scripts/` | Medium |

## Phase 1 — High severity, fix before launch or get explicit stakeholder sign-off to accept as a known risk

| ID | Fix | Where | Effort |
|----|-----|-------|--------|
| RR-04 | Make brute-force lockout actually work: increment the fail counter on every failed attempt, enforce a real block at threshold. | `auth.service.ts:654-712` | Small |
| RR-05 | Add a uniqueness guard against duplicate ACTIVE subscriptions per tenant. | `subscription.service.ts:102-154`, `prisma/schema.prisma` | Small-Medium |
| RR-06 | Implement proration + limit re-enforcement on plan upgrade/downgrade. | `subscription.service.ts:520-624` | Medium (needs a product decision) |
| RR-07 | Include `TRIALING` in the renewal/expiry sweep. | `subscription.service.ts:916-923` | Small |
| RR-08 | Remove the hardcoded fallback connector-credential encryption key; move to authenticated AES-GCM. | `credential-manager.ts:14-16` | Small-Medium |
| RR-26 | Establish real Prisma migration history for IAM and payment-microservice; stand up backup automation for both. | Both repos' `prisma/` | Medium-Large |
| RR-27 | Apply the existing resilient Redis pattern to the 4 hot-path security call sites missing it. | `permission.guard.ts`, `session-security.service.ts`, `webhook-security.service.ts`, `ai-security.service.ts` | Small |
| RR-44 | Add `helmet` to easydev-support-ai's NestJS bootstrap. | `main.ts` | Small |
| RR-45 | Add stricter per-endpoint rate limits to payment charge/refund and widget ingestion endpoints. | payment-microservice, easydev-support-ai widget controllers | Small-Medium |
| RR-51 | Add replay/requeue logic for stalled BullMQ jobs instead of deletion. | `runbooks/api_worker_failure.md`'s underlying recovery code | Medium |
| RR-52 | Correct `multi-tennet-ai-agent`'s DR documentation to state the actual single-region posture (quick) - building real region-failover is a separate, larger decision. | `disaster-recovery.md` | Small (doc fix) / Large (real capability) |
| RR-53 | Correct file-upload-service's README to match its own `PRODUCTION_READINESS.md`'s more honest self-assessment. | `README.md` | Small |
| RR-56 | Fix help-center's branding to not be gated on login; render the fetched logo in customer-widget and admin-portal. | Frontend, `tenant-branding.tsx` and per-app usage | Small-Medium |
| RR-57 | Add `isError` handling to key data-fetching components; add route-level `error.tsx` boundaries for high-traffic routes, across all 4 frontend apps. | Frontend | Medium |

## Phase 2 — Medium severity, fix before launch (lower urgency, still recommended)

| ID | Fix | Effort |
|----|-----|--------|
| RR-09 | Remove the placeholder `api.easydev.ai` AI-platform-URL default so misconfiguration fails loudly. | Small |
| RR-10 | Split IAM's health endpoint into real `/live`/`/ready`; report Redis status honestly. | Small |
| RR-11 | Add Prometheus alert rules for IAM, payment-microservice, notification-service, file-upload-service. | Medium |
| RR-12 | Build a real deploy pipeline for file-upload-service; write rollback runbooks for IAM/payment/notification. | Medium |
| RR-15 | Fix the hardcoded `'dummy-report-id'` in the analytics export download endpoint. | Small (trivial) |
| RR-17 | Remove `// @ts-nocheck` from `ConversationResolutionService`. | Small-Medium |
| RR-19 | Add server-side file-size/MIME verification for knowledge document uploads. | Medium |
| RR-28 | Wrap payment-microservice's idempotency Redis calls in try/catch. | Small |
| RR-29 | Add batching/pagination to the subscription renewal sweep. | Small |
| RR-30 | Add post-upload virus scanning; wire `expiresAt` to a cleanup job; fix `LocalAdapter`'s fake signed URL. | Medium |
| RR-46 | Make the 4 "silently degrade" patterns (IAM backup codes, payment CORS, file-upload S3 encryption, Traefik dashboard credential) fail closed instead. | Small-Medium each |
| RR-54 | Decide whether per-tenant PITR is a real requirement or an accepted architectural limitation of the shared-schema design. | Decision, not code |
| RR-58 | Adopt `@easydev/permissions` consistently across frontend apps. | Medium |

## Phase 3 — Low severity / backlog, post-launch acceptable

RR-13, RR-14, RR-16, RR-18, RR-20, RR-21, RR-22, RR-23, RR-24, RR-47, RR-48, RR-49, RR-59, RR-60 — see `risk-register.md` for full detail. None block a launch decision on their own.

## Before this plan can be called complete

1. **Get direct operator attestation** for the 4 things no code audit can answer: backups tested, restores tested, support team trained, on-call rotation established (Go-Live Gates 4, 5, 9, 10).
2. **Re-verify every Phase 0/1 fix** with the same rigor as the original finding (file:line, live test where feasible) before re-issuing the certification - especially RR-55 (the channel pipeline fix) and RR-43 (credential rotation), since both have product-wide blast radius if the fix is incomplete.
3. **Re-test the 5 tenant-isolation fixes already applied** (RR-31 through RR-34) with actual cross-tenant requests, not just static review, before treating that category as fully closed.

## Suggested sequencing for a small team

The "Immediate" items (RR-43, RR-55) should start today, in parallel with everything else - they're not part of the phased rollout, they're already-late. Then: Phase 0 (1-2 weeks, given the volume - RR-37/38/39's secrets/auth work and RR-50's DR-script work are the long poles) → Phase 1 (1-2 weeks in parallel with finishing Phase 0, RR-06/RR-26 are the long poles) → Phase 2 as capacity allows → re-certify. Given the volume of Critical findings (14 total across Phase 0 + Immediate), recommend treating this as a focused 2-3 week security/correctness sprint before re-attempting certification, not a side-of-desk cleanup.
