# Datenbanken & Deployment

Dieses Dokument beschreibt, wie du die Anwendung mit Postgres oder MySQL betreibst.

Kurz: Unterstützte DBs in diesem Projekt

- SQLite (Default, lokale Datei)
- PostgreSQL (empfohlen für Produktion)
- MySQL / MariaDB

Vorbereitung

1. Kopiere die Beispiel‑Datei:

```bash
cp .env.example .env
# Passe Werte wie POSTGRES_USER, POSTGRES_PASSWORD, MYSQL_PASSWORD, SECRET_KEY an
```

1. Die im Image benötigten Datenbanktreiber sind bereits enthalten; eine manuelle Installation ist nicht erforderlich.

2. Die im Image benötigten Datenbanktreiber sind bereits enthalten; eine manuelle Installation ist nicht erforderlich.

Compose‑Stacks

- Postgres‑Stack: `docker-compose.postgres.yaml`
- MySQL‑Stack: `docker-compose.mysql.yaml`

Starten:

Die bereitgestellten Compose‑Dateien verwenden standardmäßig ein veröffentlichtes, fertiges Image. Starte das gewünschte Stack mit:

```bash
# Postgres (veröffentlichtes Image)
docker compose -f docker-compose.postgres.yaml up -d

# MySQL (veröffentlichtes Image)
docker compose -f docker-compose.mysql.yaml up -d
```

Wenn du lokal bauen willst, baue das Image und passe die Compose‑Datei an, damit sie `build: .` verwendet oder die `image:`‑Zeile auf deinen lokalen Tag ändert:

```bash
docker build -t psmsimple:local .
docker compose -f docker-compose.postgres.yaml up -d
```

Migrationen
Dieses Projekt verwendet Flask‑Migrate (Alembic) und unterstützt mehrere Binds.

```bash
# revisions erzeugen
flask db migrate -m "Beschreibung"

# Migration anwenden
flask db upgrade
```

Wichtige Hinweise

- Die Compose‑Files lesen sensible Werte aus `.env`. Nutze keine Secrets im Repo.
- Charset: MySQL wird mit `utf8mb4` konfiguriert; bei Postgres auf UTF‑8 achten.
- Die App konfiguriert Verbindungen über `SQLALCHEMY_DATABASE_URI`, `APP_DB_URI` und `USER_DB_URI`.
