from flask import Flask

from .config import Config
from .extensions import db, login_manager
from .models import User
from .routes import register_blueprints
from .repositories.sqlite import init_appdata_db


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def create_app():
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)

    with app.app_context():
        db.create_all()
        init_appdata_db()

    register_blueprints(app)
    return app