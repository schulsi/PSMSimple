import os
from flask import Blueprint, render_template, send_from_directory, current_app
from flask_login import login_required, current_user

from ..services.permissions import build_permissions

bp = Blueprint("pages", __name__)


@bp.route("/betrieb")
@bp.route("/psm")
@bp.route("/fields")
@bp.route("/cultures")
@bp.route("/export")
@bp.route("/history")
@bp.route("/settings")
@bp.route("/home")
@bp.route("/prediction")
@bp.route("/inventory")
@bp.route("/meldungen")
@bp.route("/")
@login_required
def index():
    permissions = build_permissions(current_user)
    auth_config = {
        "oidc_enabled": current_app.config["OIDC_ENABLED"],
        "oidc_provider_name": current_app.config["OIDC_PROVIDER_NAME"],
        "oidc_linked": current_user.uses_oidc(),
    }
    return render_template(
        "index.html",
        permissions=permissions,
        auth_config=auth_config,
    )


@bp.route("/media/<path:filename>")
def media(filename):
    media_dir = os.path.join(current_app.root_path, "static", "media")
    media_dir = os.path.abspath(media_dir)
    return send_from_directory(media_dir, filename)


@bp.route("/favicon.png")
def favicon():
    return send_from_directory(
        os.path.join(current_app.root_path, "static"),
        "favicon.png",
        mimetype="image/png",
    )

@bp.route("/health")
def health():
    return "OK", 200
