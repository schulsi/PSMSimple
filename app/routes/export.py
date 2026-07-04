from flask import Blueprint, jsonify, request, send_file
from flask_login import current_user, login_required

from ..models.UserSettings import UserSettings
from ..extensions import logger
from ..services.permissions import require_write_access
from ..services.export_service import (
    build_output_for_current_betrieb,
    json_bytes,
    save_buffer_to_exports,
)
from ..services.pdf_service import generate_pdf
from ..utils.paths import build_export_filename

bp = Blueprint("export", __name__)


@bp.route("/api/preview", methods=["POST"])
@login_required
@require_write_access
def preview_json():
    """
    Anwendungsvorschau erzeugen
    ---
    tags:
      - Export
    summary: Baut die vollstaendige Anwendungsdokumentation ohne Datei-Export
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          description: Formularpayload der Anwendung
    responses:
      200:
        description: Vorschau erfolgreich erzeugt
        schema:
          type: object
      400:
        description: Validierungsfehler
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    payload = request.get_json(silent=True) or {}

    try:
        output = build_output_for_current_betrieb(payload)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    logger.info(f"Preview by {current_user.username}")
    return jsonify(output)


@bp.route("/api/export", methods=["POST"])
@login_required
@require_write_access
def export_json():
    """
    Anwendung als JSON exportieren
    ---
    tags:
      - Export
    summary: Erzeugt eine JSON-Datei oder speichert sie serverseitig
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          description: Formularpayload der Anwendung
    responses:
      200:
        description: Export erfolgreich erzeugt
        schema:
          type: object
          properties:
            ok:
              type: boolean
            filename:
              type: string
      400:
        description: Validierungsfehler
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    payload = request.get_json(silent=True) or {}

    try:
        output = build_output_for_current_betrieb(payload)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    buf = json_bytes(output)
    filename = build_export_filename(output, "json")
    settings = UserSettings.for_user(current_user.id)

    if settings.local_save:
        save_buffer_to_exports(
            buf=buf,
            filename=filename,
            datum=output.get("anwendung", {}).get("datum"),
        )

    logger.info(f"JSON export by {current_user.username}")

    if settings.browser_download:
        buf.seek(0)
        return send_file(buf, mimetype="application/json", as_attachment=True, download_name=filename)

    return jsonify({"ok": True, "filename": filename})


@bp.route("/api/pdf", methods=["POST"])
@login_required
@require_write_access
def export_pdf():
    """
    Anwendung als PDF exportieren
    ---
    tags:
      - Export
    summary: Erzeugt eine PDF-Datei oder speichert sie serverseitig
    consumes:
      - application/json
    produces:
      - application/json
      - application/pdf
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          description: Formularpayload der Anwendung
    responses:
      200:
        description: PDF erfolgreich erzeugt
        schema:
          type: object
          properties:
            ok:
              type: boolean
            filename:
              type: string
      400:
        description: Validierungsfehler
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    payload = request.get_json(silent=True) or {}

    try:
        output = build_output_for_current_betrieb(payload)
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    buf = generate_pdf(output)
    filename = build_export_filename(output, "pdf")
    settings = UserSettings.for_user(current_user.id)

    if settings.local_save:
        save_buffer_to_exports(
            buf=buf,
            filename=filename,
            datum=output.get("anwendung", {}).get("datum"),
        )

    logger.info(f"PDF export by {current_user.username}")

    if settings.browser_download:
        buf.seek(0)
        return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name=filename)

    return jsonify({"ok": True, "filename": filename})
