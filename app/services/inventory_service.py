import json

from ..repositories.inventory_repo import (
    delete_auto_inventory_movements_by_application,
    get_application_by_id,
    get_inventory_movements,
    get_inventory_overview_raw,
    get_psm_by_id,
    insert_inventory_movement,
    sum_inventory_for_psm,
)


MANUAL_MOVEMENT_TYPES = {"purchase",
                         "correction_plus", "correction_minus", "disposal"}
AUTO_MOVEMENT_TYPES = {"application"}
ALLOWED_MOVEMENT_TYPES = MANUAL_MOVEMENT_TYPES | AUTO_MOVEMENT_TYPES


# ---------------------------------------------------------------------------
# Interne Helpers
# ---------------------------------------------------------------------------

def _resolve_status(bestand: float, min_lager: float, warnung_lager: float) -> str:
    if bestand < 0:
        return "negative"
    if min_lager and bestand < min_lager:
        return "critical"
    if warnung_lager and bestand <= warnung_lager:
        return "warning"
    return "ok"


def _build_stock_status(psm: dict, bestand: float) -> dict:
    min_lager = float(psm.get("min_lager") or 0)
    warnung_lager = float(psm.get("warnung_lager") or 0)

    return {
        "psm_id": psm["id"],
        "name": psm["name"],
        "bestand": round(bestand, 4),
        "einheit": psm["lager_einheit"],
        "min_lager": min_lager,
        "warnung_lager": warnung_lager,
        "status": _resolve_status(bestand, min_lager, warnung_lager),
    }


# ---------------------------------------------------------------------------
# Validierung
# ---------------------------------------------------------------------------

def validate_movement_type(typ: str) -> None:
    if typ not in ALLOWED_MOVEMENT_TYPES:
        raise ValueError(
            f"Ungültiger Bewegungstyp: '{typ}'. Erlaubt: {sorted(ALLOWED_MOVEMENT_TYPES)}")


# ---------------------------------------------------------------------------
# Bestand
# ---------------------------------------------------------------------------

def get_current_stock(psm_id: int) -> float:
    return round(sum_inventory_for_psm(psm_id), 4)


def get_stock_status(psm_id: int) -> dict:
    psm = get_psm_by_id(psm_id)
    if not psm:
        raise ValueError(f"PSM mit ID {psm_id} nicht gefunden")

    return _build_stock_status(psm, get_current_stock(psm_id))


def get_inventory_overview() -> list[dict]:
    """Alle PSM mit aktuellem Bestand und Status – eine einzige DB-Query."""
    rows = get_inventory_overview_raw()
    return [
        _build_stock_status(row, float(row.get("bestand") or 0))
        for row in rows
    ]


def get_inventory_warning_list() -> list[dict]:
    return [item for item in get_inventory_overview() if item["status"] != "ok"]


# ---------------------------------------------------------------------------
# Manuelle Lagerbewegungen
# ---------------------------------------------------------------------------

def create_manual_stock_movement(
    *,
    psm_id: int,
    typ: str,
    menge: float,
    datum: str,
    notiz: str | None = None,
) -> dict:
    validate_movement_type(typ)

    if typ not in MANUAL_MOVEMENT_TYPES:
        raise ValueError(
            f"Bewegungstyp '{typ}' ist nicht manuell buchbar. "
            f"Erlaubt: {sorted(MANUAL_MOVEMENT_TYPES)}"
        )

    if menge is None or float(menge) < 0:
        raise ValueError("menge muss >= 0 sein")

    if not datum:
        raise ValueError("datum darf nicht leer sein")

    psm = get_psm_by_id(psm_id)
    if not psm:
        raise ValueError(f"PSM mit ID {psm_id} nicht gefunden")

    einheit = (psm.get("lager_einheit") or "").strip() or "kg"

    return insert_inventory_movement(
        psm_id=psm_id,
        applikations_id=None,
        typ=typ,
        menge=round(float(menge), 4),
        einheit=einheit,
        datum=datum,
        notiz=(notiz or "").strip() or None,
        quelle="manual",
    )


# ---------------------------------------------------------------------------
# Automatische Lagerbewegungen aus Applikationen
# ---------------------------------------------------------------------------

def rebuild_inventory_for_application(applikations_id: int) -> list[dict]:
    applikation = get_application_by_id(applikations_id)
    if not applikation:
        raise ValueError(f"Applikation {applikations_id} nicht gefunden")
    datum = applikation["datum"]
    payload = json.loads(applikation.get("json_data") or "{}")

    delete_auto_inventory_movements_by_application(applikations_id)

    mittel_liste = payload.get(
        "pflanzenschutzmittel") or payload.get("psm") or []

    created = []

    for item in mittel_liste:
        psm_id = item.get("id")
        aufwand_menge = float(item.get("aufwandMenge")
                              or item.get("aufwandmenge") or 0)

        if not psm_id or aufwand_menge <= 0:
            continue

        psm = get_psm_by_id(psm_id)
        if not psm:
            continue

        einheit = (psm.get("lager_einheit") or "").strip() or "kg"

        insert_inventory_movement(
            psm_id=psm_id,
            applikations_id=applikations_id,
            typ="application",
            menge=aufwand_menge,
            einheit=einheit,
            datum=datum,
            notiz=f"Automatisch aus Applikation {applikations_id}",
            quelle="auto_from_application",
        )

        created.append({
            "psm_id": psm_id,
            "psm_name": psm["name"],
            "menge": aufwand_menge,
            "einheit": einheit,
        })
    return created


# ---------------------------------------------------------------------------
# Bewegungshistorie
# ---------------------------------------------------------------------------

def list_inventory_movements(limit: int = 200) -> list[dict]:
    # Repo gibt bereits Dicts zurück – direkt durchreichen
    return get_inventory_movements(limit=limit)
