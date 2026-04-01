from flask import Blueprint, jsonify, request
from flask_login import login_required

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
def api_add_einsatzort():
    data = request.get_json(silent=True) or {}
    result = create_einsatzort(data)
    return jsonify(result)


@bp.route("/api/einsatzorte/<int:eid>", methods=["GET"])
@login_required
def api_get_einsatzort_by_id(eid):
    item = get_einsatzort_by_id(eid)
    if not item:
        return jsonify({"ok": False, "error": "Einsatzort nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/einsatzorte/<int:eid>", methods=["PUT"])
@login_required
def api_update_einsatzort(eid):
    data = request.get_json(silent=True) or {}
    update_einsatzort(eid, data)
    return jsonify({"ok": True})


@bp.route("/api/einsatzorte/<int:eid>", methods=["DELETE"])
@login_required
def api_delete_einsatzort(eid):
    delete_einsatzort(eid)
    return jsonify({"ok": True})