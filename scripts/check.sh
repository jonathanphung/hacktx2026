#!/usr/bin/env bash
# One command for "is this safe to merge?" — run locally before pushing; CI runs it too.
# Auto-detects each lane's stack, so new directories get checked without editing this file.
set -euo pipefail
cd "$(dirname "$0")/.."

ran=0
for dir in web api ai shared .; do
  [ -d "$dir" ] || continue

  if [ -f "$dir/package.json" ]; then
    echo "==> $dir (node)"
    ran=1
    (
      cd "$dir"
      if [ -f pnpm-lock.yaml ]; then pm=pnpm; elif [ -f yarn.lock ]; then pm=yarn; else pm=npm; fi
      if [ "$pm" = npm ]; then npm ci 2>/dev/null || npm install; else $pm install --frozen-lockfile; fi
      for script in lint typecheck test build; do
        if node -e "process.exit(require('./package.json').scripts?.['$script'] ? 0 : 1)"; then
          $pm run "$script"
        fi
      done
    )
  fi

  if [ -f "$dir/pyproject.toml" ] || [ -f "$dir/requirements.txt" ]; then
    echo "==> $dir (python)"
    ran=1
    (
      cd "$dir"
      [ -f requirements.txt ] && pip install -q -r requirements.txt
      [ -f pyproject.toml ] && pip install -q -e . 2>/dev/null || true
      if command -v ruff >/dev/null; then ruff check .; fi
      if ls tests test_*.py */test_*.py >/dev/null 2>&1; then python -m pytest -q; fi
    )
  fi
done

[ "$ran" = 1 ] || echo "No projects found yet — nothing to check."
echo "check.sh: OK"
