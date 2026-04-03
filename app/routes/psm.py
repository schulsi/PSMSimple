from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..services.permissions import require_write_access
from ..extensions import logger
from ..repositories.psm_repo import (
    list_psm,
    create_psm,
    update_psm,
    delete_psm,
    get_psm_by_id,
)

bp = Blueprint("psm", __name__)


@bp.route("/api/psm", methods=["GET"])
@login_required
def api_get_psm():
    return jsonify(list_psm())


@bp.route("/api/psm", methods=["POST"])
@login_required
@require_write_access
def api_add_psm():
    data = request.get_json(silent=True) or {}
    required_fields = ["name", "zulassungsnr", "wirkstoffe", "aufwandEinheit", "bienen"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"ok": False, "error": f"Feld '{field}' ist erforderlich."}), 400
    if len(data["name"]) > 200:
        return jsonify({"ok": False, "error": "Der Name darf maximal 200 Zeichen lang sein."}), 400
    result = create_psm(data)

    if not result.get("ok"):
        return jsonify(result), 409
    logger.info(f"PSM '{data['name']}' created by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(result)


@bp.route("/api/psm/<int:pid>", methods=["GET"])
@login_required
def api_get_psm_by_id(pid):
    item = get_psm_by_id(pid)
    if not item:
        return jsonify({"ok": False, "error": "Mittel nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/psm/<int:pid>", methods=["PUT"])
@login_required
@require_write_access
def api_update_psm(pid):
    data = request.get_json(silent=True) or {}
    update_psm(pid, data)
    logger.info(f"PSM with ID '{pid}' updated by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})


@bp.route("/api/psm/<int:pid>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_psm(pid):
    delete_psm(pid)
    logger.info(f"PSM with ID '{pid}' deleted by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})