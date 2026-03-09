#!/usr/bin/env bash
# Type safety enforcement hook: blocks writes containing unsafe type casts/suppressions.
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

# Skip test files
if echo "$FILE_PATH" | grep -qE '\.(test|spec)\.(ts|tsx)$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Skip type declaration files
if echo "$FILE_PATH" | grep -qE '\.d\.ts$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Skip non-TypeScript files
if ! echo "$FILE_PATH" | grep -qE '\.(ts|tsx)$'; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Get the content being written (Write tool uses 'content', Edit uses 'new_string')
CONTENT=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('content', '') or data.get('new_string', ''))
" 2>/dev/null || echo "")

if [ -z "$CONTENT" ]; then
  echo '{"decision":"approve"}'
  exit 0
fi

# Check for banned patterns
VIOLATIONS=""

if echo "$CONTENT" | grep -qE 'as unknown as'; then
  VIOLATIONS="${VIOLATIONS}\n- 'as unknown as' double-cast found. Use batchOps() helper or typed narrowing instead."
fi

if echo "$CONTENT" | grep -qE 'as any'; then
  VIOLATIONS="${VIOLATIONS}\n- 'as any' cast found. Use proper type narrowing or Zod validation instead."
fi

if echo "$CONTENT" | grep -qE '@ts-ignore'; then
  VIOLATIONS="${VIOLATIONS}\n- '@ts-ignore' directive found. Fix the type error instead of suppressing it."
fi

if echo "$CONTENT" | grep -qE '@ts-expect-error'; then
  VIOLATIONS="${VIOLATIONS}\n- '@ts-expect-error' directive found. Fix the type error instead of suppressing it."
fi

if [ -n "$VIOLATIONS" ]; then
  # Escape for JSON
  REASON=$(printf "TYPE SAFETY VIOLATION in %s:%b\nUse typed alternatives: batchOps() for Drizzle batch, Partial<\$inferInsert> for update objects, Zod for validation." "$FILE_PATH" "$VIOLATIONS")
  REASON_JSON=$(echo "$REASON" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")
  echo "{\"decision\":\"deny\",\"reason\":${REASON_JSON}}"
else
  echo '{"decision":"approve"}'
fi
