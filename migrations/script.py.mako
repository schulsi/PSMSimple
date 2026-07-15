<%!
import re
%>"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}


revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade(engine_name):
    globals()[f"upgrade_{engine_name}"]()


def downgrade(engine_name):
    globals()[f"downgrade_{engine_name}"]()

<%
    from flask import current_app
    bind_names = list(current_app.config.get("SQLALCHEMY_BINDS", {}).keys())
%>
% for bind_name in bind_names:

def upgrade_${bind_name}():
    ${context.get(f"{bind_name}_upgrades", "pass")}


def downgrade_${bind_name}():
    ${context.get(f"{bind_name}_downgrades", "pass")}

% endfor
