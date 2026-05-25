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
