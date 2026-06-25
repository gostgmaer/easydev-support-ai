# Secrets Management: GitHub Sync & Deployment Flow

This document explains two things that are currently **separate, unconnected mechanisms**:

1. `deployment/sync-env-secrets.sh` - pushes real secret values into GitHub Actions' encrypted secrets store, and keeps the tracked `.env.*.example` templates' key set in sync.
2. The actual deploy path (`.github/workflows/ci-cd.yml` -> `deployment/deploy.sh`/`rollback.sh`) - how the running container gets its environment today.

Read both sections before assuming secrets pushed via (1) have any effect on (2) - they don't, yet. The gap is called out explicitly in §4.

---

## 1. Canonical inventory of every app secret

This is every environment variable in this codebase that is a real credential (API key, signing/encryption key, password) rather than plain config - i.e. everything that should ultimately live in GitHub Actions secrets, not just in a tracked template. Found by grepping `src/` for every `process.env.*` read shaped like a secret and tracing each to its purpose.

| Variable | Used for | Read at |
|---|---|---|
| `JWT_SECRET` | Signs/verifies app auth JWTs | `validate-env.ts`, auth guards |
| `ENCRYPTION_KEY` | Generic at-rest encryption (`EncryptionService`) | `common/resilience/encryption.service.ts` |
| `DB_PASSWORD` / `POSTGRES_PASSWORD` | Postgres credential | `config/database.config.ts` |
| `CONNECTOR_ENCRYPTION_KEY` | Encrypts/decrypts stored third-party connector credentials | `modules/connectors/engine/credential-manager.ts` |
| `WIDGET_JWT_SECRET` | Signs/verifies customer-widget visitor session JWTs | `modules/widget/services/widget-session.service.ts` |
| `ADMIN_WEBHOOK_ENCRYPTION_KEY` | Encrypts admin-configured webhook secrets at rest | `modules/admin/services/admin-webhook.service.ts` |
| `ADMIN_API_KEY_HASH_SECRET` | HMAC-hashes admin-issued API keys | `modules/admin/services/admin-api-key.service.ts` |
| `EASYDEV_AI_API_KEY` | Auth for outbound calls to the EasyDev AI platform | `modules/ai-integration/services/ai-platform.client.ts`, `modules/knowledge-base/services/ai-platform.client.ts` |
| `IAM_SERVICE_API_KEY` | Auth for the internal IAM client (usage/plan limits) | `modules/settings/services/usage-limit.service.ts` |
| `PAYMENT_SERVICE_API_KEY` | Auth for the internal Payment client | `modules/settings/services/usage-limit.service.ts` |
| `FILE_UPLOAD_SERVICE_API_KEY` | Auth for calls to the file-upload microservice | `integration/file-upload/file-upload.service.ts` |
| `FILE_UPLOAD_HMAC_SECRET` | Shared gateway-HMAC signing secret - **same value must be configured on the file-upload-service / payment-microservice side**; their `GatewayHmacGuard` verifies requests this app signs with it | `modules/settings/services/usage-limit.service.ts` (passed into `PaymentClient`) |

Three of these (`PAYMENT_SERVICE_API_KEY`, `FILE_UPLOAD_HMAC_SECRET`, and `PAYMENT_SERVICE_URL`) were read by code but **completely absent from all four `deployment/environments/*.env` files** until this pass - meaning every outbound payment-service call in a real deploy would have gone out with an empty API key and no gateway HMAC signature, getting rejected by the payment-microservice's global `GatewayHmacGuard`. Fixed by adding them to `development.env`, `staging.env`, `production.env`, and `environment.template.env`.

Two cross-service integrations have **no secret at all today** - worth knowing, not yet fixed: `NotificationService` (`modules/notifications/notification.service.ts`) POSTs to `NOTIFICATION_SERVICE_URL` with no auth header whatsoever (a `NOTIFICATION_SERVICE_API_KEY` exists in `.env.example` but nothing in `src/` ever reads it - it's unused template cruft, not wired to anything).

When you add a new external integration in the future, the pattern to follow is: add the real var to `.env`/`deployment/environments/*.env` (with a real or placeholder value as appropriate), add the matching `CHANGE_ME` entry to every `.env.*.example`, then run `sync-env-secrets.sh --dry-run` to confirm nothing's missing before pushing.

---

## 2. What `sync-env-secrets.sh` actually does

```
./deployment/sync-env-secrets.sh <env-file> <example-file> [--dry-run] [--repo OWNER/REPO]
```

Three steps, in order:

1. **Classify every key.** Any key ending in `_SECRET`, `_KEY`, `_PASSWORD`, `_TOKEN`, or `_HASH` is treated as sensitive; everything else (`PORT`, `NODE_ENV`, `*_URL`, thresholds, feature flags) is treated as plain config. This is a naming-convention match, not a hardcoded list - it covers every real secret in the §1 inventory without needing the script updated each time a new one is added, as long as new credentials follow the same suffix convention.
2. **Push to GitHub**, split by that classification:
   - Sensitive keys -> `gh secret set --env-file` -> GitHub Actions **secrets** (encrypted, write-only - nobody can read the value back after it's set, only overwrite it; masked in workflow logs).
   - Everything else -> `gh variable set --env-file` -> GitHub Actions **variables** (plaintext, viewable any time via `gh variable list`/the repo Settings UI, not masked in logs).
   Both require `gh auth login` first (run `gh auth status` to check - as of this writing the local environment is **not authenticated**, so nothing has been pushed).
3. **Sync the template.** Walks the same key list and appends any key missing from `<example-file>` as `KEY=CHANGE_ME`. This is the drift-prevention half - it's how `CONNECTOR_ENCRYPTION_KEY`, `WIDGET_JWT_SECRET`, `JWT_PUBLIC_KEY`, `SSO_SECRET`, `EASYDEV_AI_URL`/`EASYDEV_AI_API_KEY`, `PAYMENT_SERVICE_API_KEY`, `FILE_UPLOAD_HMAC_SECRET` and others were caught as missing from `.env.example` and several `.env.*.example`/`deployment/environments/*.env` files during this audit.

**Safety guard:** the script refuses to run if `<env-file>` is tracked in git (`git ls-files --error-unmatch`). Every `.env`, `.env.*.example`, and `deployment/environments/*.env` already committed to this repo is a *template* with placeholder-style values - it must never be the source for a real secrets push. Point the script at your own untracked file with real values instead, e.g.:

```bash
gh auth login
./deployment/sync-env-secrets.sh .env .env.example --dry-run   # preview first - shows the secret/variable split
./deployment/sync-env-secrets.sh .env .env.example              # actually pushes both + appends placeholders
```

`--dry-run` never calls `gh` and never writes to the example file - it only prints the classification and counts. Always run it once before the real invocation to sanity-check that nothing sensitive landed in the variables bucket (or vice versa).

Run against the real `.env` today, this classifies 23 keys as secrets and 69 as variables out of 92 total.

---

## 3. How the current CI/CD pipeline actually deploys

`.github/workflows/ci-cd.yml` has two jobs:

- **`ci`**: install, lint, build, test, `pnpm audit`, gitleaks secret scan. No app secrets involved.
- **`cd`** (only on push to `main`/`development`): logs into `ghcr.io` using `secrets.GITHUB_TOKEN` (the one auto-provided secret it actually uses), builds `Dockerfile.prod`, pushes the image, runs a Trivy scan, then calls `./deployment/deploy.sh`.

`deploy.sh` does a blue-green swap with a **single `docker run`**:

```bash
docker run -d \
  --name "support-ai-${TARGET_COLOR}" \
  --network "easydev-net" \
  -p "${TARGET_PORT}:3100" \
  --env-file "./deployment/environments/${ENV}.env" \
  -e "PORT=3100" \
  "${IMAGE_NAME}:${TAG}"
```

The container's entire environment comes from **`--env-file ./deployment/environments/{staging,production}.env`** - a file read straight off the runner's checked-out working copy of this repo. Inside the container, `Dockerfile.prod`'s `pm2-runtime start ecosystem.config.js` then runs two processes (`easydev-api-server`, `easydev-queue-worker`) that inherit this same environment, with PM2 only overriding `PORT`/`PROCESS_QUEUE` per-process.

`rollback.sh` follows the identical pattern for emergency revert.

---

## 4. The gap: GitHub secrets and `deploy.sh` are not connected

This is the part worth being direct about:

- **`deployment/environments/production.env` and `staging.env` are tracked in git** (`git ls-files` confirms it), and already contain real-looking secret values (JWT signing keys, DB passwords, API keys) committed across several commits in this repo's history.
- `deploy.sh` reads that committed file directly - it never references `${{ secrets.* }}` or anything sourced from GitHub's encrypted secrets store.
- So today, pushing secrets via `sync-env-secrets.sh` (§2) has **no effect on what `deploy.sh` actually uses**. The two systems don't talk to each other yet.

Practical implications:
- Anyone with read access to this repository (or its git history) can read the current staging/production secrets in plaintext, regardless of branch protection or GitHub secret-store ACLs.
- Rotating a secret today means editing the tracked `.env` file and committing it - the new value still ends up in git history.

This document does not silently paper over that - flagging it here is the point of writing it.

---

## 5. Closing the gap (not yet implemented - proposed target design)

To make GitHub Actions secrets the actual source of truth at deploy time:

1. **Stop committing real values** to `deployment/environments/production.env`/`staging.env`. Replace their contents with the same placeholder convention already used by `.env.*.example` (or delete them and rely solely on the `.example` templates for documentation).
2. **Push real values via `sync-env-secrets.sh`** from an untracked file, once `gh auth login` has been run with an account that has repo admin/secrets-write access.
3. **Add a step in `ci-cd.yml`'s `cd` job**, immediately before `deploy.sh` runs, that materializes both secrets and variables into the exact file `deploy.sh` expects, e.g.:
   ```yaml
   - name: Write deploy-time env file
     env:
       # Secrets context - encrypted, masked in logs
       JWT_SECRET: ${{ secrets.JWT_SECRET }}
       ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
       CONNECTOR_ENCRYPTION_KEY: ${{ secrets.CONNECTOR_ENCRYPTION_KEY }}
       WIDGET_JWT_SECRET: ${{ secrets.WIDGET_JWT_SECRET }}
       DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
       PAYMENT_SERVICE_API_KEY: ${{ secrets.PAYMENT_SERVICE_API_KEY }}
       FILE_UPLOAD_HMAC_SECRET: ${{ secrets.FILE_UPLOAD_HMAC_SECRET }}
       # ...one line per secret in the §1 inventory
       # Variables context - plaintext config
       DATABASE_URL: ${{ vars.DATABASE_URL }}
       PORT: ${{ vars.PORT }}
       PAYMENT_SERVICE_URL: ${{ vars.PAYMENT_SERVICE_URL }}
       # ...one line per non-sensitive key currently in deployment/environments/{env}.env
     run: |
       env | grep -E '^(JWT_SECRET|ENCRYPTION_KEY|CONNECTOR_ENCRYPTION_KEY|WIDGET_JWT_SECRET|DB_PASSWORD|PAYMENT_SERVICE_API_KEY|FILE_UPLOAD_HMAC_SECRET|DATABASE_URL|PORT|PAYMENT_SERVICE_URL)=' \
         > "./deployment/environments/${ENV_NAME}.env"
   ```
   GitHub Actions automatically masks secret values in logs, so this is safe to run on the self-hosted runner; the generated file lives only in the runner's ephemeral workspace for that job and is never committed.
4. **Rotate every secret currently in git history** (JWT/encryption keys, DB passwords, API keys for IAM/AI platform/notification/file-upload services) - removing them from future commits doesn't remove them from history. This is the only step that actually closes the exposure, independent of the tooling changes above.

Steps 1-3 are a real change to the deploy pipeline (not just docs) and step 4 is a credential-rotation exercise across every downstream system - both are scoped beyond this audit. Flagging as the natural next piece of work if/when you want it done.
