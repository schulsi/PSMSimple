from .sqlite import get_db
from ..models.Felder import Felder

def list_einsatzorte():
    db = get_db()
    return [feld.to_dict() for feld in db.session.query(Felder).all()]


def get_einsatzort_by_id(einsatzort_id: int):
    db = get_db()
    obj = db.session.get(Felder, einsatzort_id)
    return obj.to_dict() if obj else None

def get_einsatzorte_by_ort(ort_id: int):
    db = get_db()
    return[feld.to_dict() for feld in db.session.query(Felder).filter_by(ort_id=ort_id).all()]

def list_einsatzorte_by_ids(einsatzort_ids: list[int]):
    if not einsatzort_ids:
        return []

    placeholders = ",".join("?" for _ in einsatzort_ids)
    db = get_db()
    objs = db.session.query(Felder).filter(Felder.id.in_(einsatzort_ids)).all()
    return [obj.to_dict() for obj in objs]


def create_einsatzort(data: dict):
    db = get_db()
    feld = Felder(
            name = data["name"],
            gpsRechtswert = data["gpsRechtswert"],
            gpsHochwert = data["gpsHochwert"],
            anwendungsbereich = data["anwendungsbereich"],
            geoTyp = data["geoTyp"],
            einheit = data["einheit"],
            flaecheVolumen = data["flaecheVolumen"],
            ort_id = data["ort_id"]
    )
    db.session.add(feld)
    db.session.commit()
    return {"ok": True, "id": feld.id}


def update_einsatzort(einsatzort_id: int, data: dict):
    db = get_db()
    feld = db.session.get(Felder, einsatzort_id)
    if not feld:
        return {"ok": False, "error": "Not Found"}

    feld.name = data["name"]
    feld.gpsRechtswert = data["gpsRechtswert"]
    feld.gpsHochwert = data["gpsHochwert"]
    feld.anwendungsbereich = data["anwendungsbereich"]
    feld.geoTyp = data["geoTyp"]
    feld.einheit = data["einheit"]
    feld.flaecheVolumen = data["flaecheVolumen"]
    feld.ort_id = data["ort_id"]
    
    db.session.commit()
    return {"ok": True}


def delete_einsatzort(einsatzort_id: int):
    db = get_db()
    feld = db.session.get(Felder, einsatzort_id)
    if not feld:
        return {"ok": False, "error": "Not Found"}
    db.session.delete(feld)
    db.session.commit()
    return {"ok": True}