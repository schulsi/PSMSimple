from .sqlite import get_db
from ..models.Pflanzenschutzmittel import Pflanzenschutzmittel


def list_psm():
    db = get_db()
    objs = db.session.query(Pflanzenschutzmittel).order_by(Pflanzenschutzmittel.name).all()
    return [obj.to_dict() for obj in objs]


def get_psm_by_id(psm_id: int):
    db = get_db()
    obj = db.session.get(Pflanzenschutzmittel, psm_id)
    return obj.to_dict() if obj else None


def get_psm_by_zulassungsnr(zulassungsnr: str):
    db = get_db()
    obj = db.session.query(Pflanzenschutzmittel).filter_by(zulassungsnr=zulassungsnr).first()
    return obj.to_dict() if obj else None


def list_psm_by_ids(psm_ids: list[int]):
    db = get_db()
    if not psm_ids:
        return []

    objs = db.session.query(Pflanzenschutzmittel).filter(Pflanzenschutzmittel.id.in_(psm_ids)).all()
    return [obj.to_dict() for obj in objs]


def create_psm(data: dict):
    db = get_db()

    exists = db.session.query(Pflanzenschutzmittel.id).filter_by(
        zulassungsnr=data["zulassungsnr"]
    ).first()

    if exists:
        return {
            "ok": False,
            "error": "Mittel existiert bereits",
            "existing_id": exists[0],
        }

    psm = Pflanzenschutzmittel(
        name=data["name"],
        zulassungsnr=data["zulassungsnr"],
        wirkstoffe=data["wirkstoffe"],
        aufwandEinheit=data["aufwandEinheit"],
        bienen=data["bienen"],
        lager_einheit=data["lager_einheit"],
        min_lager=data["min_lager"],
        warnung_lager=data["warnung_lager"],
    )
    db.session.add(psm)
    db.session.commit()

    return {"ok": True, "id": psm.id}


def update_psm(psm_id: int, data: dict):
    db = get_db()
    psm = db.session.get(Pflanzenschutzmittel, psm_id)
    if not psm:
        return {"ok": False, "error": "Not Found"}

    psm.name = data["name"]
    psm.zulassungsnr = data["zulassungsnr"]
    psm.wirkstoffe = data["wirkstoffe"]
    psm.aufwandEinheit = data["aufwandEinheit"]
    psm.bienen = data["bienen"]
    psm.lager_einheit = data["lager_einheit"]
    psm.min_lager = data["min_lager"]
    psm.warnung_lager = data["warnung_lager"]

    db.session.commit()
    return {"ok": True}


def delete_psm(psm_id: int):
    db = get_db()
    psm = db.session.get(Pflanzenschutzmittel, psm_id)
    if not psm:
        return {"ok": False, "error": "Not Found"}

    db.session.delete(psm)
    db.session.commit()
    return {"ok": True}