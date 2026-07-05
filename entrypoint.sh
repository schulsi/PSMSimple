#!/bin/sh
set -e

PUID="${PUID:-0}"
PGID="${PGID:-0}"

mkdir -p /data/logs /data/databases /data/exports

# Wenn root gewünscht ist, direkt starten
if [ "$PUID" = "0" ] && [ "$PGID" = "0" ]; then
    exec "$@"
fi

# Gruppe/User dynamisch anlegen, falls nicht vorhanden
if ! getent group "$PGID" >/dev/null 2>&1; then
    groupadd -g "$PGID" psmsimple
fi

if ! getent passwd "$PUID" >/dev/null 2>&1; then
    useradd -u "$PUID" -g "$PGID" -d /tmp -s /usr/sbin/nologin psmsimple
fi

# Schreibrechte für gemountetes /data setzen
chown -R "$PUID:$PGID" /data || true

exec gosu "$PUID:$PGID" "$@"