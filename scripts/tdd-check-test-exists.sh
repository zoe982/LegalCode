#!/usr/bin/env bash
# TDD enforcement hook: blocks writes to implementation files that have no test file.
# Used as a Claude Code PreToolUse shell hook for Write|Edit.
#
# Input: CLAUDE_TOOL_INPUT env var with JSON containing file_path
# Output: JSON with decision (approve/deny)

set -euo pipefail

# Parse the file path from the tool input JSON
FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('file_path',''))" 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Only enforce for implementation files in packages/*/src/
if ! echo "$FILE_PATH" | grep -qE 'packages/[^/]+/src/'; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Skip test files themselves
if echo "$FILE_PATH" | grep -qE '\.(test|spec)\.(ts|tsx)$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Skip non-TypeScript files
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Derive the expected test file path using python3 (portable, no sed issues)
TEST_FILE=$(python3 -c "
import re, os, sys
fp = '$FILE_PATH'
m = re.search(r'packages/([^/]+)/src/(.+)\.(tsx?)$', fp)
if not m:
    sys.exit(1)
pkg, rest, ext = m.group(1), m.group(2), m.group(3)
# Find project root: walk up from file path to find packages/ parent
idx = fp.index('packages/')
root = fp[:idx]
test_path = os.path.join(root, 'packages', pkg, 'tests', rest + '.test.' + ext)
print(test_path)
" 2>/dev/null || echo "")

if [ -z "$TEST_FILE" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

if [ -f "$TEST_FILE" ]; then
  echo '{"decision":"approve"}'
else
  echo "{\"decision\":\"deny\",\"reason\":\"TDD VIOLATION: No test file found at ${TEST_FILE}. You must create the test file BEFORE writing implementation code.\"}"
fi
