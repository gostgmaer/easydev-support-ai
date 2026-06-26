# Disaster Recovery Readiness

**Audit completed.** Full detail in `risk-register.md` (RR-50 through RR-54).

## DB / Redis / Storage restore

- `easydev-support-ai/deployment/disaster-recovery/scripts/backup-postgres.sh` is real (`pg_dump` + AES-256 encryption + checksum). **But `restore-postgres.sh`'s point-in-time-recovery branch is a stub** - its own code comments admit "we simulate this trigger setup," and the actual recovery commands are commented out, never executed.
- `backup-redis.sh` is real (BGSAVE → copy → encrypt). **`restore-redis.sh` is fake at the critical step** - the "Swapping database files in volume..." line has no actual command behind it. Data is never restored to disk.
- `object-storage-sync.sh` falls back to printing `[SIMULATION]` if the AWS CLI isn't present, rather than failing loudly.
- A live local restore drill script (`tests/dr-test-suite.sh`) does exist and does run real restores, not just file checks - but there's no CI job running it, no "last tested" record, and no evidence it's ever been run against real infrastructure.

**This is the most concerning DR finding**: these scripts would give a false sense of security during an actual incident. Someone following the documented procedure during a real outage would believe Postgres PITR and Redis data were restored when they weren't, for those two specific paths.

## Queue / in-flight job recovery

In-flight BullMQ jobs on worker failure are **deleted, not replayed** - the documented remedy in `runbooks/api_worker_failure.md` is `DEL bull:conversation-queue:stalled`. No idempotency/replay mechanism exists. By contrast, `multi-tennet-ai-agent` does have real DLQ replay per its own runbooks - this gap is specific to easydev-support-ai's queue recovery story.

## Region failure recovery

easydev-support-ai is single-region/single-host today - `dr-failover.sh` only restarts local containers or restores local backups. `multi-tennet-ai-agent`'s own `disaster-recovery.md` **claims an "annual region failover drill"** that's contradicted by its k8s manifests having no AZ/region affinity or topology spread, and no evidence any such drill has actually run. This is a documentation-accuracy problem on top of the underlying capability gap - the docs imply a posture that doesn't exist.

## Tenant-level recovery

Confirmed single shared schema/database with a `tenantId` column on every table. A real PITR restore is **all-tenants-or-nothing** - there's no way to restore one tenant's data to a point in time without rolling back every other tenant too. A separate `tenant-manager.sh` provides real per-tenant export/import, exercised by the test harness, but it's a live-data snapshot tool (no time-travel), with no production track record. Whether per-tenant PITR is an actual product requirement or an accepted architectural tradeoff of the shared-schema design is a decision, not a quick fix.

## Service recovery runbooks - the one genuinely strong area

Read in full, not just confirmed to exist: `api_worker_failure.md`, `db_failure.md`, `infra_ssl_storage_failure.md`, `redis_failure.md` are concrete, real, step-by-step procedures (promote a DB replica, renew certs via certbot, fall back to local staging during an S3 outage, rebuild from a full host loss). `deployment/rollback.sh` and the DR-specific `rollback-deployment.sh` are real blue-green rollback logic, not placeholders. `multi-tennet-ai-agent`'s `docs/runbooks.md` is materially more mature still - 16 real procedures including key rotation, worker draining, tenant pause, and region failover (the procedure itself is real and detailed, even though the underlying capability and drill history are not, per above).

## Verdict

**Not ready.** The gap here isn't "no DR plan exists" - there's real, substantial runbook content, and that's worth crediting. The actual problem is that the automated *restore* path - the part that matters most when someone is paged during a real incident - is stubbed at exactly its most critical steps (Postgres PITR, Redis restore), and the one drill mechanism that does work has never been run against real infrastructure or scheduled to run automatically. Fix the two stubbed restore scripts and establish a real, scheduled drill before treating this category as launch-ready. The region-failover documentation should also be corrected to state the actual single-region posture honestly, independent of whether building real multi-region capability is in scope for this launch.
