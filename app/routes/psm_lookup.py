from flask import Blueprint, jsonify
from flask_login import login_required

from ..services.psm_api_services  import (
    search_psm_by_term,
    get_psm_info_by_kennr,
)

bp = Blueprint("psm_lookup", __name__)


@bp.route("/search/psm/<term>")
@login_required
def search_psm(term):
    return jsonify(search_psm_by_term(term))


@bp.route("/api/psm/info/<kennr>")
@login_required
def get_psm_info(kennr: str):
    """
    Detaildaten eines Pflanzenschutzmittels aus der BVL-API abrufen
    ---
    tags:
      - Pflanzenschutzmittel
    summary: Liefert externe BVL-Detailinformationen zu einer Zulassungsnummer
    parameters:
      - in: path
        name: kennr
        type: string
        required: true
        description: Zulassungsnummer/Kennnummer des Pflanzenschutzmittels
    responses:
      200:
        description: Detaildaten erfolgreich geladen
        schema:
          type: object
      400:
        description: Ungueltige Kennnummer oder Anfrage
      401:
        description: Nicht authentifiziert
      502:
        description: Fehler bei der externen BVL-API
    """
    try:
        return jsonify(get_psm_info_by_kennr(kennr))
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500
