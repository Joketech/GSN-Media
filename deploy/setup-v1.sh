#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
if [ ! -f .env ]; then
  cp .env.example .env
  # The first deployment stays on the private SSH tunnel, without a domain.
  sed -i 's/^SITE_DOMAIN=.*/SITE_DOMAIN=/' .env
fi
if ! grep -Eq '^GSN_AGENT_TOKEN=.?[A-Za-z0-9_-]{32,}' .env; then
  task_token=$(openssl rand -hex 32)
  if grep -q '^GSN_AGENT_TOKEN=' .env; then
    sed -i "s/^GSN_AGENT_TOKEN=.*/GSN_AGENT_TOKEN=$task_token/" .env
  else
    printf '\nGSN_AGENT_TOKEN=%s\n' "$task_token" >> .env
  fi
fi
chmod 600 .env
printf '%s\n' 'V1 configured. Access key stays in .env. Do not send it in chat.'
printf '%s\n' 'Start with: docker compose --profile voice up -d --build app voice'
printf '%s\n' 'For your browser only, display the key privately: sed -n "s/^GSN_AGENT_TOKEN=//p" .env'
