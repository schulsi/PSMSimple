from .sqlite import get_db
from ..models.Meldungen import Meldung, MeldungFoto


def list_meldungen(
    *,
    flaeche_id: int | None = None,
    status: str | None = None,
    typ: str | None = None,
    limit: int = 200,
) -> list[dict]:
    db = get_db()
    query = db.session.query(Meldung)

    if flaeche_id is not None:
        query = query.filter(Meldung.flaeche_id == flaeche_id)

    if status:
        query = query.filter(Meldung.status == status)

    if typ:
        query = query.filter(Meldung.typ == typ)

    rows = (
        query
        .order_by(Meldung.datum.desc(), Meldung.id.desc())
        .limit(limit)
        .all()
    )

    return [meldung.to_dict() for meldung in rows]


def get_meldung(meldung_id: int) -> dict | None:
    db = get_db()
    meldung = db.session.get(Meldung, meldung_id)
    if not meldung:
        return None

    item = meldung.to_dict()
    item["fotos"] = [foto.to_dict() for foto in meldung.fotos]
    return item


def insert_meldung(data: dict) -> dict:
    db = get_db()
    meldung = Meldung(**data)
    db.session.add(meldung)
    db.session.commit()
    return get_meldung(meldung.id)


def update_meldung(meldung_id: int, data: dict) -> dict | None:
    db = get_db()
    meldung = db.session.get(Meldung, meldung_id)
    if not meldung:
        return None

    for key, value in data.items():
        setattr(meldung, key, value)

    db.session.commit()
    return get_meldung(meldung.id)


def delete_meldung(meldung_id: int) -> bool:
    db = get_db()
    meldung = db.session.get(Meldung, meldung_id)
    if not meldung:
        return False

    db.session.delete(meldung)
    db.session.commit()
    return True


def list_meldung_fotos(meldung_id: int) -> list[dict]:
    db = get_db()
    rows = (
        db.session.query(MeldungFoto)
        .filter(MeldungFoto.meldung_id == meldung_id)
        .order_by(MeldungFoto.id.desc())
        .all()
    )
    return [foto.to_dict() for foto in rows]


def get_meldung_foto(foto_id: int) -> dict | None:
    db = get_db()
    foto = db.session.get(MeldungFoto, foto_id)
    return foto.to_dict() if foto else None


def insert_meldung_foto(data: dict) -> dict:
    db = get_db()
    foto = MeldungFoto(**data)
    db.session.add(foto)
    db.session.commit()
    return foto.to_dict()


def delete_meldung_foto(foto_id: int) -> dict | None:
    db = get_db()
    foto = db.session.get(MeldungFoto, foto_id)
    if not foto:
        return None

    item = foto.to_dict()
    db.session.delete(foto)
    db.session.commit()
    return item
