# Operational Readiness

Source: Service Inventory / Health / Observability / Alerting / Deployment audit (completed this pass) across all 6 backend services + `infra/`. Full per-service detail in `backend-readiness.md`'s Service Inventory table - this file focuses on the operational verdict.

## Health checks, readiness, liveness

3 of 6 services (easydev-support-ai, notification-service, file-upload-service, multi-tennet-ai-agent — actually 4) have a real liveness/readiness split with genuine dependency checks. **2 services (IAM, payment-microservice) serve liveness and readiness from a single endpoint**, and IAM's health check actively misreports Redis status as `"ok"` when Redis is disabled rather than reflecting the real state (`health.controller.ts:40`). For an orchestrator doing health-based restart/routing decisions, this means IAM and payment-microservice can't be told "process is up but dependency is down" from "everything is fine" - a real operational gap, not cosmetic.

## Observability

- **Strong**: easydev-support-ai (OTel, Prometheus, Tempo, Grafana datasources), payment-microservice (OTel wired), multi-tennet-ai-agent (full stack: OTel+OTLP+Prometheus+structlog), notification-service (structured logging present).
- **Gap**: IAM has no OTel/Prometheus/structured-logging hits anywhere in source. file-upload-service has no metrics instrumentation at all - console logging only, despite handling file uploads to cloud storage with real credentials.

## Alerting

**Only 1 of 6 services (multi-tennet-ai-agent) has real alert rules checked into the repo** (`monitoring/prometheus/alerts/ai-platform-alerts.yml`, with provisioned Grafana dashboards). easydev-support-ai has an `alert-rules.yml` in `packages/observability` - worth verifying this is actually deployed to a live Alertmanager rather than just present in the repo. The other 4 services have no alerting evidence at all.

**This means**: today, an outage in IAM, payment-microservice, notification-service, or file-upload-service would be discovered by a customer noticing something broken, not by an on-call engineer being paged. This is the single biggest operational gap found.

## Deployment & rollback

| Service | CI/CD | Rollback |
|---|---|---|
| easydev-support-ai | CI + CD workflows | `deployment/rollback.sh` exists |
| IAM | `ci.yml` + `docker-build-deploy.yml` | None found |
| payment-microservice | `ci.yml` + `cd.yml` | None found |
| notification-service | `auto-tag.yml`, `deploy.yml`, `keep-alive.yml` | None found |
| file-upload-service | **Only an auto-tag workflow - no real deploy/CD pipeline at all** | None found |
| multi-tennet-ai-agent | `ci.yml` | `docs/runbooks.md` exists |

4 of 6 services have no documented rollback path. `file-upload-service` notably has no deploy automation whatsoever, despite being a stateful, credential-holding service.

## Note on `notification-service` branch state

The repo as checked out is on `fix/notification-health-security`, 20 commits ahead of `main` and not yet merged. The health controller itself is byte-identical between the branch and `main`, so whatever that branch's "health-security fix" addresses, it hasn't touched the health endpoint - worth confirming with whoever owns that branch what it's actually fixing and whether it needs to land before launch.

## Verdict

**Not operationally ready.** The alerting gap alone (5 of 6 services with no real alert rules) means production incidents would be detected reactively by customers rather than proactively by the team — this directly contradicts the "no critical outage remains undetected" bar this audit is measured against. Combine with IAM/payment's fused liveness/readiness endpoints and file-upload-service's missing deploy pipeline, and operational maturity is uneven across the platform: easydev-support-ai and multi-tennet-ai-agent are in reasonable shape; the other 4 services are not.
