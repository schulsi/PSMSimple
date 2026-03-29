from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..extensions import db
from ..models.user import User
from ..services.settings_service import (
    get_user_settings_dict,
    normalize_settings_payload,
    save_user_settings,
)

bp = Blueprint("user", __name__)


@bp.route("/api/user/rename", methods=["POST"])
@login_required
def rename_user():
    data = request.get_json(silent=True) or {}
    new_name = (data.get("username") or "").strip()

    if not new_name:
        return jsonify({"ok": False, "error": "Bitte einen Namen eingeben."}), 400

    if len(new_name) < 2:
        return jsonify({"ok": False, "error": "Mindestens 2 Zeichen erforderlich."}), 400

    existing = User.query.filter_by(username=new_name).first()
    if existing and existing.id != current_user.id:
        return jsonify({"ok": False, "error": "Dieser Benutzername ist bereits vergeben."}), 409

    current_user.username = new_name
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/api/user/settings", methods=["GET"])
@login_required
def get_settings():
    return jsonify(get_user_settings_dict(current_user.id))


@bp.route("/api/user/settings", methods=["POST"])
@login_required
def save_settings():
    data = request.get_json(silent=True) or {}

    settings = save_user_settings(current_user.id, data)
    return jsonify({"ok": True, "settings": settings})