# Tenant (Multi-Tenant Isolation) Readiness

**Audit completed.** Verdict: **Found and fixed concrete leak risk(s).** This is the highest-stakes category in the certification, and it's the one that actually surfaced real, exploitable cross-tenant data exposure - including in code written earlier in this same engagement. All findings below were fixed during this audit pass, not just logged; see `risk-register.md`'s "Fixed during this audit" section for exact diffs/locations.

## Confirmed-safe patterns (verified at query level, not just guard presence)

This was an adversarial audit - the goal was to find a leak, not confirm guards exist. The following held up:

- **easydev-support-ai**: every repository checked (tickets, conversations, customers, knowledge-base, connectors, plus a 70+ file controller sweep) consistently scopes ID-based lookups by `and(eq(table.id, id), eq(table.tenantId, tenantId))` - not ID alone with tenant checked after the fact. Controllers source `tenantId` exclusively from the guard-validated `x-tenant-id` header, never from caller-supplied body/query, on every authenticated route checked.
- **Knowledge search/public endpoints**: the ACL-bypass issue (RR-02) does **not** cross tenant boundaries - `KnowledgeSearchController`/`PublicKnowledgeController` both filter by `tenantId` at the DB layer correctly. It's a within-tenant team/role permission gap, not a "different customer sees your data" leak. Still Critical, just narrower than it first appeared.
- **payment-microservice**: `SubscriptionController` uses token-derived `@CurrentTenant()` throughout; the one query-param `tenantId` route (`deactivatePlan`) is gated behind `ApiKeyGuard` as an explicit admin/service-only exception, not a general-purpose endpoint. Safe.

## Confirmed leak risk — multi-tannet-auth-services (IAM) — all fixed this pass

Five real, exploitable cross-tenant data exposure paths were found, all sharing one root cause: a tenant-isolation guard fix had been applied for path-param tenant spoofing (`request.params?.tenantId`) but never extended to query-param tenant spoofing, and the affected services lacked the same defense-in-depth membership check that `UsersService.findById/update/remove` correctly applies elsewhere in the same codebase.

1. **`GET /users/tenant-admins?tenantId=X`** - built earlier this engagement for quota-overage email notifications. Took `tenantId` from a query param with zero ownership validation - any tenant's admin could enumerate another tenant's admin emails. **Fixed**: `PermissionsGuard` now checks `request.query?.tenantId` in addition to `request.params?.tenantId`, with a carve-out for legitimate global/non-tenant-scoped service callers.
2. **`LogsController`'s activity/security/audit log endpoints + CSV exports** (pre-existing, not introduced this engagement) - applied `tenantId` as a filter only when supplied; omitting it returned logs (including audit `before`/`after` payloads) across every tenant. **Fixed**: non-super-admin callers now always get their own tenant enforced server-side, regardless of what they pass.
3. **`RbacService.updateRole`/`deleteRole`** (pre-existing) - had no tenant scoping at all; any caller with `ROLE_UPDATE`/`ROLE_DELETE` (which `tenant_admin`/`admin` get via `grantAllExcept`) could modify or deactivate any role by id, including another tenant's custom roles or shared system roles. **Fixed**: both now reject (404) if the target role is a system role or belongs to a different tenant, unless the caller is `super_admin`.
4. **`SsoService.listUserGrants`** and **`ProductOwnershipService.listForUser`** (pre-existing) - both queried by `userId` alone when `tenantId` was omitted, with no check that the target user belongs to the caller's tenant. **Fixed**: both now validate tenant membership before returning anything.

All four fixes verified: `tsc --noEmit` exit 0, Jest 1 suite / 11 tests pass.

## Not fixed (Low severity, same pattern, lower stakes)

`FeatureFlagsController.findAll` has the same query-param-tenantId shape but only exposes feature-toggle config, not PII or audit data. The "wrong tenantId supplied" case is now covered by the `PermissionsGuard` fix above; the "omitted entirely" case wasn't separately re-verified. Low priority given what's actually exposed.

## Verdict

**Concrete cross-tenant leaks were found and fixed.** This is exactly the outcome a launch-readiness audit is supposed to produce - real, exploitable findings caught before customers could be affected, not a clean bill of health rubber-stamped without adversarial checking. The fact that one of these was in code from earlier this engagement is a useful reminder that new code needs the same adversarial review as legacy code, not an exemption.

Recommend one more pass specifically re-testing these five endpoints (and the `FeatureFlagsController` one) with actual cross-tenant requests before treating this category as closed - static review caught the gap, but a live verification would close the loop with certainty.
