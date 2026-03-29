import os
from flask import Blueprint, render_template, send_from_directory, current_app
from flask_login import login_required

bp = Blueprint("pages", __name__)

@bp.route("/betrieb")
@bp.route("/psm")
@bp.route("/fields")
@bp.route("/cultures")
@bp.route("/export")
@bp.route("/history")
@bp.route("/settings")
@bp.route("/")
@login_required
def index():
    return render_template("index.html")


@bp.route("/media/<path:filename>")
def media(filename):
    media_dir = os.path.join(current_app.root_path, "..", "media")
    media_dir = os.path.abspath(media_dir)
    return send_from_directory(media_dir, filename)