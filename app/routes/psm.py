from flask import Blueprint, jsonify, request
from flask_login import login_required

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
def api_add_psm():
    data = request.get_json(silent=True) or {}
    result = create_psm(data)

    if not result.get("ok"):
        return jsonify(result), 409

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
def api_update_psm(pid):
    data = request.get_json(silent=True) or {}
    update_psm(pid, data)
    return jsonify({"ok": True})


@bp.route("/api/psm/<int:pid>", methods=["DELETE"])
@login_required
def api_delete_psm(pid):
    delete_psm(pid)
    return jsonify({"ok": True})