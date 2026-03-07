#!/usr/bin/env bash
set -euo pipefail

# LegalCode Deploy Script
# Runs sequential quality gates with fail-fast behavior.
# Cook must run pre-deploy audits (Testing Engineer + Ive) BEFORE this script.

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

gate() {
  local name="$1"
  shift
  echo -e "${CYAN}[GATE] ${name}${NC}"
  if "$@"; then
    echo -e "${GREEN}[PASS] ${name}${NC}"
  else
    echo -e "${RED}[FAIL] ${name} — deploy aborted${NC}"
    exit 1
  fi
}

echo -e "${CYAN}=== LegalCode Deploy Pipeline ===${NC}"
echo ""

gate "TypeCheck"      pnpm typecheck
gate "Lint"           pnpm lint
gate "Security Scan"  pnpm security:scan
gate "Test + Coverage" pnpm test
gate "Build"          pnpm build
gate "Deploy"         npx wrangler deploy

echo ""
echo -e "${GREEN}=== Deploy complete ===${NC}"
