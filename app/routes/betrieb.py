from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user

from ..repositories.betrieb_repo import get_betrieb, save_betrieb
from ..services.permissions import require_write_access
from ..extensions import logger

bp = Blueprint("betrieb", __name__)


@bp.route("/api/betrieb", methods=["GET"])
@login_required
def api_get_betrieb():
    """
    Betriebsdaten abrufen
    ---
    tags:
      - Betrieb
    responses:
      200:
        description: Betriebsdaten
        schema:
          type: object
      401:
        description: Nicht eingeloggt
    """
    return jsonify(get_betrieb())


@bp.route("/api/betrieb", methods=["POST"])
@login_required
@require_write_access
def api_save_betrieb():
    """
    Betriebsdaten speichern
    ---
    tags:
      - Betrieb
    parameters:
      - in: body
        name: body
        schema:
          type: object
    responses:
      200:
        description: Erfolgreich gespeichert
        schema:
          type: object
          properties:
            ok:
              type: boolean
    """
    data = request.get_json(silent=True) or {}
    save_betrieb(data)
    logger.info(f"Betrieb data updated by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})