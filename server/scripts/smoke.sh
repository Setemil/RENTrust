#!/bin/sh
# Runs scripts/smoke.mjs against a fresh throwaway database, so your own data is never touched.
# Usage: npm run smoke
set -e
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

BASE="${DATABASE_URL%%\?*}"            # connection string without ?schema=...
SMOKE_DB="rentrust_smoke"
export DATABASE_URL="${BASE%/*}/$SMOKE_DB"
export PORT=5097 REPORT_DELAY_MS=300 SEED_PASSWORD=
# Never send real email from the smoke test, and use made-up Cloudinary keys: the test signs
# its own fake uploads with the same secret to exercise the photo checks.
export RESEND_API_KEY= EMAIL_FROM= TEST_MODE=true
export CLOUDINARY_CLOUD_NAME=smoke CLOUDINARY_API_KEY=smoke-key CLOUDINARY_API_SECRET=smoke-secret

psql "$BASE" -qc "DROP DATABASE IF EXISTS $SMOKE_DB" -c "CREATE DATABASE $SMOKE_DB" 2>/dev/null
npx prisma migrate deploy >/dev/null
npx prisma db seed >/dev/null

# The server's log goes to a file, so smoke.mjs can check what it logged.
export SERVER_LOG="$(mktemp)"
npx tsx index.ts >"$SERVER_LOG" 2>&1 &
SERVER=$!
cleanup() {
  kill $SERVER 2>/dev/null || true
  rm -f "$SERVER_LOG"
  psql "$BASE" -qc "DROP DATABASE IF EXISTS $SMOKE_DB WITH (FORCE)" 2>/dev/null
}
trap cleanup EXIT

until curl -sf "http://localhost:$PORT/api/v1/health" >/dev/null; do sleep 0.3; done
node scripts/smoke.mjs
npx tsx scripts/verifyAuditChain.ts
