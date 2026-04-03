from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..services.permissions import require_write_access
from ..extensions import logger
from ..repositories.einsatzorte_repo import (
    list_einsatzorte,
    get_einsatzort_by_id,
    create_einsatzort,
    update_einsatzort,
    delete_einsatzort,
)

bp = Blueprint("einsatzorte", __name__)


@bp.route("/api/einsatzorte", methods=["GET"])
@login_required
def api_get_einsatzorte():
    return jsonify(list_einsatzorte())


@bp.route("/api/einsatzorte", methods=["POST"])
@login_required
@require_write_access
def api_add_einsatzort():
    data = request.get_json(silent=True) or {}
    result = create_einsatzort(data)
    logger.info(f"Einsatzort '{data.get('name', 'unknown')}' created by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(result)


@bp.route("/api/einsatzorte/<int:eid>", methods=["GET"])
@login_required
def api_get_einsatzort_by_id(eid):
    item = get_einsatzort_by_id(eid)
    if not item:
        return jsonify({"ok": False, "error": "Einsatzort nicht gefunden."}), 404
    logger.info(f"Einsatzort with ID '{eid}' retrieved by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(item)


@bp.route("/api/einsatzorte/<int:eid>", methods=["PUT"])
@login_required
@require_write_access
def api_update_einsatzort(eid):
    data = request.get_json(silent=True) or {}
    update_einsatzort(eid, data)
    logger.info(f"Einsatzort with ID '{eid}' updated by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})


@bp.route("/api/einsatzorte/<int:eid>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_einsatzort(eid):
    delete_einsatzort(eid)
    logger.info(f"Einsatzort with ID '{eid}' deleted by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})