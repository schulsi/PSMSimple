from flask import Flask, jsonify, request, render_template, flash, redirect, url_for
from flask_wtf.csrf import CSRFError
from flask_limiter.errors import RateLimitExceeded
from werkzeug.middleware.proxy_fix import ProxyFix

from .config import Config
from .extensions import db, login_manager, csrf, limiter, swagger
from .models import User, ApplicationSetting, Applikationen, BBCH_Codes, Betrieb, Felder, Inventory, Kulturen, Orte, Pflanzenschutzmittel, UserRole, user
from .routes import register_blueprints
from .repositories.sqlite import init_appdata_db
from .services.permissions import seed_roles


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


def create_app():
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(Config)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    swagger.init_app(app)

    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)

    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        if request.path.startswith("/api/"):
            return jsonify({"ok": False, "error": f"CSRF-Fehler: {e.description}"}), 400
        flash(f"CSRF-Fehler: {e.description}", "error")
        return redirect(url_for("auth.login"))

    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit_error(e):
        if request.path.startswith("/api/"):
            return jsonify({"ok": False, "error": "Zu viele Anfragen. Bitte später erneut versuchen."}), 429
        flash("Zu viele Anfragen. Bitte später erneut versuchen.", "error")
        return redirect(url_for("auth.login"))

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

        # Erst bewusst etwas lockerer starten, später weiter einschränken
        if request.path.startswith("/apidocs") or request.path.startswith("/flasgger_static"):
            response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
                "style-src 'self' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; "
                "connect-src 'self' https://psm-api.bvl.bund.de https://cdn.jsdelivr.net https://api.open-meteo.com https://geocoding-api.open-meteo.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        return response

    with app.app_context():
        db.create_all()
        seed_roles()
        init_appdata_db()

    register_blueprints(app)
    return app
