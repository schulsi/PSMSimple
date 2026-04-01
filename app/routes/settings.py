from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required

from ..models.settings import get_setting, set_setting
from ..services.permissions import require_write_access

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/api/app/settings", methods=["GET", "POST"])
@login_required
@require_write_access
def settings():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        for key, value in data.items():
            set_setting(key, value)
        return jsonify({"ok": True})

    registration_allowed = get_setting("registration_allowed") == "1"

    return jsonify({"registration_allowed": registration_allowed})