# Databases & Deployment

This document explains how to run the application with Postgres or MySQL.

Supported DBs

- SQLite (default, file)
- PostgreSQL (recommended for production)
- MySQL / MariaDB

Setup

1. Copy the example env file:

```bash
cp .env.example .env
# edit .env and set POSTGRES_USER, POSTGRES_PASSWORD, MYSQL_PASSWORD, SECRET_KEY
```

1. The database drivers required by the application are included in the published image; no manual installation is necessary.

Compose stacks

- Postgres stack: `docker-compose.postgres.yaml`
- MySQL stack: `docker-compose.mysql.yaml`

Start:

The provided compose files use a published prebuilt image by default. Start the stack with:

```bash
# Postgres (published image)
docker compose -f docker-compose.postgres.yaml up -d

# MySQL (published image)
docker compose -f docker-compose.mysql.yaml up -d
```

If you prefer to build locally, build the image and edit the compose file to use `build: .` or change the `image:` line to your local tag:

```bash
docker build -t psmsimple:local .
docker compose -f docker-compose.postgres.yaml up -d
```

Migrations
This project uses Flask‑Migrate (Alembic) and supports multiple binds.

```bash
# create a migration
flask db migrate -m "Describe changes"

# apply migrations
flask db upgrade
```

Notes

- Compose files load secrets from `.env`. Do not commit real secrets.
- Charset: MySQL is configured to use `utf8mb4`; ensure Postgres uses UTF‑8.
- The app reads DB connections from `SQLALCHEMY_DATABASE_URI`, `APP_DB_URI` and `USER_DB_URI`.
