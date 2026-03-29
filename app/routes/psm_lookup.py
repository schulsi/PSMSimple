from flask import Blueprint, jsonify
from flask_login import login_required

from ..services.psm_api_service import (
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
    try:
        return jsonify(get_psm_info_by_kennr(kennr))
    except ValueError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({"ok": False, "error": str(exc)}), 502
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500