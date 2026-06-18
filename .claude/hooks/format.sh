#!/usr/bin/env bash
# PostToolUse(Edit|Write) hook: defensively prettier-format the edited file.
# Reads the JSON tool event from stdin, extracts .tool_input.file_path, and runs
# `npx prettier --write` on supported file types. ALWAYS exits 0 — must never
# block or fail the session, and tolerates missing tools.

set +e

# Read the whole stdin event.
EVENT="$(cat 2>/dev/null)"

# Extract the file path portably via node (Claude Code always has node available).
FILE_PATH=""
if command -v node >/dev/null 2>&1; then
  FILE_PATH="$(printf '%s' "$EVENT" | node -e '
    let s = "";
    process.stdin.on("data", d => (s += d));
    process.stdin.on("end", () => {
      try {
        const e = JSON.parse(s);
        const p = (e && e.tool_input && e.tool_input.file_path) || "";
        process.stdout.write(String(p));
      } catch (_) {
        process.stdout.write("");
      }
    });
  ' 2>/dev/null)"
fi

# Nothing to do if we could not determine a file path or it does not exist.
[ -z "$FILE_PATH" ] && exit 0
[ -f "$FILE_PATH" ] || exit 0

# Only format known formattable extensions.
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css|*.md)
    if command -v npx >/dev/null 2>&1; then
      npx --no-install prettier --write "$FILE_PATH" >/dev/null 2>&1 \
        || npx prettier --write "$FILE_PATH" >/dev/null 2>&1
    fi
    ;;
esac

exit 0
