#!/usr/bin/env bash
# Daily backup: PostgreSQL dump + uploaded media, kept for $BACKUP_KEEP_DAYS days (default 14).
# Cron example (03:30 every day):
#   30 3 * * * cd /opt/engame && infra/scripts/backup.sh >> /var/log/engame-backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a; . ./.env; set +a

DIR="${BACKUP_DIR:-$PWD/backups}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIR"
umask 077

docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-engame}" -d "${POSTGRES_DB:-engame}" --format=custom --no-owner \
  > "$DIR/db-$STAMP.dump"
# Verify the archive is readable before trusting it.
docker compose exec -T postgres pg_restore --list < "$DIR/db-$STAMP.dump" > /dev/null

if [ "${STORAGE_DRIVER:-local}" = "local" ]; then
  docker compose run --rm --no-deps -T --entrypoint tar api -C /data -czf - uploads > "$DIR/uploads-$STAMP.tar.gz"
fi

find "$DIR" -name 'db-*.dump' -mtime +"$KEEP" -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +"$KEEP" -delete
echo "Backup written: $DIR/db-$STAMP.dump"
