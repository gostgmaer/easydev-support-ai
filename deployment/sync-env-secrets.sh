#!/usr/bin/env bash
# Pushes every KEY=value pair from a local (gitignored, real-values) env file
# to GitHub Actions secrets, then syncs the matching .env.*.example template
# so its key set never silently drifts from what the app actually reads -
# the exact drift that previously left CONNECTOR_ENCRYPTION_KEY/
# WIDGET_JWT_SECRET missing from every real env file while only the example
# had them.
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

echo "[1/2] Secrets to push from $ENV_FILE:"
grep -E '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE" | cut -d= -f1 | sed 's/^/  - /'
count=$(grep -cE '^[A-Z_][A-Z0-9_]*=' "$ENV_FILE")

if [ "$DRY_RUN" = true ]; then
  echo
  echo "[dry-run] Not calling gh secret set. Re-run without --dry-run to push these $count secret(s) for real."
else
  gh secret set --env-file "$ENV_FILE" "${REPO_ARGS[@]}"
  echo "Pushed $count secret(s) to GitHub Actions."
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
