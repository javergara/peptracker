#!/usr/bin/env bash
# Stop hook: print a short TypeScript typecheck summary. Informational only —
# ALWAYS exits 0 so it never blocks the session, and tolerates missing tools.

set +e

# Drain stdin (the Stop event) so the producer never blocks.
cat >/dev/null 2>&1

# Move to the project root (this script lives in .claude/hooks/).
ROOT="$(cd "$(dirname "$0")/../.." 2>/dev/null && pwd)"
[ -n "$ROOT" ] && cd "$ROOT" 2>/dev/null

# Need npx + a tsconfig to do anything useful.
if ! command -v npx >/dev/null 2>&1; then
  echo "typecheck: skipped (npx not found)"
  exit 0
fi
[ -f tsconfig.json ] || { echo "typecheck: skipped (no tsconfig.json)"; exit 0; }

OUT="$(npx --no-install tsc --noEmit 2>&1)"
STATUS=$?

if [ "$STATUS" -eq 0 ]; then
  echo "typecheck: OK (tsc --noEmit clean)"
else
  COUNT="$(printf '%s\n' "$OUT" | grep -c 'error TS' 2>/dev/null)"
  echo "typecheck: ${COUNT:-?} TypeScript error(s) — run \`npm run typecheck\` for details:"
  printf '%s\n' "$OUT" | grep 'error TS' 2>/dev/null | head -n 10
fi

exit 0
