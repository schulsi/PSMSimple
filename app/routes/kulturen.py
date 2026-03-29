from flask import Blueprint, jsonify, request
from flask_login import login_required

from ..repositories.kulturen_repo import (
    list_kulturen,
    get_kultur_by_id,
    create_kultur,
    update_kultur,
    delete_kultur,
)

bp = Blueprint("kulturen", __name__)


@bp.route("/api/kulturen", methods=["GET"])
@login_required
def api_get_kulturen():
    return jsonify(list_kulturen())


@bp.route("/api/kulturen", methods=["POST"])
@login_required
def api_add_kultur():
    data = request.get_json(silent=True) or {}
    result = create_kultur(data)
    return jsonify(result)


@bp.route("/api/kulturen/<int:kid>", methods=["GET"])
@login_required
def api_get_kultur_by_id(kid):
    item = get_kultur_by_id(kid)
    if not item:
        return jsonify({"ok": False, "error": "Kultur nicht gefunden."}), 404
    return jsonify(item)


@bp.route("/api/kulturen/<int:kid>", methods=["PUT"])
@login_required
def api_update_kultur(kid):
    data = request.get_json(silent=True) or {}
    update_kultur(kid, data)
    return jsonify({"ok": True})


@bp.route("/api/kulturen/<int:kid>", methods=["DELETE"])
@login_required
def api_delete_kultur(kid):
    delete_kultur(kid)
    return jsonify({"ok": True})