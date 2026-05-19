import click
from flask.cli import with_appcontext
from werkzeug.security import generate_password_hash

from .extensions import db
from .models.user import User
from .repositories.role_repo import get_role_id
from .routes.auth import USERNAME_RE


@click.command("ensure-user")
@click.option("--username", envvar="PSM_CI_USERNAME", required=True)
@click.option("--password", envvar="PSM_CI_PASSWORD", required=True)
@click.option("--role", envvar="PSM_CI_ROLE", default="user", show_default=True)
@with_appcontext
def ensure_user(username, password, role):
    username = username.strip()

    if USERNAME_RE.match(username) is None:
        raise click.ClickException(
            "Invalid username. Use 2-50 letters, numbers, dots, dashes or underscores."
        )

    if len(password) < 6:
        raise click.ClickException("Password must be at least 6 characters long.")

    role_id = get_role_id(role)
    if role_id is None:
        raise click.ClickException(f"Unknown role: {role}")

    user = User.query.filter_by(username=username).first()
    if user:
        user.password = generate_password_hash(password)
        user.role_id = role_id
        action = "updated"
    else:
        user = User(
            username=username,
            password=generate_password_hash(password),
            role_id=role_id,
        )
        db.session.add(user)
        action = "created"

    db.session.commit()
    click.echo(f"User '{username}' {action} with role '{role}'.")


def register_cli(app):
    app.cli.add_command(ensure_user)
