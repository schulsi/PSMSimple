from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..services.permissions import require_write_access
from ..extensions import logger
from ..repositories.kulturen_repo import (
    list_kulturen,
    get_kultur_by_id,
    create_kultur,
    update_kultur,
    delete_kultur,
)

bp = Blueprint("kulturen", __name__)


@bp.route("/api/kulturen", methods=["GET"])
@login_required
def api_get_kulturen():
    """
    Alle Kulturen abrufen
    ---
    tags:
      - Kulturen
    responses:
      200:
        description: Liste aller Kulturen
      401:
        description: Nicht eingeloggt
    """
    return jsonify(list_kulturen())


@bp.route("/api/kulturen", methods=["POST"])
@login_required
@require_write_access
def api_add_kultur():
    """
    Neue Kultur hinzufügen
    ---
    tags:
      - Kulturen
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required:
            - name
            - eppoCode
          properties:
            name:
              type: string
              description: Name der Kultur
            eppoCode:
              type: string
              description: EPPO-Code (z.B. VITVI für Weinbau)
    responses:
      201:
        description: Kultur erfolgreich erstellt
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True) or {}
    result = create_kultur(data)
    logger.info(
        f"Kultur '{data.get('name', 'unknown')}' created by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(result)


@bp.route("/api/kulturen/<int:kid>", methods=["GET"])
@login_required
def api_get_kultur_by_id(kid):
    """
    Kultur nach ID abrufen
    ---
    tags:
      - Kulturen
    parameters:
      - in: path
        name: kid
        type: integer
        required: true
        description: Kultur-ID
    responses:
      200:
        description: Kultur-Details
      401:
        description: Nicht eingeloggt
      404:
        description: Kultur nicht gefunden
    """
    item = get_kultur_by_id(kid)
    if not item:
        return jsonify({"ok": False, "error": "Kultur nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/kulturen/<int:kid>", methods=["PUT"])
@login_required
@require_write_access
def api_update_kultur(kid):
    """
    Kultur aktualisieren
    ---
    tags:
      - Kulturen
    parameters:
      - in: path
        name: kid
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
    responses:
      200:
        description: Erfolgreich aktualisiert
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True) or {}
    update_kultur(kid, data)
    logger.info(
        f"Kultur with ID '{kid}' updated by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})


@bp.route("/api/kulturen/<int:kid>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_kultur(kid):
    """
    Kultur löschen
    ---
    tags:
      - Kulturen
    parameters:
      - in: path
        name: kid
        type: integer
        required: true
        description: Kultur-ID
    responses:
      200:
        description: Erfolgreich gelöscht
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    delete_kultur(kid)
    logger.info(
        f"Kultur with ID '{kid}' deleted by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})
