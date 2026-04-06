#!/usr/bin/env sh
set -eu

# Ensure key writable dirs exist (some are Docker volumes)
mkdir -p /app/dist /app/.angular /app/node_modules

# Best-effort: make them writable by the non-root app user
# (on Windows bind mounts / special FS, chown may fail; keep going)
chown -R appuser:appgroup /app/dist /app/.angular /app/node_modules 2>/dev/null || true

exec su-exec appuser "$@"
