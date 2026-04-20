from .sqlite import get_db
from ..models.Kulturen import Kulturen


def list_kulturen():
    db = get_db()
    objs = db.session.query(Kulturen).order_by(Kulturen.name).all()
    return [obj.to_dict() for obj in objs]


def get_kultur_by_id(kultur_id: int):
    db = get_db()
    obj = db.session.get(Kulturen, kultur_id)
    return obj.to_dict() if obj else None


def list_kulturen_by_ids(kultur_ids: list[int]):
    db = get_db()
    if not kultur_ids:
        return []

    objs = db.session.query(Kulturen).filter(Kulturen.id.in_(kultur_ids)).all()
    return [obj.to_dict() for obj in objs]


def create_kultur(data: dict):
    db = get_db()
    kultur = Kulturen(
        name=data["name"],
        eppoCode=data["eppoCode"],
    )
    db.session.add(kultur)
    db.session.commit()
    return {"ok": True, "id": kultur.id}


def update_kultur(kultur_id: int, data: dict):
    db = get_db()
    kultur = db.session.get(Kulturen, kultur_id)
    if not kultur:
        return {"ok": False, "error": "Not Found"}

    kultur.name = data["name"]
    kultur.eppoCode = data["eppoCode"]

    db.session.commit()
    return {"ok": True}


def delete_kultur(kultur_id: int):
    db = get_db()
    kultur = db.session.get(Kulturen, kultur_id)
    if not kultur:
        return {"ok": False, "error": "Not Found"}

    db.session.delete(kultur)
    db.session.commit()
    return {"ok": True}