#!/usr/bin/env bash
set -euo pipefail

# Detect schema drift: if drizzle-kit generate produces new migration files,
# schema.ts has changes not reflected in existing migrations.

echo "Checking for migration drift..."

# Run drizzle-kit generate with a temp name
npx drizzle-kit generate --name drift-check 2>/dev/null || true

# Check if any new migration files were generated
DRIFT=$(git status --porcelain drizzle/)

if [ -n "$DRIFT" ]; then
  echo "ERROR: Schema drift detected — schema.ts has changes not reflected in migrations"
  echo "$DRIFT"
  # Clean up generated files
  git checkout -- drizzle/ 2>/dev/null || true
  rm -f drizzle/meta/_journal_tmp.json 2>/dev/null || true
  exit 1
fi

echo "No migration drift detected."
