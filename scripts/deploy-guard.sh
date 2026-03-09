#!/usr/bin/env bash
# Deploy guard hook: warns before deploy commands.
# Used as a Claude Code PreToolUse shell hook for Bash.
#
# Input: CLAUDE_TOOL_INPUT env var with JSON containing command
# Output: JSON with decision (approve + optional systemMessage)

set -euo pipefail

COMMAND=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('command',''))" 2>/dev/null || echo "")

if echo "$COMMAND" | grep -qE 'scripts/deploy\.sh|wrangler deploy'; then
  echo '{"decision":"approve","systemMessage":"DEPLOY GUARD: Before deploying, ensure you have run: (1) pnpm contract:check, (2) dispatched Security Reviewer if security-critical files changed, (3) dispatched Testing Engineer for coverage audit, (4) dispatched QA Engineer for quality audit."}'
else
  echo '{"decision":"approve"}'
fi
