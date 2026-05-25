from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
import re

from ..extensions import db, logger
from ..models.user import User
from ..services.permissions import build_permissions, require_admin
from ..repositories.role_repo import get_role_id
from ..services.settings_service import (
    get_user_settings_dict,
    save_user_settings,
)
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{2,50}$")
bp = Blueprint("user", __name__)


@bp.route("/api/me", methods=["GET"])
@login_required
def api_me():
    """
    Aktuelle Benutzerinformationen
    ---
    tags:
      - Benutzerverwaltung
    responses:
      200:
        description: Benutzerdaten und Berechtigungen
      401:
        description: Nicht authentifiziert
    """
    return jsonify({
        "ok": True,
        "user": current_user.to_public_dict(),
        "permissions": build_permissions(current_user),
    })


@bp.route("/api/users", methods=["GET"])
@require_admin
def list_users():
    """
    Alle Benutzer auflisten
    ---
    tags:
      - Benutzerverwaltung
    responses:
      200:
        description: Liste aller Benutzer
      401:
        description: Nicht authentifiziert
      403:
        description: Admin-Berechtigung erforderlich
    """
    users = User.query.order_by(User.username.asc()).all()
    return jsonify([u.to_public_dict() for u in users])


@bp.route("/api/users/<int:user_id>/role", methods=["PUT"])
@require_admin
def update_user_role(user_id):
    """
    Benutzerrolle ändern
    ---
    tags:
      - Benutzerverwaltung
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
          properties:
            role:
              type: string
              enum: [admin, user, read-only]
              description: Neue Rolle des Benutzers
    responses:
      200:
        description: Rolle erfolgreich geändert
      400:
        description: Ungültige Rolle
      403:
        description: Admin-Berechtigung erforderlich
    """
    data = request.get_json(silent=True) or {}
    new_role = (data.get("role") or "").strip()

    allowed_roles = {"admin", "user", "read-only"}
    if new_role not in allowed_roles:
        return jsonify({"ok": False, "error": "Ungültige Rolle."}), 400

    user = User.query.get_or_404(user_id)

    if user.id == current_user.id and new_role != "admin":
        return jsonify({"ok": False, "error": "Eigene Admin-Rolle kann nicht entfernt werden."}), 400

    user.role_id = get_role_id(new_role)
    db.session.commit()
    logger.info(
        f"User '{user.username}' role updated to '{new_role}' by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True, "user": user.to_public_dict()})


@bp.route("/api/user/rename", methods=["POST"])
@login_required
def rename_user():
    """
    Benutzernamen ändern
    ---
    tags:
      - Benutzerverwaltung
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            username:
              type: string
              description: Neuer Benutzername
    responses:
      200:
        description: Benutzername erfolgreich geändert
      400:
        description: Validierungsfehler
      401:
        description: Nicht authentifiziert
      409:
        description: Benutzername existiert bereits
    """
    data = request.get_json(silent=True) or {}
    new_name = (data.get("username") or "").strip()

    if not new_name:
        return jsonify({"ok": False, "error": "Bitte einen Namen eingeben."}), 400

    if len(new_name) < 2:
        return jsonify({"ok": False, "error": "Mindestens 2 Zeichen erforderlich."}), 400

    if re.match(USERNAME_RE, new_name) is None:
        return jsonify({"ok": False, "error": "Ungültige Zeichen im Namen."}), 400

    existing = User.query.filter_by(username=new_name).first()
    if existing and existing.id != current_user.id:
        return jsonify({"ok": False, "error": "Dieser Benutzername ist bereits vergeben."}), 409

    current_user.username = new_name
    db.session.commit()
    logger.info(
        f"User renamed to '{new_name}' by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})


@bp.route("/api/user/settings", methods=["GET"])
@login_required
def get_settings():
    """
    Benutzereinstellungen abrufen
    ---
    tags:
      - Benutzerverwaltung
    responses:
      200:
        description: Benutzereinstellungen
        schema:
          type: object
      401:
        description: Nicht authentifiziert
    """
    return jsonify(get_user_settings_dict(current_user.id))


@bp.route("/api/user/settings", methods=["POST"])
@login_required
def save_settings():
    """
    Benutzereinstellungen speichern
    ---
    tags:
      - Benutzerverwaltung
    parameters:
      - in: body
        name: body
        schema:
          type: object
    responses:
      200:
        description: Einstellungen erfolgreich gespeichert
      401:
        description: Nicht authentifiziert
    """
    data = request.get_json(silent=True) or {}

    settings = save_user_settings(current_user.id, data)
    logger.info(
        f"User settings updated by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True, "settings": settings})


@bp.route("/api/users/<int:user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id):
    """
    Benutzer löschen
    ---
    tags:
      - Benutzerverwaltung
    parameters:
      - in: path
        name: user_id
        type: integer
        required: true
        description: ID des Benutzers
    responses:
      200:
        description: Benutzer erfolgreich gelöscht
      400:
        description: Aktueller Benutzer kann nicht gelöscht werden
      401:
        description: Nicht authentifiziert
      403:
        description: Admin-Berechtigung erforderlich
      404:
        description: Benutzer nicht gefunden
    """
    user = User.query.get_or_404(user_id)

    if user.id == current_user.id:
        return jsonify({"ok": False, "error": "Der aktuell angemeldete Benutzer kann nicht gelöscht werden."}), 400

    db.session.delete(user)
    db.session.commit()

    logger.info(
        f"User '{user.username}' deleted by user: {current_user.username} from IP: {request.remote_addr}")

    return jsonify({"ok": True, "deleted_user_id": user_id})
