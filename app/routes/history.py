from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..services.permissions import require_write_access
from ..extensions import logger
from ..services.inventory_service import rebuild_inventory_for_application
from ..repositories.history_repo import (
    list_history,
    get_history_entry,
    create_history_entry,
    delete_history_entry,
    get_psm_usage_history,
    get_fields_usage_history,
    get_field_applications,
)

bp = Blueprint("history", __name__)


@bp.route("/api/history", methods=["GET"])
@login_required
def api_get_history():
    """
    Applikationsgeschichte abrufen
    ---
    tags:
      - Verlauf
    parameters:
      - in: query
        name: date_from
        type: string
        format: date
        description: Von-Datum (YYYY-MM-DD)
      - in: query
        name: date_to
        type: string
        format: date
        description: Bis-Datum (YYYY-MM-DD)
    responses:
      200:
        description: Liste aller Applikationen im Zeitraum
      401:
        description: Nicht eingeloggt
    """
    date_from = (request.args.get("date_from") or "").strip()
    date_to = request.args.get("date_to")
    return jsonify(list_history(date_from=date_from, date_to=date_to))


@bp.route("/api/history/psm-usage", methods=["GET"])
@login_required
def api_get_psm_usage():
    """
    PSM-Verwendungshistorie abrufen
    ---
    tags:
      - Verlauf
    parameters:
      - in: query
        name: date_from
        type: string
        format: date
        description: Von-Datum (YYYY-MM-DD)
      - in: query
        name: date_to
        type: string
        format: date
        description: Bis-Datum (YYYY-MM-DD)
    responses:
      200:
        description: Statistik der PSM-Verwendungen
      401:
        description: Nicht eingeloggt
    """
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    return jsonify(get_psm_usage_history(date_from=date_from, date_to=date_to))


@bp.route("/api/history/fields-usage", methods=["GET"])
@login_required
def api_get_fields_usage():
    """
    Felderverwendungshistorie abrufen
    ---
    tags:
      - Verlauf
    parameters:
      - in: query
        name: date_from
        type: string
        format: date
        description: Von-Datum (YYYY-MM-DD)
      - in: query
        name: date_to
        type: string
        format: date
        description: Bis-Datum (YYYY-MM-DD)
    responses:
      200:
        description: Statistik der Feldverwendungen
      401:
        description: Nicht eingeloggt
    """
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    return jsonify(get_fields_usage_history(date_from=date_from, date_to=date_to))


@bp.route("/api/history/field-applications", methods=["GET"])
@login_required
def api_get_field_applications():
    """
    Feldanwendungen nach Feldname abrufen
    ---
    tags:
      - Verlauf
    parameters:
      - in: query
        name: field_name
        type: string
        required: true
        description: Name des Feldes
      - in: query
        name: date_from
        type: string
        format: date
        description: Von-Datum (YYYY-MM-DD)
      - in: query
        name: date_to
        type: string
        format: date
        description: Bis-Datum (YYYY-MM-DD)
    responses:
      200:
        description: Anwendungen auf dem Feld
      400:
        description: field_name erforderlich
      401:
        description: Nicht eingeloggt
    """
    field_name = request.args.get("field_name")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    if not field_name:
        return jsonify({"error": "field_name required"}), 400
    return jsonify(get_field_applications(field_name, date_from=date_from, date_to=date_to))


@bp.route("/api/history", methods=["POST"])
@login_required
@require_write_access
def api_create_history():
    """
    Neue Applikation dokumentieren
    ---
    tags:
      - Verlauf
    parameters:
      - in: body
        name: body
        schema:
          type: object
    responses:
      201:
        description: Applikation erfolgreich gespeichert
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True) or {}
    result = create_history_entry(data)
    logger.info(
        f"History entry created by user: {current_user.username} from IP: {request.remote_addr} with data: {data}")
    out = rebuild_inventory_for_application(result["id"])
    logger.info(
        f"Inventory Movement entry created by user: {current_user.username} from IP: {request.remote_addr} with data: {out}")
    return jsonify(result)


@bp.route("/api/history/<int:hid>", methods=["GET"])
@login_required
@require_write_access
def api_get_history_entry(hid):
    """
    Applikationsdetails abrufen
    ---
    tags:
      - Verlauf
    parameters:
      - in: path
        name: hid
        type: integer
        required: true
        description: History-Entry-ID
    responses:
      200:
        description: Applikationsdetails
      401:
        description: Nicht authentifiziert
      404:
        description: Eintrag nicht gefunden
    """
    item = get_history_entry(hid)
    if not item:
        return jsonify({"ok": False, "error": "History-Eintrag nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/history/<int:hid>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_history_entry(hid):
    """
    Applikation löschen
    ---
    tags:
      - Verlauf
    parameters:
      - in: path
        name: hid
        type: integer
        required: true
        description: History-Entry-ID
    responses:
      200:
        description: Erfolgreich gelöscht
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    delete_history_entry(hid)
    logger.info(
        f"History entry with ID '{hid}' deleted by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})
