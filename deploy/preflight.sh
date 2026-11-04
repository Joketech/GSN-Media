#!/usr/bin/env bash
set -eu
printf 'GSN deployment preflight\n'
uname -srm
command -v docker >/dev/null || { printf 'Docker is not installed.\n'; exit 1; }
docker info --format 'Docker engine: {{.ServerVersion}}'
docker compose version
printf '\nRAM and disk\n'
free -h
df -h .
if command -v nvidia-smi >/dev/null 2>&1; then
  nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
else
  printf '\nNo NVIDIA driver detected. Use app/voice profiles only; GPU generation is unavailable here.\n'
fi
printf '\nCompose validation\n'
docker compose config --quiet
printf 'Preflight checks completed. No services were installed or started.\n'
