#!/usr/bin/env bash
# Is the captive stack ready? Exit 0 if the mock-okapi stub, the broker and
# the directory (through the proxy), and the UI bundle server all answer.
# With --retry, try 30 times, two seconds apart (used during startup).
set -uo pipefail
cd "$(dirname "$0")"

okapi="${E2E_OKAPI_URL:-http://localhost:9130}"
base="${E2E_BASE_URL:-http://localhost:3000}"
peer_base="${E2E_PEER_BASE_URL:-http://localhost:3002}"

check_all() {
  curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "$okapi/saml/check" || { echo "FAIL mock-okapi stub ($okapi/saml/check)"; return 1; }
  curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "$okapi/broker/patron_requests?limit=1" || { echo "FAIL broker via proxy ($okapi/broker/patron_requests)"; return 1; }
  curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "$okapi/directory/entries/owned?limit=1" || { echo "FAIL directory via proxy ($okapi/directory/entries/owned)"; return 1; }
  curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "http://localhost:9131/broker/patron_requests?limit=1" || { echo "FAIL peer broker via proxy (:9131)"; return 1; }
  curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "$base/" || { echo "FAIL UI bundle server ($base/)"; return 1; }
  curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "$peer_base/" || { echo "FAIL peer UI bundle server ($peer_base/)"; return 1; }
  return 0
}

if [ "${1:-}" = "--retry" ]; then
  for _ in $(seq 1 30); do
    check_all >/dev/null 2>&1 && { echo "stack healthy"; exit 0; }
    sleep 2
  done
fi

if check_all; then
  echo "stack healthy"
else
  echo "stack unhealthy — inspect with: docker compose ps; docker compose logs broker nginx" >&2
  exit 1
fi
