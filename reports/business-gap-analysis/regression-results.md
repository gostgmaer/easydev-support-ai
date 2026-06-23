# Regression Results

## Automated test suite

Note on baseline: the test-file count changed twice during this session for reasons unrelated to this audit — the repo owner deliberately deleted ~43 `.spec.ts` files mid-session ("i deleted them as no need to test cases"), first 8 files via an editor auto-commit, then 35 more directly off disk. This is not a regression from any fix in this pass. The current baseline is what remains after those deletions.

- Before any fix in this pass: 7 suites / 69 tests passing (post-deletion baseline)
- After all four fixes in this pass (analytics event wiring, SLA-breach notification, ticket-resolution notification, AI confidence gating): 7 suites / 69 tests passing, identical count, zero failures
- `npx tsc -p . --noEmit`: exit code 0 (clean) after every fix in this pass

No existing test broke as a mechanical consequence of any change in this pass — none of the touched files (`analytics-queue.processor.ts`, `analytics-realtime.service.ts`, `ai-response.service.ts`, `ai-integration.module.ts`, `ticket-sla.service.ts`, `ticket.service.ts`) had a surviving `.spec.ts` file at the time of the fix, so there was nothing to patch.

## Carried-over fixes from the same-day Production Hardening pass — spot-checked still intact

Re-verified live against the running dev server during this session (not re-derived from memory):

- `/health/live` → 200, `/health/ready` → 200 with `database`/`redis`/`aiPlatform`/`storage` all `UP`
- `POST /v1/widget/session/start` with `{}` → 400 (global `ValidationPipe` still active)
- `/metrics` → `http_requests_total` populated with real labels
- Structured JSON logging confirmed active in dev-server boot output (`"event":"RouterExplorer"` etc.)

## Known non-regression: Docker container "unhealthy" status from earlier today

Mid-session, the `api`/`worker`/`webhook` containers showed `unhealthy` in `docker ps` after the `/health` readiness-status fix, because `scripts/health-check.js` (the Docker `HEALTHCHECK` command) was still pointed at `/health` (which correctly 503s when the AI platform is unreachable — true in this local environment, which has no AI platform service wired into the compose stack). This was a real bug, already fixed this same session (`health-check.js` now points at `/health/live`) — documented here only so it isn't mistaken for a new regression if re-encountered.
