from flask import Blueprint, jsonify, request, send_file

from ..services.permissions import login_required, require_write_access
from ..services.meldungen_service import (
    add_meldung_foto_service,
    create_meldung_service,
    delete_meldung_foto_service,
    delete_meldung_service,
    get_meldung_foto_file,
    get_meldung_metadata,
    get_meldung_service,
    list_meldung_fotos_service,
    list_meldungen_service,
    update_meldung_service,
)


bp = Blueprint("meldungen", __name__)


def _error(message: str, status: int):
    return jsonify({"ok": False, "error": message}), status


@bp.get("/api/meldungen/meta")
@login_required
def api_meldung_meta():
    """
    Meldungs-Metadaten abrufen
    ---
    tags:
      - Meldungen
    summary: Liefert erlaubte Werte für Typ, Status und Priorität
    security:
      - sessionAuth: []
    responses:
      200:
        description: Metadaten erfolgreich geladen
        schema:
          type: object
          properties:
            typen:
              type: array
              items:
                type: string
              example: ["draht_abgerissen", "rebe_kaputt", "sonstiges"]
            status:
              type: array
              items:
                type: string
              example: ["offen", "in_bearbeitung", "erledigt", "verworfen"]
            prioritaet:
              type: array
              items:
                type: string
              example: ["niedrig", "normal", "hoch", "kritisch"]
    """
    return jsonify(get_meldung_metadata())


@bp.get("/api/meldungen")
@login_required
def api_list_meldungen():
    """
    Meldungen abrufen
    ---
    tags:
      - Meldungen
    summary: Liefert Meldungen mit optionalen Filtern
    security:
      - sessionAuth: []
    parameters:
      - in: query
        name: flaeche_id
        type: integer
        required: false
        description: Filtert nach Feld/Einsatzort-ID
      - in: query
        name: status
        type: string
        required: false
        enum: [offen, in_bearbeitung, erledigt, verworfen]
      - in: query
        name: typ
        type: string
        required: false
        enum: [draht_abgerissen, rebe_kaputt, pfahl_kaputt, wildschaden, hagelschaden, krankheit, schaedling, freifeld, sonstiges]
      - in: query
        name: limit
        type: integer
        required: false
        default: 200
    responses:
      200:
        description: Meldungen erfolgreich geladen
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 1
              flaeche_id:
                type: integer
                example: 12
              datum:
                type: string
                example: "2026-05-25"
              typ:
                type: string
                example: draht_abgerissen
              titel:
                type: string
                example: Draht am Reihenanfang abgerissen
              status:
                type: string
                example: offen
              prioritaet:
                type: string
                example: normal
    """
    try:
        data = list_meldungen_service(
            flaeche_id=request.args.get("flaeche_id", type=int),
            status=request.args.get("status"),
            typ=request.args.get("typ"),
            limit=request.args.get("limit", default=200, type=int),
        )
        return jsonify(data)
    except ValueError as err:
        return _error(str(err), 400)


@bp.post("/api/meldungen")
@login_required
@require_write_access
def api_create_meldung():
    """
    Meldung anlegen
    ---
    tags:
      - Meldungen
    summary: Erstellt eine neue Meldung
    security:
      - sessionAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [datum, typ, titel]
          properties:
            flaeche_id:
              type: integer
              example: 12
            datum:
              type: string
              example: "2026-05-25"
            typ:
              type: string
              enum: [draht_abgerissen, rebe_kaputt, pfahl_kaputt, wildschaden, hagelschaden, krankheit, schaedling, freifeld, sonstiges]
            titel:
              type: string
              example: Pfahl kaputt am Südhang
            beschreibung:
              type: string
              example: Pfahl ist auf Höhe der zweiten Drahtreihe gebrochen.
            status:
              type: string
              default: offen
              enum: [offen, in_bearbeitung, erledigt, verworfen]
            prioritaet:
              type: string
              default: normal
              enum: [niedrig, normal, hoch, kritisch]
            latitude:
              type: number
              format: float
              example: 48.123456
            longitude:
              type: number
              format: float
              example: 7.654321
    responses:
      201:
        description: Meldung erfolgreich angelegt
      400:
        description: Ungültige Eingaben
    """
    try:
        item = create_meldung_service(request.get_json(silent=True) or {})
        return jsonify(item), 201
    except ValueError as err:
        return _error(str(err), 400)


@bp.get("/api/meldungen/<int:meldung_id>")
@login_required
def api_get_meldung(meldung_id):
    """
    Meldung abrufen
    ---
    tags:
      - Meldungen
    summary: Liefert eine einzelne Meldung inklusive Foto-Metadaten
    security:
      - sessionAuth: []
    parameters:
      - in: path
        name: meldung_id
        type: integer
        required: true
    responses:
      200:
        description: Meldung erfolgreich geladen
      404:
        description: Meldung nicht gefunden
    """
    try:
        return jsonify(get_meldung_service(meldung_id))
    except LookupError as err:
        return _error(str(err), 404)


@bp.put("/api/meldungen/<int:meldung_id>")
@login_required
@require_write_access
def api_update_meldung(meldung_id):
    """
    Meldung aktualisieren
    ---
    tags:
      - Meldungen
    summary: Aktualisiert eine Meldung teilweise oder vollständig
    security:
      - sessionAuth: []
    consumes:
      - application/json
    parameters:
      - in: path
        name: meldung_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            flaeche_id:
              type: integer
            datum:
              type: string
            typ:
              type: string
            titel:
              type: string
            beschreibung:
              type: string
            status:
              type: string
            prioritaet:
              type: string
            latitude:
              type: number
            longitude:
              type: number
    responses:
      200:
        description: Meldung erfolgreich aktualisiert
      400:
        description: Ungültige Eingaben
      404:
        description: Meldung nicht gefunden
    """
    try:
        return jsonify(update_meldung_service(meldung_id, request.get_json(silent=True) or {}))
    except ValueError as err:
        return _error(str(err), 400)
    except LookupError as err:
        return _error(str(err), 404)


@bp.delete("/api/meldungen/<int:meldung_id>")
@login_required
@require_write_access
def api_delete_meldung(meldung_id):
    """
    Meldung löschen
    ---
    tags:
      - Meldungen
    summary: Löscht eine Meldung inklusive zugehöriger Foto-Dateien
    security:
      - sessionAuth: []
    parameters:
      - in: path
        name: meldung_id
        type: integer
        required: true
    responses:
      200:
        description: Meldung gelöscht
      404:
        description: Meldung nicht gefunden
    """
    try:
        delete_meldung_service(meldung_id)
        return jsonify({"ok": True})
    except LookupError as err:
        return _error(str(err), 404)


@bp.get("/api/meldungen/<int:meldung_id>/fotos")
@login_required
def api_list_meldung_fotos(meldung_id):
    """
    Fotos einer Meldung abrufen
    ---
    tags:
      - Meldungen
    summary: Liefert Foto-Metadaten zu einer Meldung
    security:
      - sessionAuth: []
    parameters:
      - in: path
        name: meldung_id
        type: integer
        required: true
    responses:
      200:
        description: Foto-Metadaten erfolgreich geladen
      404:
        description: Meldung nicht gefunden
    """
    try:
        return jsonify(list_meldung_fotos_service(meldung_id))
    except LookupError as err:
        return _error(str(err), 404)


@bp.post("/api/meldungen/<int:meldung_id>/fotos")
@login_required
@require_write_access
def api_add_meldung_foto(meldung_id):
    """
    Foto zu Meldung hochladen
    ---
    tags:
      - Meldungen
    summary: Speichert ein Foto zu einer Meldung
    security:
      - sessionAuth: []
    consumes:
      - multipart/form-data
    parameters:
      - in: path
        name: meldung_id
        type: integer
        required: true
      - in: formData
        name: foto
        type: file
        required: true
        description: Bilddatei, erlaubt sind jpg, jpeg, png, webp und gif
    responses:
      201:
        description: Foto erfolgreich gespeichert
      400:
        description: Ungültige Datei
      404:
        description: Meldung nicht gefunden
    """
    try:
        file = request.files.get("foto") or request.files.get("file")
        return jsonify(add_meldung_foto_service(meldung_id, file)), 201
    except ValueError as err:
        return _error(str(err), 400)
    except LookupError as err:
        return _error(str(err), 404)


@bp.get("/api/meldungen/fotos/<int:foto_id>/file")
@login_required
def api_get_meldung_foto_file(foto_id):
    """
    Foto-Datei abrufen
    ---
    tags:
      - Meldungen
    summary: Liefert die Bilddatei eines Meldungsfotos
    security:
      - sessionAuth: []
    parameters:
      - in: path
        name: foto_id
        type: integer
        required: true
    responses:
      200:
        description: Bilddatei
      404:
        description: Foto nicht gefunden
    """
    try:
        foto, path = get_meldung_foto_file(foto_id)
        return send_file(path, download_name=foto["filename"])
    except (LookupError, FileNotFoundError) as err:
        return _error(str(err), 404)


@bp.delete("/api/meldungen/fotos/<int:foto_id>")
@login_required
@require_write_access
def api_delete_meldung_foto(foto_id):
    """
    Foto löschen
    ---
    tags:
      - Meldungen
    summary: Löscht Foto-Metadaten und Datei
    security:
      - sessionAuth: []
    parameters:
      - in: path
        name: foto_id
        type: integer
        required: true
    responses:
      200:
        description: Foto gelöscht
      404:
        description: Foto nicht gefunden
    """
    try:
        delete_meldung_foto_service(foto_id)
        return jsonify({"ok": True})
    except LookupError as err:
        return _error(str(err), 404)
