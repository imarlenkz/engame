#!/usr/bin/env bash
# Build and roll out EnGame on the VPS. Run from the repository root:  infra/scripts/deploy.sh
# Steps: back up the database, build images, migrate + seed, restart services, wait for /ready.
set -euo pipefail
cd "$(dirname "$0")/../.."

[ -f .env ] || { echo "Missing .env (copy .env.example)"; exit 1; }
set -a; . ./.env; set +a

export ENGAME_VERSION="${ENGAME_VERSION:-$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)}"
PORT="${GATEWAY_PORT:-4300}"

# Prometheus reads the metrics token from a file (kept out of git).
if [ -n "${METRICS_TOKEN:-}" ]; then
  umask 077; printf '%s' "$METRICS_TOKEN" > infra/monitoring/metrics_token
else
  : > infra/monitoring/metrics_token
fi

echo "==> Building images ($ENGAME_VERSION)"
docker compose build api web migrate

if docker compose ps --status running postgres | grep -q postgres; then
  echo "==> Backing up database before migrating"
  infra/scripts/backup.sh
fi

echo "==> Starting database and cache"
docker compose up -d postgres redis

echo "==> Migrating and seeding starter content (idempotent)"
docker compose run --rm migrate

echo "==> Starting application"
docker compose up -d --remove-orphans api web gateway
# The gateway (nginx) resolves api/web once at start-up; restart it so it picks up the new containers.
docker compose restart gateway

echo "==> Waiting for readiness"
for i in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}/api/v1/ready" >/dev/null 2>&1; then
    echo "EnGame $ENGAME_VERSION is up on 127.0.0.1:${PORT}"
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 2
done
echo "Readiness check failed. Recent API logs:"
docker compose logs --tail=80 api
exit 1
