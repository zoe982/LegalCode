#!/usr/bin/env bash
set -euo pipefail

# Contract Test Check
# Verifies that API routes returning JSON have corresponding tests
# that validate responses against shared Zod schemas.

ROUTES_DIR="packages/api/src/routes"
TESTS_DIR="packages/api/tests/routes"
MISSING=()

for route_file in "$ROUTES_DIR"/*.ts; do
  basename=$(basename "$route_file" .ts)

  # Skip non-route files
  if [[ "$basename" == "index" ]]; then
    continue
  fi

  test_file="$TESTS_DIR/${basename}.test.ts"

  if [ ! -f "$test_file" ]; then
    MISSING+=("$basename: no test file at $test_file")
    continue
  fi

  # Check if test file contains Zod schema validation (safeParse, parse, or Schema)
  if ! grep -qE '(safeParse|\.parse\(|Schema)' "$test_file"; then
    MISSING+=("$basename: test file lacks Zod schema validation")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "FAIL: API contract test gaps found:"
  for gap in "${MISSING[@]}"; do
    echo "  - $gap"
  done
  exit 1
fi

echo "PASS: All API routes have contract tests with schema validation"
