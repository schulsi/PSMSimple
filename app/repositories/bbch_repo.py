from .sqlite import get_db
from ..models.BBCH_Codes import BBCHCode


def list_bbch():
    db = get_db()
    return [code.to_dict() for code in db.session.query(BBCHCode).order_by(BBCHCode.code).all()]
    


def get_bbch_by_id(bbch_id: int):
    db = get_db()
    obj = db.session.get(BBCHCode, bbch_id).to_dict()
    return obj if obj else None


def get_bbch_by_kultur(kultur_id: int):
    db = get_db()
    objs = db.session.query(BBCHCode).filter_by(kultur_id=kultur_id).all()
    return [obj.to_dict() for obj in objs]


def get_bbch_by_code(code: int):
    db = get_db()
    obj = db.session.query(BBCHCode).filter_by(code=code).first()
    return obj.to_dict() if obj else None
    


def list_bbch_by_ids(bbch_ids: list[int]):
    db = get_db()
    if not bbch_ids:
        return []

    objs = db.session.query(BBCHCode).filter(BBCHCode.id.in_(bbch_ids)).all()
    return [obj.to_dict() for obj in objs]

def create_bbch(data: dict):
    db = get_db()
    bbch = BBCHCode(
        kultur_id = data["kultur_id"],
        code = data["code"],
        beschreibung = data["beschreibung"],
        bezeichnung = data["bezeichnung"],
        sortierung = data["sortierung"]
    )
    db.session.add(bbch)
    db.session.commit()
    return {"ok": True, "id": bbch.id}


def update_bbch(bbch_id: int, data: dict):
    db = get_db()
    bbch = db.session.get(BBCHCode, bbch_id)
    if not bbch:
        return {"ok": False, "error": "Not Found"}
    
    bbch.code = data["code"]
    bbch.beschreibung = data["beschreibung"]
    bbch.bezeichnung = data ["bezeichnung"]
    
    db.session.commit()
    return {"ok": True}


def delete_bbch(bbch_id: int):
    db = get_db()
    bbch = db.session.get(BBCHCode, bbch_id)
    if not bbch:
        return {"ok": False, "error": "Not Found"}
    db.session.delete(bbch)
    db.session.commit()

    return {"ok": True}
