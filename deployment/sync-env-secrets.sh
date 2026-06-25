#!/usr/bin/env bash
# Pushes every KEY=value pair from a local (gitignored, real-values) env file
# to GitHub - keys that look sensitive (ending in _SECRET/_KEY/_PASSWORD/
# _TOKEN/_HASH) go to GitHub Actions secrets (write-only, masked in logs);
# everything else (PORT, NODE_ENV, URLs, feature flags, ...) goes to GitHub
# Actions variables (plaintext, viewable, not masked). See
# docs/SECRETS_MANAGEMENT.md §1 for the canonical list of real app secrets
# this pattern is meant to catch.
#
# Then syncs the matching .env.*.example template so its key set never
# silently drifts from what the app actually reads - the exact drift that
# previously left CONNECTOR_ENCRYPTION_KEY/WIDGET_JWT_SECRET missing from
# every real env file while only the example had them.
#
# Usage:
#   ./deployment/sync-env-secrets.sh <env-file> <example-file> [--dry-run] [--repo OWNER/REPO]
#
# Example (run from repo root):
#   ./deployment/sync-env-secrets.sh deployment/environments/production.env.local \
#     .env.production.example --dry-run
#
# Refuses to run against a file tracked in git - every *.env/*.example file
# already committed here is a template with placeholder values, never a real
# secret; point this at your own untracked copy with the real values filled in.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="${1:?Usage: $0 <env-file> <example-file> [--dry-run] [--repo OWNER/REPO]}"
EXAMPLE_FILE="${2:?Usage: $0 <env-file> <example-file> [--dry-run] [--repo OWNER/REPO]}"
shift 2

DRY_RUN=false
REPO_ARGS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=true; shift ;;
    --repo) REPO_ARGS=(--repo "$2"); shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi
if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "Example file not found: $EXAMPLE_FILE" >&2
  exit 1
fi

if git ls-files --error-unmatch "$ENV_FILE" >/dev/null 2>&1; then
  echo "Refusing to run: $ENV_FILE is tracked in git (it's a template with" >&2
  echo "placeholder values, not real secrets). Point this at your own" >&2
  echo "untracked copy with real values instead." >&2
  exit 1
fi

# Suffix-based classification - every real credential in this codebase
# (JWT_SECRET, ENCRYPTION_KEY, *_API_KEY, DB_PASSWORD, *_HMAC_SECRET, ...)
# ends in one of these; plain config (PORT, NODE_ENV, *_URL, thresholds,
# feature flags) does not. JWT_PUBLIC_KEY ends in _KEY and so is classified
# as a secret too even though public keys aren't sensitive - harmless,
# errs toward the safer bucket rather than silently leaking something real.
SECRET_PATTERN='_(SECRET|KEY|PASSWORD|TOKEN|HASH)$'

SECRETS_FILE=$(mktemp)
VARS_FILE=$(mktemp)
chmod 600 "$SECRETS_FILE" "$VARS_FILE"
trap 'rm -f "$SECRETS_FILE" "$VARS_FILE"' EXIT

secret_count=0
var_count=0
while IFS='=' read -r key value; do
  [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
  if [[ "$key" =~ $SECRET_PATTERN ]]; then
    echo "${key}=${value}" >> "$SECRETS_FILE"
    secret_count=$((secret_count + 1))
  else
    echo "${key}=${value}" >> "$VARS_FILE"
    var_count=$((var_count + 1))
  fi
done < <(grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE")

echo "[1/2] Classified $((secret_count + var_count)) key(s) from $ENV_FILE:"
echo "  Secrets ($secret_count) -> gh secret set (write-only, masked in logs):"
cut -d= -f1 "$SECRETS_FILE" | sed 's/^/    - /'
echo "  Variables ($var_count) -> gh variable set (plaintext, viewable):"
cut -d= -f1 "$VARS_FILE" | sed 's/^/    - /'

if [ "$DRY_RUN" = true ]; then
  echo
  echo "[dry-run] Not calling gh. Re-run without --dry-run to push $secret_count secret(s) and $var_count variable(s) for real."
else
  if [ "$secret_count" -gt 0 ]; then
    gh secret set --env-file "$SECRETS_FILE" "${REPO_ARGS[@]}"
    echo "Pushed $secret_count secret(s) to GitHub Actions."
  fi
  if [ "$var_count" -gt 0 ]; then
    gh variable set --env-file "$VARS_FILE" "${REPO_ARGS[@]}"
    echo "Pushed $var_count variable(s) to GitHub Actions."
  fi
fi

echo
echo "[2/2] Syncing key set into $EXAMPLE_FILE (placeholders only, never real values)..."
added=0
while IFS='=' read -r key _; do
  [[ "$key" =~ ^[A-Z_][A-Z0-9_]*$ ]] || continue
  if ! grep -q "^${key}=" "$EXAMPLE_FILE"; then
    if [ "$DRY_RUN" = true ]; then
      echo "  [dry-run] would add: ${key}=CHANGE_ME"
    else
      echo "${key}=CHANGE_ME" >> "$EXAMPLE_FILE"
    fi
    added=$((added + 1))
  fi
done < <(grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE")

if [ "$DRY_RUN" = true ]; then
  echo "Would add $added missing key(s) to $EXAMPLE_FILE."
else
  echo "Added $added missing key(s) to $EXAMPLE_FILE."
fi
