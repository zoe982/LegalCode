#!/usr/bin/env bash
# Function-level TDD enforcement hook: blocks new exports without test references.
# Used as a Claude Code PreToolUse shell hook for Write|Edit.
#
# Input: CLAUDE_TOOL_INPUT env var with JSON containing file_path and content/new_string
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

# Skip test files, type declarations, non-TypeScript
if echo "$FILE_PATH" | grep -qE '\.(test|spec)\.(ts|tsx)$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

if echo "$FILE_PATH" | grep -qE '\.d\.ts$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Derive the expected test file path
TEST_FILE=$(python3 -c "
import re, os, sys
fp = '$FILE_PATH'
m = re.search(r'packages/([^/]+)/src/(.+)\.(tsx?)$', fp)
if not m:
    sys.exit(1)
pkg, rest, ext = m.group(1), m.group(2), m.group(3)
idx = fp.index('packages/')
root = fp[:idx]
test_path = os.path.join(root, 'packages', pkg, 'tests', rest + '.test.' + ext)
print(test_path)
" 2>/dev/null || echo "")

if [ -z "$TEST_FILE" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# If no test file exists, the tdd-check-test-exists.sh hook handles that
if [ ! -f "$TEST_FILE" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Get the content being written
CONTENT=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('content', '') or data.get('new_string', ''))
" 2>/dev/null || echo "")

if [ -z "$CONTENT" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Extract exported function/const names from the new content
EXPORTS=$(echo "$CONTENT" | python3 -c "
import sys, re
content = sys.stdin.read()
# Match: export function name, export async function name, export const name
names = re.findall(r'export\s+(?:async\s+)?(?:function|const|class)\s+(\w+)', content)
for name in names:
    print(name)
" 2>/dev/null || echo "")

if [ -z "$EXPORTS" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Check each export appears somewhere in the test file
MISSING=""
while IFS= read -r export_name; do
  if [ -n "$export_name" ] && ! grep -q "$export_name" "$TEST_FILE" 2>/dev/null; then
    MISSING="${MISSING} ${export_name}"
  fi
done <<< "$EXPORTS"

if [ -n "$MISSING" ]; then
  REASON="TDD VIOLATION: New exported symbols [${MISSING# }] have no references in ${TEST_FILE}. Write tests for these exports first."
  REASON_JSON=$(echo "$REASON" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
  echo "{\"decision\":\"deny\",\"reason\":${REASON_JSON}}"
else
  echo '{"decision":"approve"}'
fi
