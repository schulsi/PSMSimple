"""add kultur to fields

Revision ID: fc5fcb151b52
Revises: 
Create Date: 2026-05-15 20:24:05.644051

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fc5fcb151b52'
down_revision = None
branch_labels = None
depends_on = None


def upgrade(engine_name):
    globals()[f"upgrade_{engine_name}"]()


def downgrade(engine_name):
    globals()[f"downgrade_{engine_name}"]()


def upgrade_app_db():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("einsatzorte")}
    foreign_keys = inspector.get_foreign_keys("einsatzorte")
    has_kultur_fk = any(
        foreign_key.get("referred_table") == "kulturen"
        and foreign_key.get("constrained_columns") == ["kultur_id"]
        for foreign_key in foreign_keys
    )

    with op.batch_alter_table("einsatzorte", schema=None) as batch_op:
        if "kultur_id" not in columns:
            batch_op.add_column(sa.Column("kultur_id", sa.Integer(), nullable=True))
        if not has_kultur_fk:
            batch_op.create_foreign_key(
                "fk_einsatzorte_kultur_id_kulturen",
                "kulturen",
                ["kultur_id"],
                ["id"],
            )


def downgrade_app_db():
    inspector = sa.inspect(op.get_bind())
    columns = {column["name"] for column in inspector.get_columns("einsatzorte")}
    foreign_keys = inspector.get_foreign_keys("einsatzorte")
    kultur_fk = next(
        (
            foreign_key
            for foreign_key in foreign_keys
            if foreign_key.get("referred_table") == "kulturen"
            and foreign_key.get("constrained_columns") == ["kultur_id"]
        ),
        None,
    )

    with op.batch_alter_table("einsatzorte", schema=None) as batch_op:
        if kultur_fk and kultur_fk.get("name"):
            batch_op.drop_constraint(kultur_fk["name"], type_="foreignkey")
        if "kultur_id" in columns:
            batch_op.drop_column("kultur_id")


def upgrade_user_db():
    pass


def downgrade_user_db():
    pass
