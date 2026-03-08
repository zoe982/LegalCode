#!/usr/bin/env bash
set -euo pipefail

# Post-Deploy Security Header Audit
# Validates that production API responses include all required security headers.

URL="https://legalcode.acasus.workers.dev/health"

echo "Checking security headers at $URL..."
echo ""

headers=$(curl -sI "$URL")
failures=0

check_header() {
  local name="$1"
  local expected="$2"
  local value
  value=$(echo "$headers" | grep -i "^${name}:" | head -1 | sed 's/^[^:]*: //' | tr -d '\r')

  if [ -z "$value" ]; then
    echo "FAIL: $name — missing"
    failures=$((failures + 1))
  elif echo "$value" | grep -qi "$expected"; then
    echo "PASS: $name"
  else
    echo "FAIL: $name — expected '$expected', got '$value'"
    failures=$((failures + 1))
  fi
}

check_header "Content-Security-Policy" "default-src"
check_header "X-Content-Type-Options" "nosniff"
check_header "X-Frame-Options" "DENY"
check_header "Referrer-Policy" "strict-origin"
check_header "Permissions-Policy" "camera=()"
check_header "Cache-Control" "no-store"
check_header "Strict-Transport-Security" "max-age"

echo ""
if [ "$failures" -gt 0 ]; then
  echo "FAIL: $failures header(s) failed validation"
  exit 1
fi

echo "PASS: All security headers validated"
