#!/usr/bin/env bash
# ============================================================================
#  authz-smoke.sh — prove the write routes are guarded by the permission matrix
#
#  WHAT IT ASSERTS
#    1. A role whose matrix row grants nothing (INTERNAL_AUDITOR) gets 403 on
#       every write route.
#    2. SYSTEM_ADMIN passes the guard: the same request comes back 400/404/409
#       (validation or missing record), never 403 — the guard is not simply
#       "everybody is refused".
#    3. /dev/seed-users is off: a production deployment answers 404.
#
#  WHAT IT DOES NOT DO: it never creates, changes or deletes a record. Every
#  request is either deliberately invalid or addresses an id that does not
#  exist, so the database is untouched whatever the guards do.
#
#  USAGE
#    bash scripts/authz-smoke.sh                    # http://127.0.0.1:3300
#    BASE_URL=https://host bash scripts/authz-smoke.sh
#    SKIP_DEV_CHECK=1 bash scripts/authz-smoke.sh   # dev machine (/dev is on)
#
#  Credentials default to the seeded dev accounts (scripts/dev-seed-users.ts).
#  Override with ADMIN_MOBILE / ADMIN_PASSWORD / AUDITOR_MOBILE /
#  AUDITOR_PASSWORD when testing a deployment that has its own accounts.
# ============================================================================
set -uo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3300}"
ADMIN_MOBILE="${ADMIN_MOBILE:-09991000001}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-DevSysAdmin1405!}"
AUDITOR_MOBILE="${AUDITOR_MOBILE:-09991000007}"
AUDITOR_PASSWORD="${AUDITOR_PASSWORD:-DevAudit1405!}"

MISSING="smoke-missing-record"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

pass=0
fail=0

ok()   { printf '  \033[32mok\033[0m   %s\n' "$1"; pass=$((pass + 1)); }
bad()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; fail=$((fail + 1)); }

login() { # $1 jar, $2 mobile, $3 password
  curl -sS -m 15 -c "$1" -o /dev/null -w '%{http_code}' \
    -H 'Content-Type: application/json' \
    -d "{\"mobile\":\"$2\",\"password\":\"$3\"}" \
    "$BASE_URL/api/auth/login"
}

call() { # $1 jar, $2 method, $3 path, $4 body (may be empty)
  if [ -n "${4:-}" ]; then
    curl -sS -m 15 -b "$1" -o /dev/null -w '%{http_code}' -X "$2" \
      -H 'Content-Type: application/json' -d "$4" "$BASE_URL$3"
  else
    curl -sS -m 15 -b "$1" -o /dev/null -w '%{http_code}' -X "$2" "$BASE_URL$3"
  fi
}

echo "authz smoke test → $BASE_URL"

admin_jar="$WORK/admin.jar"
auditor_jar="$WORK/auditor.jar"

admin_login="$(login "$admin_jar" "$ADMIN_MOBILE" "$ADMIN_PASSWORD")"
auditor_login="$(login "$auditor_jar" "$AUDITOR_MOBILE" "$AUDITOR_PASSWORD")"

if [ "$admin_login" != "200" ]; then
  echo "  cannot log in as SYSTEM_ADMIN ($admin_login) — set ADMIN_MOBILE/ADMIN_PASSWORD" >&2
  exit 2
fi
if [ "$auditor_login" != "200" ]; then
  echo "  cannot log in as INTERNAL_AUDITOR ($auditor_login) — set AUDITOR_MOBILE/AUDITOR_PASSWORD" >&2
  exit 2
fi

# METHOD|PATH|BODY. Bodies are invalid or ids are absent on purpose: a 2xx would
# mean the guard let the write through and the handler accepted it.
while IFS='|' read -r method path body; do
  [ -z "${method:-}" ] && continue
  case "$method" in \#*) continue ;; esac

  label="$method $path"
  auditor_code="$(call "$auditor_jar" "$method" "$path" "$body")"
  admin_code="$(call "$admin_jar" "$method" "$path" "$body")"

  if [ "$auditor_code" != "403" ]; then
    bad "$label — zero-permission role got $auditor_code (expected 403)"
    continue
  fi
  if [ "$admin_code" = "403" ]; then
    bad "$label — SYSTEM_ADMIN was refused (403)"
    continue
  fi
  case "$admin_code" in
    4??) ok "$label — auditor 403, admin $admin_code" ;;
    *)   bad "$label — admin got $admin_code, expected a 4xx refusal" ;;
  esac
done <<ROUTES
DELETE|/api/priorities/$MISSING|
DELETE|/api/projects/$MISSING|
DELETE|/api/departments/$MISSING|
DELETE|/api/budget-sources/$MISSING|
DELETE|/api/crises-harms/$MISSING|
DELETE|/api/executors/$MISSING|
DELETE|/api/contractors/$MISSING|
PATCH|/api/projects/$MISSING/status|{"status":"BOGUS"}
POST|/api/analysis-sources|{}
PUT|/api/analysis-sources/$MISSING|{"id":"$MISSING"}
DELETE|/api/analysis-sources/$MISSING|
ROUTES

# The dev credential routes hand out test-account passwords; a deployment must
# answer 404 for both (the router is not even mounted).
if [ "${SKIP_DEV_CHECK:-0}" != "1" ]; then
  dev_code="$(call "$admin_jar" GET /dev/seed-users "")"
  if [ "$dev_code" = "404" ]; then
    ok "GET /dev/seed-users — 404 (dev credential routes are off)"
  else
    bad "GET /dev/seed-users — $dev_code, expected 404 (set SKIP_DEV_CHECK=1 on a dev machine)"
  fi
fi

echo
if [ "$fail" -eq 0 ]; then
  printf '\033[32m%s passed\033[0m\n' "$pass"
  exit 0
fi
printf '\033[31m%s passed, %s failed\033[0m\n' "$pass" "$fail"
exit 1
