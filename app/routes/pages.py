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
@bp.route("/")
@login_required
def index():
    permissions = build_permissions(current_user)
    return render_template("index.html", permissions=permissions)


@bp.route("/media/<path:filename>")
def media(filename):
    media_dir = os.path.join(current_app.root_path, "static", "media")
    media_dir = os.path.abspath(media_dir)
    return send_from_directory(media_dir, filename)


@bp.route("/favicon.ico")
def favicon():
    return send_from_directory(
        os.path.join(current_app.root_path, "static"),
        "favicon.ico",
        mimetype="image/vnd.microsoft.icon",
    )
