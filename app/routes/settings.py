from flask import Blueprint, render_template, request, jsonify
from flask_login import login_required, current_user

from ..models.settings import get_setting, set_setting
from ..services.permissions import require_write_access, require_admin
from ..extensions import logger

settings_bp = Blueprint("settings", __name__)

ALLOWED_SETTINGS = {"registration_allowed"}

@settings_bp.route("/api/app/settings", methods=["GET", "POST"])
@login_required
@require_admin
def settings():
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        
        for key, value in data.items():
            if key not in ALLOWED_SETTINGS:
                return jsonify({"ok": False, "error": f"Setting '{key}' is not allowed."}), 400
            set_setting(key, value)
            logger.info(f"Setting '{key}' updated to '{value}' by user: {current_user.username} from IP: {request.remote_addr}")
        return jsonify({"ok": True})

    registration_allowed = get_setting("registration_allowed") == "1"

    return jsonify({"registration_allowed": registration_allowed})