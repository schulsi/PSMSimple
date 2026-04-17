from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..services.permissions import require_write_access
from ..extensions import logger
from ..repositories.bbch_repo import (
    create_bbch,
    delete_bbch,
    get_bbch_by_code,
    get_bbch_by_id,
    get_bbch_by_kultur,
    list_bbch,
    list_bbch_by_ids,
    update_bbch,
)

bp = Blueprint("bbch", __name__)


@bp.route("/api/bbch", methods=["GET"])
@login_required
def api_list_bbch():
    """
    Alle BBCH-Einträge abrufen
    ---
    tags:
      - BBCH
    responses:
      200:
        description: Liste aller BBCH-Einträge
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              kultur_id:
                type: integer
                example: 5
              code:
                type: string
                example: "30"
              bezeichnung:
                type: string
                example: "Schossen beginnt"
              beschreibung:
                type: string
                example: "Beginn der Sprossstreckung"
              sortierung:
                type: integer
                example: 30
      401:
        description: Nicht eingeloggt
    """
    return jsonify(list_bbch())


@bp.route("/api/bbch/<int:bbch_id>", methods=["GET"])
@login_required
def api_get_bbch_by_id(bbch_id):
    """
    BBCH-Eintrag anhand der ID abrufen
    ---
    tags:
      - BBCH
    parameters:
      - in: path
        name: bbch_id
        type: integer
        required: true
        description: ID des BBCH-Eintrags
    responses:
      200:
        description: BBCH-Eintrag gefunden
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            kultur_id:
              type: integer
              example: 5
            code:
              type: string
              example: "30"
            bezeichnung:
              type: string
              example: "Schossen beginnt"
            beschreibung:
              type: string
              example: "Beginn der Sprossstreckung"
            sortierung:
              type: integer
              example: 30
      401:
        description: Nicht eingeloggt
      404:
        description: BBCH-Eintrag nicht gefunden
    """
    item = get_bbch_by_id(bbch_id)
    if not item:
        return jsonify({"ok": False, "error": "BBCH nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/bbch/code/<string:bbch_code>", methods=["GET"])
@login_required
def api_get_bbch_by_code(bbch_code):
    """
    BBCH-Eintrag anhand des BBCH-Codes abrufen
    ---
    tags:
      - BBCH
    parameters:
      - in: path
        name: bbch_code
        type: string
        required: true
        description: BBCH-Code, zum Beispiel 30 oder 65
    responses:
      200:
        description: Passender BBCH-Eintrag
        schema:
          type: object
          properties:
            id:
              type: integer
              example: 1
            kultur_id:
              type: integer
              example: 5
            code:
              type: string
              example: "30"
            bezeichnung:
              type: string
              example: "Schossen beginnt"
            beschreibung:
              type: string
              example: "Beginn der Sprossstreckung"
            sortierung:
              type: integer
              example: 30
      401:
        description: Nicht eingeloggt
      404:
        description: BBCH-Code nicht gefunden
    """
    item = get_bbch_by_code(bbch_code)
    if not item:
        return jsonify({"ok": False, "error": "BBCH-Code nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/bbch/kultur/<int:kultur_id>", methods=["GET"])
@login_required
def api_get_bbch_by_kultur(kultur_id):
    """
    Alle BBCH-Einträge zu einer Kultur abrufen
    ---
    tags:
      - BBCH
    parameters:
      - in: path
        name: kultur_id
        type: integer
        required: true
        description: ID der Kultur
    responses:
      200:
        description: Liste der BBCH-Einträge zur Kultur
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              kultur_id:
                type: integer
                example: 5
              code:
                type: string
                example: "30"
              bezeichnung:
                type: string
                example: "Schossen beginnt"
              beschreibung:
                type: string
                example: "Beginn der Sprossstreckung"
              sortierung:
                type: integer
                example: 30
      401:
        description: Nicht eingeloggt
    """
    return jsonify(get_bbch_by_kultur(kultur_id))


@bp.route("/api/bbch/ids", methods=["POST"])
@login_required
def api_list_bbch_by_ids():
    """
    Mehrere BBCH-Einträge anhand ihrer IDs abrufen
    ---
    tags:
      - BBCH
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - ids
          properties:
            ids:
              type: array
              description: Liste von BBCH-IDs
              items:
                type: integer
              example: [1, 2, 3]
    responses:
      200:
        description: Liste der gefundenen BBCH-Einträge
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              kultur_id:
                type: integer
                example: 5
              code:
                type: string
                example: "30"
              bezeichnung:
                type: string
                example: "Schossen beginnt"
              beschreibung:
                type: string
                example: "Beginn der Sprossstreckung"
              sortierung:
                type: integer
                example: 30
      400:
        description: Ungültige oder fehlende IDs
      401:
        description: Nicht eingeloggt
    """
    data = request.get_json(silent=True) or {}
    bbch_ids = data.get("ids", [])

    if not isinstance(bbch_ids, list):
        return jsonify({"ok": False, "error": "'ids' muss eine Liste sein."}), 400

    return jsonify(list_bbch_by_ids(bbch_ids))


@bp.route("/api/bbch", methods=["POST"])
@login_required
@require_write_access
def api_add_bbch():
    """
    Neuen BBCH-Eintrag anlegen
    ---
    tags:
      - BBCH
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - kultur_id
            - code
            - bezeichnung
          properties:
            kultur_id:
              type: integer
              description: ID der zugehörigen Kultur
              example: 5
            code:
              type: string
              description: BBCH-Code, zum Beispiel 30 oder 65
              example: "30"
            bezeichnung:
              type: string
              description: Kurzbezeichnung des BBCH-Stadiums
              example: "Schossen beginnt"
            beschreibung:
              type: string
              description: Optionale ausführliche Beschreibung
              example: "Beginn der Sprossstreckung"
            sortierung:
              type: integer
              description: Optionale Sortierreihenfolge
              example: 30
    responses:
      200:
        description: BBCH-Eintrag erfolgreich erstellt
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True) or {}
    result = create_bbch(data)
    logger.info(
        f"BBCH '{data.get('code', 'unknown')}' created by user: {current_user.username} from IP: {request.remote_addr}"
    )
    return jsonify(result)


@bp.route("/api/bbch/<int:bbch_id>", methods=["PUT"])
@login_required
@require_write_access
def api_update_bbch(bbch_id):
    """
    BBCH-Eintrag aktualisieren
    ---
    tags:
      - BBCH
    parameters:
      - in: path
        name: bbch_id
        type: integer
        required: true
        description: ID des BBCH-Eintrags
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            kultur_id:
              type: integer
              example: 5
            code:
              type: string
              example: "31"
            bezeichnung:
              type: string
              example: "1 Knoten sichtbar"
            beschreibung:
              type: string
              example: "Erster Knoten mindestens 1 cm über Bestockungsknoten"
            sortierung:
              type: integer
              example: 31
    responses:
      200:
        description: Erfolgreich aktualisiert
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
      404:
        description: BBCH-Eintrag nicht gefunden
    """
    data = request.get_json(silent=True) or {}
    result = update_bbch(bbch_id, data)

    if result is None:
        return jsonify({"ok": False, "error": "BBCH nicht gefunden."}), 404

    logger.info(
        f"BBCH with ID '{bbch_id}' updated by user: {current_user.username} from IP: {request.remote_addr}"
    )
    return jsonify({"ok": True})


@bp.route("/api/bbch/<int:bbch_id>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_bbch(bbch_id):
    """
    BBCH-Eintrag löschen
    ---
    tags:
      - BBCH
    parameters:
      - in: path
        name: bbch_id
        type: integer
        required: true
        description: ID des BBCH-Eintrags
    responses:
      200:
        description: Erfolgreich gelöscht
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
      404:
        description: BBCH-Eintrag nicht gefunden
    """
    result = delete_bbch(bbch_id)

    if result is None or result is False:
        return jsonify({"ok": False, "error": "BBCH nicht gefunden."}), 404

    logger.info(
        f"BBCH with ID '{bbch_id}' deleted by user: {current_user.username} from IP: {request.remote_addr}"
    )
    return jsonify({"ok": True})