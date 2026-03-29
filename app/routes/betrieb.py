from flask import Blueprint, jsonify, request
from flask_login import login_required

from ..repositories.betrieb_repo import get_betrieb, save_betrieb

bp = Blueprint("betrieb", __name__)


@bp.route("/api/betrieb", methods=["GET"])
@login_required
def api_get_betrieb():
    return jsonify(get_betrieb())


@bp.route("/api/betrieb", methods=["POST"])
@login_required
def api_save_betrieb():
    data = request.get_json(silent=True) or {}
    save_betrieb(data)
    return jsonify({"ok": True})