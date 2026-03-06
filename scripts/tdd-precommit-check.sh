#!/usr/bin/env bash
# TDD pre-commit hook: ensures every staged implementation file has a corresponding
# staged (or existing) test file. Blocks commits that add/modify implementation
# without tests.

set -euo pipefail

# Get staged implementation files (added or modified) in packages/*/src/
IMPL_FILES=$(git diff --cached --name-only --diff-filter=AM | grep -E '^packages/[^/]+/src/.*\.(ts|tsx)$' | grep -vE '\.(test|spec)\.(ts|tsx)$' || true)

if [ -z "$IMPL_FILES" ]; then
  exit 0
fi

MISSING=()

while IFS= read -r impl_file; do
  # Derive test file path: packages/<pkg>/src/<path>/<file>.ts -> packages/<pkg>/tests/<path>/<file>.test.ts
  test_file=$(echo "$impl_file" | sed -E 's#^(packages/[^/]+)/src/(.+)\.(ts|tsx)$#\1/tests/\2.test.\3#')

  # Check if the test file exists (either staged or on disk)
  if ! git ls-files --cached --others "$test_file" 2>/dev/null | grep -q .; then
    if [ ! -f "$test_file" ]; then
      MISSING+=("$impl_file -> missing: $test_file")
    fi
  fi
done <<< "$IMPL_FILES"

if [ ${#MISSING[@]} -gt 0 ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  TDD VIOLATION: Implementation files committed without tests ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  for m in "${MISSING[@]}"; do
    echo "║  $m"
  done
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Create test files first, then commit both together.        ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi
