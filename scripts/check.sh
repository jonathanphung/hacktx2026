#!/usr/bin/env bash
# One command for "is this safe to merge?" — run locally before pushing; CI runs it too.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d node_modules ] || npm ci

echo "==> format";    npm run --silent lint
echo "==> typecheck"; npm run --silent typecheck
echo "==> tests";     npm run --silent test
echo "==> campaign generator"; node --experimental-strip-types --test scripts/campaign-generator.node-test.mjs
echo "==> saved campaign"; node --experimental-strip-types scripts/generate-campaign.mjs --check
echo "==> build";     npm run --silent build

echo "check.sh: OK"

