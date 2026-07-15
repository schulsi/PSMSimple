"""add meldungen

Revision ID: 9d7e3b6a8c21
Revises: fc5fcb151b52
Create Date: 2026-05-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9d7e3b6a8c21"
down_revision = "fc5fcb151b52"
branch_labels = None
depends_on = None


def upgrade(engine_name):
    globals()[f"upgrade_{engine_name}"]()


def downgrade(engine_name):
    globals()[f"downgrade_{engine_name}"]()


def upgrade_app_db():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    if "meldungen" not in tables:
        op.create_table(
            "meldungen",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("flaeche_id", sa.Integer(), sa.ForeignKey("einsatzorte.id"), nullable=True),
            sa.Column("datum", sa.Text(), nullable=False),
            sa.Column("typ", sa.Text(), nullable=False),
            sa.Column("titel", sa.Text(), nullable=False),
            sa.Column("beschreibung", sa.Text(), nullable=True),
            sa.Column("status", sa.Text(), server_default="offen", nullable=True),
            sa.Column("prioritaet", sa.Text(), server_default="normal", nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("created_at", sa.Text(), nullable=False),
            sa.Column("updated_at", sa.Text(), nullable=False),
        )

    if "meldung_fotos" not in tables:
        op.create_table(
            "meldung_fotos",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("meldung_id", sa.Integer(), sa.ForeignKey("meldungen.id"), nullable=False),
            sa.Column("filename", sa.Text(), nullable=False),
            sa.Column("path", sa.Text(), nullable=False),
            sa.Column("created_at", sa.Text(), nullable=False),
        )


def downgrade_app_db():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())

    if "meldung_fotos" in tables:
        op.drop_table("meldung_fotos")

    if "meldungen" in tables:
        op.drop_table("meldungen")


def upgrade_user_db():
    pass


def downgrade_user_db():
    pass
