#!/usr/bin/env bash
set -euo pipefail

# Bundle Size Budget Check
# Ensures total JS+CSS in packages/web/dist/assets/ stays under budget.

BUDGET_BYTES=$((3584 * 1024))  # 3.5 MiB
DIST_DIR="packages/web/dist/assets"

if [ ! -d "$DIST_DIR" ]; then
  echo "ERROR: $DIST_DIR not found. Run 'pnpm build' first."
  exit 1
fi

# Cross-platform file size (macOS vs Linux)
get_size() {
  if stat --version >/dev/null 2>&1; then
    stat -c%s "$1"  # GNU/Linux
  else
    stat -f%z "$1"  # macOS
  fi
}

total=0
while IFS= read -r -d '' file; do
  size=$(get_size "$file")
  total=$((total + size))
done < <(find "$DIST_DIR" -type f \( -name '*.js' -o -name '*.css' \) -print0)

budget_mib=$(echo "scale=2; $BUDGET_BYTES / 1048576" | bc)
total_mib=$(echo "scale=2; $total / 1048576" | bc)

if [ "$total" -gt "$BUDGET_BYTES" ]; then
  echo "FAIL: Bundle size ${total_mib} MiB exceeds budget ${budget_mib} MiB"
  echo ""
  echo "Top files by size:"
  find "$DIST_DIR" -type f \( -name '*.js' -o -name '*.css' \) -exec ls -lhS {} + | head -10
  exit 1
fi

echo "PASS: Bundle size ${total_mib} MiB within budget ${budget_mib} MiB"
