from datetime import datetime
from sqlalchemy import func, case

from .sqlite import get_db
from ..models.Inventory import Inventory
from ..models.Pflanzenschutzmittel import Pflanzenschutzmittel
from ..models.Applikationen import Applikation


def get_application_by_id(applikations_id: int) -> dict | None:
    db = get_db()
    obj = db.session.get(Applikation, applikations_id)
    return obj.to_dict() if obj else None


def get_psm_by_id(psm_id: int) -> dict | None:
    db = get_db()
    obj = db.session.get(Pflanzenschutzmittel, psm_id)
    return obj.to_dict() if obj else None


# ---------------------------------------------------------------------------
# Inventory – Bestandsberechnungen
# ---------------------------------------------------------------------------

def sum_inventory_for_psm(psm_id: int) -> float:
    db = get_db()

    bestand_expr = func.coalesce(
        func.sum(
            case(
                (Inventory.typ.in_(["purchase", "correction_plus"]), Inventory.menge),
                (Inventory.typ.in_(["application", "correction_minus", "disposal"]), -Inventory.menge),
                else_=0
            )
        ),
        0
    )

    bestand = db.session.query(bestand_expr).filter(
        Inventory.psm_id == psm_id
    ).scalar()

    return float(bestand or 0)


def get_inventory_overview_raw() -> list[dict]:
    db = get_db()

    bestand_expr = func.coalesce(
        func.sum(
            case(
                (Inventory.typ.in_(["purchase", "correction_plus"]), Inventory.menge),
                (Inventory.typ.in_(["application", "correction_minus", "disposal"]), -Inventory.menge),
                else_=0
            )
        ),
        0
    ).label("bestand")

    rows = (
        db.session.query(
            Pflanzenschutzmittel.id,
            Pflanzenschutzmittel.name,
            Pflanzenschutzmittel.lager_einheit,
            func.coalesce(Pflanzenschutzmittel.min_lager, 0).label("min_lager"),
            func.coalesce(Pflanzenschutzmittel.warnung_lager, 0).label("warnung_lager"),
            bestand_expr
        )
        .outerjoin(Inventory, Inventory.psm_id == Pflanzenschutzmittel.id)
        .group_by(
            Pflanzenschutzmittel.id,
            Pflanzenschutzmittel.name,
            Pflanzenschutzmittel.lager_einheit,
            Pflanzenschutzmittel.min_lager,
            Pflanzenschutzmittel.warnung_lager,
        )
        .order_by(Pflanzenschutzmittel.name.asc())
        .all()
    )

    return [
        {
            "id": row.id,
            "name": row.name,
            "lager_einheit": row.lager_einheit,
            "min_lager": row.min_lager,
            "warnung_lager": row.warnung_lager,
            "bestand": float(row.bestand or 0),
        }
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Inventory – Bewegungen schreiben / löschen
# ---------------------------------------------------------------------------

def insert_inventory_movement(
    *,
    psm_id: int,
    applikations_id: int | None,
    typ: str,
    menge: float,
    einheit: str,
    datum: str,
    notiz: str | None,
    quelle: str | None,
) -> dict:
    db = get_db()
    now = datetime.utcnow().isoformat()

    movement = Inventory(
        psm_id=psm_id,
        applikations_id=applikations_id,
        typ=typ,
        menge=menge,
        einheit=einheit,
        datum=datum,
        notiz=notiz,
        quelle=quelle,
        created_at=now,
        updated_at=now,
    )
    db.session.add(movement)
    db.session.commit()

    return {"ok": True, "id": movement.id}


def delete_auto_inventory_movements_by_application(applikations_id: int) -> None:
    db = get_db()
    db.session.query(Inventory).filter(
        Inventory.applikations_id == applikations_id,
        Inventory.typ == "application",
        Inventory.quelle == "auto_from_application",
    ).delete(synchronize_session=False)
    db.session.commit()


# ---------------------------------------------------------------------------
# Inventory – Bewegungen lesen
# ---------------------------------------------------------------------------

def get_inventory_movements(limit: int = 200) -> list[dict]:
    db = get_db()

    rows = (
        db.session.query(Inventory, Pflanzenschutzmittel.name.label("psm_name"))
        .outerjoin(Pflanzenschutzmittel, Pflanzenschutzmittel.id == Inventory.psm_id)
        .order_by(Inventory.datum.desc(), Inventory.id.desc())
        .limit(limit)
        .all()
    )

    result = []
    for movement, psm_name in rows:
        item = movement.to_dict()
        item["psm_name"] = psm_name
        result.append(item)

    return result