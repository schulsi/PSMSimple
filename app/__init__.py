import json
import secrets
from pathlib import Path

from flask import Flask, jsonify, request, flash, redirect, url_for, g
from flask_wtf.csrf import CSRFError
from flask_limiter.errors import RateLimitExceeded
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_migrate import Migrate, upgrade
from werkzeug.security import check_password_hash

from .config import Config
from .utils.warmup import _start_warmup_cache
from .extensions import db, login_manager, csrf, limiter, swagger, cache
from .models import User
from .routes import register_blueprints
from .repositories.sqlite import init_appdata_db
from .services.permissions import seed_roles
from .cli import register_cli


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@login_manager.request_loader
def load_user_from_request(request):
    auth = request.authorization
    if not auth or (auth.type or "").lower() != "basic":
        return None

    username = (auth.username or "").strip()
    password = auth.password or ""
    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password, password):
        return user

    return None


def _is_basic_auth_request():
    auth = request.authorization
    return bool(auth and (auth.type or "").lower() == "basic")


def create_app():
    
    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(Config)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    swagger.template = app.config.get("SWAGGER_TEMPLATE")
    swagger.init_app(app)
    migrate = Migrate()
    migrate.init_app(app, db)
    cache.init_app(app)

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

    @app.before_request
    def protect_csrf():
        if request.method in {"GET", "HEAD", "OPTIONS", "TRACE"}:
            return

        if request.path.startswith("/api/") and _is_basic_auth_request():
            return

        csrf.protect()

    @app.before_request
    def create_csp_nonce():
        g.csp_nonce = secrets.token_urlsafe(16)

    @app.context_processor
    def inject_csp_nonce():
        return {"csp_nonce": getattr(g, "csp_nonce", "")}

    @app.after_request
    def add_security_headers(response):
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "microphone=(), geolocation=(self), camera=(self)"

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
            style_nonce = getattr(g, "csp_nonce", "")
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
                f"style-src 'self' 'nonce-{style_nonce}' https://fonts.googleapis.com https://unpkg.com https://cdnjs.cloudflare.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org; "
                "connect-src 'self' https://psm-api.bvl.bund.de https://cdn.jsdelivr.net https://api.open-meteo.com https://geocoding-api.open-meteo.com; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        return response

    @app.template_global()
    def vite_asset(entry_name):
        manifest_path = Path(app.static_folder) / "vue" / ".vite" / "manifest.json"
        if not manifest_path.exists():
            return ""

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        entry = manifest.get(entry_name)
        if not entry:
            entry = next(
                (
                    value
                    for key, value in manifest.items()
                    if key.replace("\\", "/").endswith(entry_name)
                    or value.get("src", "").replace("\\", "/").endswith(entry_name)
                ),
                None,
            )
        if not entry:
            return ""

        return url_for("static", filename=f"vue/{entry['file']}")

    with app.app_context():
        db.create_all()
        seed_roles()
        init_appdata_db()
        upgrade()
        
        
        

    register_blueprints(app)
    register_cli(app)
    _start_warmup_cache(app)
    return app
