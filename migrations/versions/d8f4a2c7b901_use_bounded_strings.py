"""use bounded strings for short model fields

Revision ID: d8f4a2c7b901
Revises: c1a2b3c4d5e6
Create Date: 2026-07-30 18:30:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "d8f4a2c7b901"
down_revision = "c1a2b3c4d5e6"
branch_labels = None
depends_on = None


APP_DB_STRING_COLUMNS = {
    "application_settings": {"key": 255},
    "applikationen": {
        "created_at": 32,
        "datum": 32,
        "uhrzeit": 16,
        "artVerwendung": 100,
        "verantwortlich": 255,
        "anwender": 255,
    },
    "bbch_codes": {"code": 32, "bezeichnung": 255},
    "betrieb": {
        "firma": 255,
        "name": 255,
        "vorname": 255,
        "strHnr": 255,
        "plz": 16,
        "ort": 255,
        "bundesland": 100,
        "guid": 64,
    },
    "einsatzorte": {
        "name": 255,
        "anwendungsbereich": 255,
        "geoTyp": 50,
        "einheit": 50,
    },
    "inventory_movements": {
        "typ": 50,
        "einheit": 50,
        "datum": 32,
        "quelle": 255,
    },
    "kulturen": {"name": 255, "eppoCode": 32},
    "meldungen": {
        "datum": 32,
        "typ": 50,
        "titel": 255,
        "status": 50,
        "prioritaet": 50,
        "created_at": 32,
        "updated_at": 32,
    },
    "meldung_fotos": {"filename": 255, "path": 1024, "created_at": 32},
    "orte": {"name": 255},
    "pflanzenschutzmittel": {
        "name": 255,
        "zulassungsnr": 64,
        "aufwandEinheit": 50,
        "bienen": 50,
        "lager_einheit": 50,
    },
}


def upgrade(engine_name):
    globals()[f"upgrade_{engine_name}"]()


def downgrade(engine_name):
    globals()[f"downgrade_{engine_name}"]()


def _columns_by_name(table_name):
    return {
        column["name"]: column
        for column in sa.inspect(op.get_bind()).get_columns(table_name)
    }


def _upgrade_columns(table_name, lengths):
    columns = _columns_by_name(table_name)
    with op.batch_alter_table(table_name) as batch_op:
        for column_name, length in lengths.items():
            column = columns.get(column_name)
            if column is None or getattr(column["type"], "length", None) == length:
                continue
            batch_op.alter_column(
                column_name,
                existing_type=column["type"],
                type_=sa.String(length=length),
                existing_nullable=column["nullable"],
            )


def _downgrade_columns(table_name, lengths):
    columns = _columns_by_name(table_name)
    with op.batch_alter_table(table_name) as batch_op:
        for column_name in lengths:
            # A TEXT primary key is invalid on MySQL, so this compatibility fix
            # intentionally remains in place when downgrading the revision.
            if table_name == "application_settings" and column_name == "key":
                continue
            column = columns.get(column_name)
            if column is None or isinstance(column["type"], sa.Text):
                continue
            batch_op.alter_column(
                column_name,
                existing_type=column["type"],
                type_=sa.Text(),
                existing_nullable=column["nullable"],
            )


def upgrade_app_db():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    for table_name, lengths in APP_DB_STRING_COLUMNS.items():
        if table_name in tables:
            _upgrade_columns(table_name, lengths)


def downgrade_app_db():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    for table_name, lengths in reversed(APP_DB_STRING_COLUMNS.items()):
        if table_name in tables:
            _downgrade_columns(table_name, lengths)


def upgrade_user_db():
    pass


def downgrade_user_db():
    pass
