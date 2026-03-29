from .auth import bp as auth_bp
from .user import bp as user_bp
from .betrieb import bp as betrieb_bp
from .psm import bp as psm_bp
from .einsatzorte import bp as einsatzorte_bp
from .kulturen import bp as kulturen_bp
from .history import bp as history_bp
from .pages import bp as pages_bp
from .export import bp as export_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(betrieb_bp)
    app.register_blueprint(psm_bp)
    app.register_blueprint(einsatzorte_bp)
    app.register_blueprint(kulturen_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(pages_bp)
    app.register_blueprint(export_bp)