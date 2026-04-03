from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..services.permissions import require_write_access
from ..extensions import logger
from ..repositories.history_repo import (
    list_history,
    get_history_entry,
    create_history_entry,
    delete_history_entry,
)

bp = Blueprint("history", __name__)


@bp.route("/api/history", methods=["GET"])
@login_required
def api_get_history():
    return jsonify(list_history())


@bp.route("/api/history", methods=["POST"])
@login_required
@require_write_access
def api_create_history():
    data = request.get_json(silent=True) or {}
    result = create_history_entry(data)
    logger.info(f"History entry created by user: {current_user.username} from IP: {request.remote_addr} with data: {data}")
    return jsonify(result)


@bp.route("/api/history/<int:hid>", methods=["GET"])
@login_required
@require_write_access
def api_get_history_entry(hid):
    item = get_history_entry(hid)
    if not item:
        return jsonify({"ok": False, "error": "History-Eintrag nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/history/<int:hid>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_history_entry(hid):
    delete_history_entry(hid)
    logger.info(f"History entry with ID '{hid}' deleted by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})