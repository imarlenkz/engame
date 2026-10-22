#!/usr/bin/env bash
# Restore a backup made by backup.sh. Stops the app, replaces the database (and media when given).
#   infra/scripts/restore.sh backups/db-20261022-033000.dump [backups/uploads-20261022-033000.tar.gz]
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a

DUMP="${1:?usage: restore.sh <db-dump> [uploads.tar.gz]}"
UPLOADS="${2:-}"
[ -f "$DUMP" ] || { echo "No such file: $DUMP"; exit 1; }

read -r -p "This replaces the current database with $DUMP. Type 'restore' to continue: " answer
[ "$answer" = "restore" ] || { echo "Cancelled"; exit 1; }

docker compose stop gateway web api
docker compose exec -T postgres pg_restore -U "${POSTGRES_USER:-engame}" -d "${POSTGRES_DB:-engame}" \
  --clean --if-exists --no-owner --single-transaction < "$DUMP"

if [ -n "$UPLOADS" ]; then
  docker compose run --rm --no-deps -T --entrypoint sh api -c 'rm -rf /data/uploads/* && tar -C /data -xzf -' < "$UPLOADS"
fi

docker compose up -d api web gateway
echo "Restored. Sessions are stored in the database, so anyone who signed in after the backup must sign in again."
