from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required

from ..models.settings import get_setting, set_setting

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/api/app/settings", methods=["GET", "POST"])
@login_required
def settings():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        for key, value in data.items():
            set_setting(key, value)
        return jsonify({"ok": True})

    allow_registration = get_setting("registration_allowed") == "1"

    return jsonify({"allow_registration": allow_registration})