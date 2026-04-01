from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..extensions import db
from ..models.user import User
from ..services.permissions import build_permissions, require_admin, require_write_access
from ..repositories.role_repo import get_role_id, get_role_name
from ..services.settings_service import (
    get_user_settings_dict,
    normalize_settings_payload,
    save_user_settings,
)

bp = Blueprint("user", __name__)

@bp.route("/api/me", methods=["GET"])
@login_required
def api_me():
    return jsonify({
        "ok": True,
        "user": current_user.to_public_dict(),
        "permissions": build_permissions(current_user),
    })

@bp.route("/api/users", methods=["GET"])
@require_admin
def list_users():
    users = User.query.order_by(User.username.asc()).all()
    return jsonify([u.to_public_dict() for u in users])

@bp.route("/api/users/<int:user_id>/role", methods=["PUT"])
@require_admin
def update_user_role(user_id):
    data = request.get_json(silent=True) or {}
    new_role = (data.get("role") or "").strip()
    print(f"Requested role change for user {user_id} to '{new_role}'")

    allowed_roles = {"admin", "user", "read-only"}
    if new_role not in allowed_roles:
        return jsonify({"ok": False, "error": "Ungültige Rolle."}), 400

    user = User.query.get_or_404(user_id)

    if user.id == current_user.id and new_role != "admin":
        return jsonify({"ok": False, "error": "Eigene Admin-Rolle kann nicht entfernt werden."}), 400

    user.role_id = get_role_id(new_role)
    db.session.commit()
    return jsonify({"ok": True, "user": user.to_public_dict()})


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

@bp.route("/api/users/<int:user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id):
    user = User.query.get_or_404(user_id)

    if user.id == current_user.id:
        return jsonify({"ok": False, "error": "Der aktuell angemeldete Benutzer kann nicht gelöscht werden."}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({"ok": True, "deleted_user_id": user_id})