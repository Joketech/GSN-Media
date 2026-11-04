#!/usr/bin/env bash
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
test -f .env || { printf 'Create .env from .env.example before deployment.\n'; exit 1; }
PROFILE_ARGS='--profile voice --profile public'
if [ "${1:-}" = gpu ]; then
  command -v nvidia-smi >/dev/null || { printf 'GPU profile requires a configured NVIDIA GPU.\n'; exit 1; }
  PROFILE_ARGS="$PROFILE_ARGS --profile gpu"
fi
# PROFILE_ARGS contains only the fixed flags set above, never user-supplied shell text.
docker compose -f compose.yaml -f compose.vps.yaml $PROFILE_ARGS config --quiet
docker compose -f compose.yaml -f compose.vps.yaml $PROFILE_ARGS pull
docker compose -f compose.yaml -f compose.vps.yaml $PROFILE_ARGS up -d --no-build --wait --wait-timeout 240
docker compose ps
