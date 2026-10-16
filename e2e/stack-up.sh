#!/usr/bin/env bash
# Build both UIs, start services, import the seed and check readiness.
# --no-build: reuse bundles; --build-only: skip services; --build-broker:
# build backend images from CROSSLINK_DIR. PLATFORM_DIR selects the UI checkout.
set -euo pipefail
cd "$(dirname "$0")"

build=true
build_only=false
build_broker=false
for arg in "$@"; do
  case "$arg" in
    --no-build) build=false ;;
    --build-only) build_only=true ;;
    --build-broker) build_broker=true ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done
if ! $build && $build_only; then
  echo "--no-build and --build-only contradict each other" >&2; exit 2
fi
if ! $build && { [ ! -f bundle/test1/index.html ] || [ ! -f bundle/test2/index.html ]; }; then
  echo "--no-build: both tenant bundles must exist" >&2; exit 1
fi

if $build; then
  platform_dir="${PLATFORM_DIR:-../platform-rs-dev}"
  echo "Building UI bundles from $platform_dir into e2e/bundle..."
  # stripes build leaves earlier chunks behind, so clear first — otherwise the
  # directory accumulates orphans and grepping it tells you about old builds.
  # Contents, not the directory itself: nginx bind-mounts bundle/ and would keep
  # the deleted inode, serving nothing until the container restarted.
  mkdir -p bundle
  find bundle -mindepth 1 -delete
  # One bundle per tenant: tenant and okapi URL are compiled in. The ports
  # pair up with the server blocks in mock-okapi/mock-okapi.conf.
  for pair in test1:9130 test2:9131; do
    (
      e2e_dir="$PWD"
      cd "$platform_dir"
      export STRIPES_TRANSPILE_TOKENS="@projectreshare"
      export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"
      export E2E_BUNDLE_TENANT="${pair%%:*}" E2E_BUNDLE_OKAPI_URL="http://localhost:${pair##*:}"
      yarn stripes build "$e2e_dir/stripes.e2e.config.js" "$e2e_dir/bundle/$E2E_BUNDLE_TENANT"
    )
  done
fi
$build_only && exit 0

if $build_broker; then
  docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build --wait
else
  docker compose up -d --wait
fi

# Before the health check, which goes through the broker, and the broker
# resolves a tenant through the directory.
directory=http://localhost:8086/directory
for _ in $(seq 1 30); do
  curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "$directory/entries?limit=1" 2>/dev/null && break
  sleep 1
done
echo "Importing seed/directory.json into the directory..."
# update, so a rerun against a live stack replaces the entries with the seed's.
# A 200 can still carry failed records.
if ! result=$(jq -c '.[]' seed/directory.json | curl --connect-timeout 2 --max-time 30 -sS --fail-with-body -X POST \
    -H 'Content-Type: application/x-ndjson' \
    -H 'X-Okapi-Permissions: ["directory.consortium.all"]' \
    --data-binary @- "$directory/import?conflictPolicy=update") \
  || ! jq -e '([.entries, .tiers, .networks] | all(.failed == 0)) and .errors == []' <<<"$result" >/dev/null; then
  echo "directory import failed: $result" >&2
  exit 1
fi

./stack-health.sh --retry
echo
echo "Stack is up: test1 UI http://localhost:3000 (okapi :9130)  test2 UI http://localhost:3002 (okapi :9131)"
echo "Stop with: yarn stack:down (discards all DB state — the stack is throwaway)"
