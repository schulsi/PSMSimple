from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..services.permissions import require_write_access
from ..extensions import logger
from ..repositories.orte_repo import (
    list_orte,
    create_ort,
    delete_ort,
    get_ort_by_id,
    update_ort
)

bp = Blueprint("orte", __name__)


@bp.route("/api/orte", methods=["GET"])
@login_required
def api_get_orte():
    """
    Alle Orte abrufen
    ---
    tags:
      - Orte
    responses:
      200:
        description: Liste aller Orte (Felder)
      401:
        description: Nicht eingeloggt
    """
    return jsonify(list_orte())


@bp.route("/api/orte", methods=["POST"])
@login_required
@require_write_access
def api_add_ort():
    """
    Neuen Ort hinzufügen
    ---
    tags:
      - Orte
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
              description: Name des Ortes
            plz:
              type: number
              description: PLZ des Orts
    responses:
      201:
        description: Ort erfolgreich erstellt
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True) or {}
    result = create_ort(data)
    logger.info(
        f"Ort '{data.get('name', 'unknown')}' created by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(result)


@bp.route("/api/orte/<int:eid>", methods=["GET"])
@login_required
def api_get_ort_by_id(eid):
    """
    Ort nach ID abrufen
    ---
    tags:
      - Orte
    parameters:
      - in: path
        name: eid
        type: integer
        required: true
        description: Ort-ID
    responses:
      200:
        description: Ort-Details
      401:
        description: Nicht eingeloggt
      404:
        description: Ort nicht gefunden
    """
    item = get_ort_by_id(eid)
    if not item:
        return jsonify({"ok": False, "error": "Ort nicht gefunden."}), 404
    logger.info(
        f"Ort with ID '{eid}' retrieved by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(item)


@bp.route("/api/orte/<int:eid>", methods=["PUT"])
@login_required
@require_write_access
def api_update_ort(eid):
    """
    Ort aktualisieren
    ---
    tags:
      - Orte
    parameters:
      - in: path
        name: eid
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
    update_ort(eid, data)
    logger.info(
        f"Ort with ID '{eid}' updated by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})


@bp.route("/api/orte/<int:eid>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_ort(eid):
    """
    Ort löschen
    ---
    tags:
      - Orte
    parameters:
      - in: path
        name: eid
        type: integer
        required: true
        description: Ort-ID
    responses:
      200:
        description: Erfolgreich gelöscht
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    delete_ort(eid)
    logger.info(
        f"Ort with ID '{eid}' deleted by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})
