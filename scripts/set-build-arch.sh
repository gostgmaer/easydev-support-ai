#!/usr/bin/env bash
# =============================================================================
# scripts/set-build-arch.sh
#
# Switch the CPU architecture the cd job builds/pushes Docker images for.
# The image arch must match the deploy server's arch - today that's the
# Oracle arm64 VM. If the platform ever moves to a different host (e.g. an
# amd64 server), run this, review the diff, commit, and push so the next CI
# build produces images the new server can actually pull ("no matching
# manifest for linux/..." otherwise).
#
# Unlike the other service repos (which cross-build under QEMU on amd64
# runners), this repo's cd job runs on a runner that natively matches the
# target arch - QEMU emulation crashed this repo's pnpm install with
# "Illegal instruction" (see ci-cd.yml history), so the runner label must
# switch together with the image platform:
#   arm64 -> ubuntu-24.04-arm   (native arm64 GitHub-hosted runner)
#   amd64 -> ubuntu-latest      (native amd64 GitHub-hosted runner)
# The Trivy scan's platform pin switches too, so it scans the arch variant
# that actually got pushed.
#
# The three Dockerfiles need no changes either way - nothing in them is
# arch-specific (no --platform overrides; pnpm resolves platform-specific
# optional deps for whatever arch the build actually runs on).
#
# Usage: bash scripts/set-build-arch.sh <arm64|amd64>
# =============================================================================
set -euo pipefail

ARCH="${1:-}"
case "$ARCH" in
  arm64) RUNNER="ubuntu-24.04-arm" ;;
  amd64) RUNNER="ubuntu-latest" ;;
  *) echo "Usage: $0 <arm64|amd64>" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.."
WF=".github/workflows/ci-cd.yml"

# docker/build-push-action target platform (api/webhook/worker)
sed -i -E 's#(platforms: linux/)(arm64|amd64)#\1'"${ARCH}"'#g' "$WF"
# Trivy must scan the platform variant that was actually pushed
sed -i -E 's#(TRIVY_PLATFORM: linux/)(arm64|amd64)#\1'"${ARCH}"'#g' "$WF"
# cd job's runner - marked line only, so the ci job's runner is untouched
sed -i -E 's#(runs-on: )[^ ]+( \# arch-switch:cd-runner)#\1'"${RUNNER}"'\2#' "$WF"

echo "Build architecture set to ${ARCH} (runner: ${RUNNER}) in ${WF}:"
grep -n "platforms: linux/\|TRIVY_PLATFORM\|arch-switch:cd-runner" "$WF"
