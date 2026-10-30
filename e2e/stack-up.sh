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
  echo "Building the UI bundle from $platform_dir into e2e/bundle..."
  # stripes build leaves earlier chunks behind, so clear first — otherwise the
  # directory accumulates orphans and grepping it tells you about old builds.
  # Contents, not the directory itself: nginx bind-mounts bundle/ and would keep
  # the deleted inode, serving nothing until the container restarted.
  mkdir -p bundle
  find bundle -mindepth 1 -delete
  # One bundle per tenant: tenant and okapi URL are compiled in. The ports
  # pair up with the server blocks in mock-okapi/mock-okapi.conf.
  (
    e2e_dir="$PWD"
    cd "$platform_dir"
    export STRIPES_TRANSPILE_TOKENS="@projectreshare"
    export NODE_OPTIONS="--max-old-space-size=4096 ${NODE_OPTIONS:-}"
    export E2E_BUNDLE_TENANT=test1 E2E_BUNDLE_OKAPI_URL=http://localhost:9130
    yarn stripes build "$e2e_dir/stripes.e2e.config.js" "$e2e_dir/bundle/test1"
  )
  # test2's bundle is test1's with the values stripes.e2e.config.js derives
  # from the tenant swapped, which saves a second build of the same code. The
  # config is inlined into one chunk as JS literals. Each must occur exactly
  # once, so a build that prints them differently fails here rather than
  # serving test1's config on test2's port. The patched chunk keeps a name
  # whose hash no longer matches its contents, which nothing checks. Its
  # source map still shows test1's values.
  cp -R bundle/test1 bundle/test2
  node - bundle/test2 <<'EOF'
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const swaps = [
  ['"http://localhost:9130"', '"http://localhost:9131"'],
  ['tenant:"test1"', 'tenant:"test2"'],
  ['"ReShare E2E test1"', '"ReShare E2E test2"'],
];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'))
  .map((f) => path.join(dir, f))
  .filter((f) => fs.readFileSync(f, 'utf8').includes(swaps[0][0]));
if (files.length !== 1) {
  console.error(`expected the okapi URL in one chunk of ${dir}, found ${files.length}`);
  process.exit(1);
}
let js = fs.readFileSync(files[0], 'utf8');
for (const [from, to] of swaps) {
  const n = js.split(from).length - 1;
  if (n !== 1) {
    console.error(`expected ${from} once in ${files[0]}, found ${n}`);
    process.exit(1);
  }
  js = js.replace(from, to);
}
fs.writeFileSync(files[0], js);
EOF
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
# Import leaves copyright types, loan conditions and unfilled reasons unset; a
# copy request needs the first, and the Add conditions and Cannot Supply
# dialogs offer only what the institution's entry holds.
for symbol in US-TEST1 US-TEST2; do
  curl --connect-timeout 2 --max-time 10 -sS --fail-with-body -o /dev/null -X PATCH \
    -H 'Content-Type: application/json' \
    -H 'X-Okapi-Permissions: ["directory.consortium.all"]' \
    --data '{"illConfig":{"availableCopyrightTypes":[{"code":"US-CCG","defaultDesc":"CCG (US)"},{"code":"US-CCL","defaultDesc":"CCL (US code)"}],"loanConditions":[{"code":"LibraryUseOnly","defaultDesc":"Use in library only"}],"unfilledReasons":[{"code":"NotHeld","defaultDesc":"Not held"}]}}' \
    "$directory/entries/by-symbol/ISIL:$symbol"
done

./stack-health.sh --retry

# Import needs a healthy broker and directory entries to resolve owners.
echo "Importing seed/requests.ts into the broker..."
if ! result=$(node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --input-type=module \
      -e "import { ndjson } from './seed/requests.ts'; process.stdout.write(ndjson())" \
    | curl --connect-timeout 2 --max-time 30 -sS --fail-with-body -X POST \
      -H 'Content-Type: application/x-ndjson' \
      --data-binary @- "http://localhost:8080/import?conflictPolicy=update") \
  || ! jq -e '.patronRequests.failed == 0 and .errors == []' <<<"$result" >/dev/null; then
  echo "request import failed: $result" >&2
  exit 1
fi
echo
echo "Stack is up: test1 UI http://localhost:3000 (okapi :9130)  test2 UI http://localhost:3002 (okapi :9131)"
echo "Stop with: yarn stack:down (discards all DB state — the stack is throwaway)"
