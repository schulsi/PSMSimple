from flask import Blueprint, jsonify, request

from ..services.permissions import login_required, require_write_access, require_admin
from app.services.inventory_service import (
    create_manual_stock_movement,
    get_inventory_overview,
    get_inventory_warning_list,
    list_inventory_movements,
)

bp = Blueprint("inventory", __name__)


@bp.get("/api/inventory")
@login_required
def api_inventory_overview():
    """
    Inventarübersicht abrufen
    ---
    tags:
      - Inventory
    summary: Liefert die aktuelle Lagerübersicht aller Pflanzenschutzmittel
    description: >
      Gibt eine zusammengefasste Übersicht des aktuellen Bestands zurück.
      Die genaue Struktur wird vom Service `get_inventory_overview()` geliefert.
    security:
      - sessionAuth: []
    responses:
      200:
        description: Inventarübersicht erfolgreich geladen
        schema:
          type: array
          items:
            type: object
            properties:
              psm_id:
                type: integer
                example: 1
              name:
                type: string
                example: FOLGUT 80 WG
              bestand:
                type: number
                format: float
                example: 12.5
              einheit:
                type: string
                example: kg
    """
    data = get_inventory_overview()
    return jsonify(data)


@bp.get("/api/inventory/warnings")
@login_required
def api_inventory_warnings():
    """
    Inventarwarnungen abrufen
    ---
    tags:
      - Inventory
    summary: Liefert Warnungen zu kritischen Lagerbeständen
    description: >
      Gibt eine Liste von Pflanzenschutzmitteln zurück, bei denen der Bestand
      kritisch niedrig oder anderweitig auffällig ist.
    security:
      - sessionAuth: []
    responses:
      200:
        description: Warnliste erfolgreich geladen
        schema:
          type: array
          items:
            type: object
            properties:
              psm_id:
                type: integer
                example: 1
              name:
                type: string
                example: FOLGUT 80 WG
              bestand:
                type: number
                format: float
                example: 1.2
              warnung:
                type: string
                example: Niedriger Bestand
    """
    data = get_inventory_warning_list()
    return jsonify(data)


@bp.get("/api/inventory/movements")
@login_required
def api_inventory_movements():
    """
    Lagerbewegungen abrufen
    ---
    tags:
      - Inventory
    summary: Liefert die letzten Lagerbewegungen
    description: >
      Gibt eine Liste von Lagerbewegungen zurück. Über den Query-Parameter `limit`
      kann die maximale Anzahl der zurückgegebenen Einträge gesteuert werden.
    security:
      - sessionAuth: []
    parameters:
      - in: query
        name: limit
        type: integer
        required: false
        default: 200
        description: Maximale Anzahl zurückgegebener Lagerbewegungen
    responses:
      200:
        description: Lagerbewegungen erfolgreich geladen
        schema:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
                example: 15
              psm_id:
                type: integer
                example: 1
              typ:
                type: string
                example: zugang
              menge:
                type: number
                format: float
                example: 5.0
              datum:
                type: string
                example: "2026-04-18"
              notiz:
                type: string
                example: Manuelle Korrektur
    """
    limit = request.args.get("limit", default=200, type=int)
    data = list_inventory_movements(limit=limit)
    return jsonify(data)


@bp.post("/api/inventory/movements")
@login_required
@require_write_access
def api_create_inventory_movement():
    """
    Manuelle Lagerbewegung anlegen
    ---
    tags:
      - Inventory
    summary: Erstellt eine manuelle Lagerbewegung
    description: >
      Legt eine manuelle Lagerbewegung für ein Pflanzenschutzmittel an.
      Pflichtfelder sind `psm_id`, `menge` und `datum`.
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
          required:
            - psm_id
            - menge
            - datum
          properties:
            psm_id:
              type: integer
              example: 1
              description: ID des Pflanzenschutzmittels
            typ:
              type: string
              example: zugang
              description: Typ der Lagerbewegung, z. B. zugang oder abgang
            menge:
              type: number
              format: float
              example: 10.5
              description: Menge der Lagerbewegung
            datum:
              type: string
              example: "2026-04-18"
              description: Datum der Lagerbewegung im Format YYYY-MM-DD
            notiz:
              type: string
              example: Eingang neue Lieferung
              description: Optionale Notiz zur Lagerbewegung
    responses:
      201:
        description: Lagerbewegung erfolgreich angelegt
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
      400:
        description: Ungültige Eingaben oder Pflichtfelder fehlen
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: false
            error:
              type: string
              example: Pflichtfelder fehlen
    """
    data = request.get_json(force=True) or {}
    if not data.get("psm_id") or not data.get("menge") or not data.get("datum"):
        return jsonify({"ok": False, "error": "Pflichtfelder fehlen"}), 400

    try:
        psm_id = int(data["psm_id"])
        typ = (data.get("typ") or "").strip()
        menge = float(data["menge"])
        datum = (data.get("datum") or "").strip()
        notiz = data.get("notiz")

        create_manual_stock_movement(
            psm_id=psm_id,
            typ=typ,
            menge=menge,
            datum=datum,
            notiz=notiz,
        )

        return jsonify({"ok": True}), 201

    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400