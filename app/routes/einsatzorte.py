from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
import requests

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
    """
    Alle Einsatzorte abrufen
    ---
    tags:
      - Einsatzorte
    responses:
      200:
        description: Liste aller Einsatzorte (Felder)
      401:
        description: Nicht eingeloggt
    """
    return jsonify(list_einsatzorte())


@bp.route("/api/einsatzorte", methods=["POST"])
@login_required
@require_write_access
def api_add_einsatzort():
    """
    Neuen Einsatzort hinzufügen
    ---
    tags:
      - Einsatzorte
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            name:
              type: string
              description: Name des Einsatzortes
            gpsRechtswert:
              type: number
              description: GPS-Breitengrad (Latitude)
            gpsHochwert:
              type: number
              description: GPS-Längengrad (Longitude)
            anwendungsbereich:
              type: string
              description: Anwendungsbereich (Freiland, Gewächshaus, Lager)
            flaecheVolumen:
              type: number
              description: Fläche/Volumen
            einheit:
              type: string
              description: Einheit (m2, ha, ar)
    responses:
      201:
        description: Einsatzort erfolgreich erstellt
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True) or {}
    result = create_einsatzort(data)
    logger.info(
        f"Einsatzort '{data.get('name', 'unknown')}' created by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(result)


@bp.route("/api/einsatzorte/<int:eid>", methods=["GET"])
@login_required
def api_get_einsatzort_by_id(eid):
    """
    Einsatzort nach ID abrufen
    ---
    tags:
      - Einsatzorte
    parameters:
      - in: path
        name: eid
        type: integer
        required: true
        description: Einsatzort-ID
    responses:
      200:
        description: Einsatzort-Details
      401:
        description: Nicht eingeloggt
      404:
        description: Einsatzort nicht gefunden
    """
    item = get_einsatzort_by_id(eid)
    if not item:
        return jsonify({"ok": False, "error": "Einsatzort nicht gefunden."}), 404
    logger.info(
        f"Einsatzort with ID '{eid}' retrieved by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify(item)


@bp.route("/api/einsatzorte/<int:eid>", methods=["PUT"])
@login_required
@require_write_access
def api_update_einsatzort(eid):
    """
    Einsatzort aktualisieren
    ---
    tags:
      - Einsatzorte
    parameters:
      - in: path
        name: eid
        type: integer
        required: true
      - in: body
        name: body
        schema:
          type: object
    responses:
      200:
        description: Erfolgreich aktualisiert
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True) or {}
    update_einsatzort(eid, data)
    logger.info(
        f"Einsatzort with ID '{eid}' updated by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})


@bp.route("/api/einsatzorte/<int:eid>", methods=["DELETE"])
@login_required
@require_write_access
def api_delete_einsatzort(eid):
    """
    Einsatzort löschen
    ---
    tags:
      - Einsatzorte
    parameters:
      - in: path
        name: eid
        type: integer
        required: true
        description: Einsatzort-ID
    responses:
      200:
        description: Erfolgreich gelöscht
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    delete_einsatzort(eid)
    logger.info(
        f"Einsatzort with ID '{eid}' deleted by user: {current_user.username} from IP: {request.remote_addr}")
    return jsonify({"ok": True})


@bp.route("/api/einsatzorte/cord2plz/<int:plz>", methods=["GET"])
@login_required
def cord2plz(plz):
    if not plz:
        return jsonify({"ok": False, "error": "PLZ missing"}), 400
    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "postalcode": plz,
                "country": "de",
                "format": "jsonv2",
                "limit": 1,
            },
            headers={
                "User-Agent": "PSMSimple/1.0",
                "Accept": "application/json",
            },
            timeout=8,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data or not isinstance(data, list):
          return None, None
        lat = float(data[0]["lat"])
        lon = float(data[0]["lon"])

        return jsonify({
            "lat": lat,
            "lon": lon,
        })
    except requests.RequestException as e:
        return jsonify({"ok": False, "error": f"Nominatim-Fehler: {str(e)}"}), 502
