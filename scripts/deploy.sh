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

gate "Dep Audit"       pnpm audit:security
gate "TypeCheck"       pnpm typecheck
gate "Lint"            pnpm lint
gate "Dead Code"       pnpm dead-code
gate "Security Scan"   pnpm security:scan
gate "Contract Tests"  pnpm contract:check
gate "Migration Drift" bash scripts/migration-drift-check.sh
gate "Test + Coverage" pnpm test:coverage
gate "Build"           pnpm build
gate "Bundle Size"     pnpm bundle:check
gate "Deploy"          npx wrangler deploy

echo ""
echo -e "${GREEN}=== Deploy complete ===${NC}"
echo ""

# Post-deploy validation (non-blocking on failure, but reports)
echo -e "${CYAN}=== Post-Deploy Validation ===${NC}"
echo "Waiting 5s for edge propagation..."
sleep 5
gate "Security Headers" pnpm security:headers
