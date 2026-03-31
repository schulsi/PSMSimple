from flask import Blueprint, jsonify, request
from flask_login import login_required

from ..repositories.application_settings_repo import (
    get_application_settings,
    update_application_settings,
)

bp = Blueprint("app_settings", __name__)

@bp.route("/api/app/settings", methods=["GET"])
@login_required
def api_get_app_settings():
    return jsonify(get_application_settings())


@bp.route("/api/app/settings", methods=["POST"])
@login_required
def api_save_app_settings():
    data = request.get_json(force=True) or {}

    allow_registration = bool(data.get("allow_registration", True))

    settings = update_application_settings(allow_registration)
    return jsonify({"ok": True, **settings})