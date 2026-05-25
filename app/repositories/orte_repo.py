from .sqlite import get_db
from ..models import Ort


def list_orte():
    db = get_db()
    return [ort.to_dict() for ort in db.session.query(Ort).order_by(Ort.name).all()]


def get_ort_by_id(ort_id: int):
    db = get_db()
    return db.session.get(Ort, ort_id).to_dict()


def list_orte_by_ids(ort_ids: list[int]):
    if not ort_ids:
        return []

    db = get_db()
    return [ort.to_dict() for ort in db.session.query(Ort).filter(Ort.id.in_(ort_ids)).all()]


def create_ort(data: dict):
    db = get_db()
    ort = Ort(
        name=data["name"],
        plz=data["plz"],
    )
    db.session.add(ort)
    db.session.commit()

    return {"ok": True, "id": ort.id}


def update_ort(ort_id: int, data: dict):
    db = get_db()
    ort = db.session.get(Ort, ort_id)
    if not ort:
        return {"ok": False, "error": "Not Found"}

    ort.name = data["name"]
    ort.plz = data["plz"]
    db.session.commit()
    return {"ok": True}


def delete_ort(ort_id: int):
    db = get_db()
    ort = db.session.get(Ort, ort_id)
    if not ort:
        return {"ok": False, "error": "Not found"}

    db.session.delete(ort)
    db.session.commit()

    return {"ok": True}
