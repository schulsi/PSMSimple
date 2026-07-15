"""add OIDC identity to users

Revision ID: c1a2b3c4d5e6
Revises: 9d7e3b6a8c21
Create Date: 2026-07-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "c1a2b3c4d5e6"
down_revision = "9d7e3b6a8c21"
branch_labels = None
depends_on = None


def upgrade(engine_name):
    globals()[f"upgrade_{engine_name}"]()


def downgrade(engine_name):
    globals()[f"downgrade_{engine_name}"]()


def upgrade_app_db():
    pass


def downgrade_app_db():
    pass


def upgrade_user_db():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    indexes = {index["name"] for index in inspector.get_indexes("users")}

    if "email" not in columns:
        op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    if "oidc_issuer" not in columns:
        op.add_column("users", sa.Column("oidc_issuer", sa.String(length=500), nullable=True))
    if "oidc_subject" not in columns:
        op.add_column("users", sa.Column("oidc_subject", sa.String(length=255), nullable=True))
    if "uq_users_oidc_identity" not in indexes:
        op.create_index(
            "uq_users_oidc_identity",
            "users",
            ["oidc_issuer", "oidc_subject"],
            unique=True,
        )


def downgrade_user_db():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("users")}
    indexes = {index["name"] for index in inspector.get_indexes("users")}

    if "uq_users_oidc_identity" in indexes:
        op.drop_index("uq_users_oidc_identity", table_name="users")

    with op.batch_alter_table("users", schema=None) as batch_op:
        if "oidc_subject" in columns:
            batch_op.drop_column("oidc_subject")
        if "oidc_issuer" in columns:
            batch_op.drop_column("oidc_issuer")
        if "email" in columns:
            batch_op.drop_column("email")
