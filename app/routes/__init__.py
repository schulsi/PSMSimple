from .auth import bp as auth_bp
from .user import bp as user_bp
from .betrieb import bp as betrieb_bp
from .psm import bp as psm_bp
from .einsatzorte import bp as einsatzorte_bp
from .kulturen import bp as kulturen_bp
from .history import bp as history_bp
from .pages import bp as pages_bp
from .export import bp as export_bp
from .psm_lookup import bp as psm_lookup_bp
from .settings import settings_bp
from .bbch import bp as bbch_bp
from .weather import bp as weather_bp
from .orte import bp as orte_bp
from .inventory import bp as inventory_bp
from .beratung import bp as beratung_bp
from .version import bp as version_bp
from .meldungen import bp as meldungen_bp


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
    app.register_blueprint(psm_lookup_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(bbch_bp)
    app.register_blueprint(weather_bp)
    app.register_blueprint(orte_bp)
    app.register_blueprint(inventory_bp)
    app.register_blueprint(beratung_bp)
    app.register_blueprint(version_bp)
    app.register_blueprint(meldungen_bp)
