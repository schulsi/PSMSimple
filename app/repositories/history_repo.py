import json
from datetime import datetime

from .sqlite import get_db
from ..models.Applikationen import Applikation


def list_history(date_from=None, date_to=None):
    db = get_db()
    query = db.session.query(Applikation)

    if date_from:
        query = query.filter(Applikation.datum >= date_from)
    if date_to:
        query = query.filter(Applikation.datum <= date_to)

    rows = query.order_by(
        Applikation.datum.desc(),
        Applikation.uhrzeit.desc(),
        Applikation.id.desc()
    ).all()

    return [
        {
            "id": row.id,
            "created_at": row.created_at,
            "datum": row.datum,
            "uhrzeit": row.uhrzeit,
            "artVerwendung": row.artVerwendung,
            "verantwortlich": row.verantwortlich,
            "anwender": row.anwender,
            "einsatzorte": row.einsatzorte,
            "psm_namen": row.psm_namen,
            "kulturen": row.kulturen,
        }
        for row in rows
    ]


def get_psm_usage_history(date_from=None, date_to=None):
    db = get_db()
    query = db.session.query(Applikation).filter(
        Applikation.psm_namen.isnot(None),
        Applikation.psm_namen != ""
    )

    if date_from:
        query = query.filter(Applikation.datum >= date_from)
    if date_to:
        query = query.filter(Applikation.datum <= date_to)

    rows = query.all()

    usage = {}
    for row in rows:
        datum = row.datum
        psm_list = [name.strip() for name in (row.psm_namen or "").split(",") if name.strip()]

        try:
            json_data = json.loads(row.json_data) if row.json_data else {}
        except json.JSONDecodeError:
            json_data = {}

        psm_details = json_data.get("pflanzenschutzmittel", [])

        for i, psm in enumerate(psm_list):
            if psm not in usage:
                usage[psm] = {
                    "count": 0,
                    "last_used": None,
                    "total_quantity": 0,
                    "unit": None
                }

            usage[psm]["count"] += 1

            if not usage[psm]["last_used"] or datum > usage[psm]["last_used"]:
                usage[psm]["last_used"] = datum

            if i < len(psm_details):
                psm_detail = psm_details[i]
                menge = psm_detail.get("aufwandMenge")
                einheit = psm_detail.get("aufwandEinheit")

                if menge:
                    try:
                        if isinstance(menge, str):
                            menge = menge.split("/")[0].strip()
                        menge_float = round(float(menge), 3)

                        if menge_float > 0:
                            usage[psm]["total_quantity"] += menge_float
                            if not usage[psm]["unit"]:
                                if isinstance(einheit, str):
                                    einheit = einheit.split("/")[0].strip()
                                usage[psm]["unit"] = einheit or "—"
                    except (ValueError, TypeError):
                        pass

    result = []
    for psm, data in usage.items():
        result.append({
            "psm_name": psm,
            "usage_count": data["count"],
            "last_used": data["last_used"],
            "total_quantity": data["total_quantity"],
            "unit": data["unit"]
        })

    result.sort(key=lambda x: (-x["usage_count"], x["last_used"] or ""), reverse=True)
    return result


def get_fields_usage_history(date_from=None, date_to=None):
    db = get_db()
    query = db.session.query(Applikation).filter(
        Applikation.einsatzorte.isnot(None),
        Applikation.einsatzorte != ""
    )

    if date_from:
        query = query.filter(Applikation.datum >= date_from)
    if date_to:
        query = query.filter(Applikation.datum <= date_to)

    rows = query.all()

    usage = {}
    for row in rows:
        datum = row.datum
        field_list = [name.strip() for name in (row.einsatzorte or "").split(",") if name.strip()]

        try:
            json_data = json.loads(row.json_data) if row.json_data else {}
        except json.JSONDecodeError:
            json_data = {}

        field_details = json_data.get("einsatzorte", [])

        for i, field in enumerate(field_list):
            if field not in usage:
                usage[field] = {
                    "count": 0,
                    "last_used": None,
                    "total_area": 0,
                    "unit": None
                }

            usage[field]["count"] += 1

            if not usage[field]["last_used"] or datum > usage[field]["last_used"]:
                usage[field]["last_used"] = datum

            if i < len(field_details):
                field_detail = field_details[i]
                flaeche = field_detail.get("flaecheVolumen")
                einheit = field_detail.get("einheit")

                if flaeche and isinstance(flaeche, (int, float)):
                    flaeche = round(float(flaeche), 3)
                    usage[field]["total_area"] += flaeche
                    if not usage[field]["unit"]:
                        usage[field]["unit"] = einheit or "—"

    result = []
    for field, data in usage.items():
        result.append({
            "field_name": field,
            "usage_count": data["count"],
            "last_used": data["last_used"],
            "total_area": data["total_area"],
            "unit": data["unit"]
        })

    result.sort(key=lambda x: (-x["usage_count"], x["last_used"] or ""), reverse=True)
    return result


def get_field_applications(field_name, date_from=None, date_to=None):
    db = get_db()
    query = db.session.query(Applikation).filter(
        Applikation.einsatzorte.like(f"%{field_name}%")
    )

    if date_from:
        query = query.filter(Applikation.datum >= date_from)
    if date_to:
        query = query.filter(Applikation.datum <= date_to)

    rows = query.order_by(
        Applikation.datum.desc(),
        Applikation.uhrzeit.desc()
    ).all()

    applications = []
    for row in rows:
        try:
            json_data = json.loads(row.json_data) if row.json_data else {}
        except json.JSONDecodeError:
            json_data = {}

        anwendung = json_data.get("anwendung", {})
        datum = anwendung.get("datum")
        uhrzeit = anwendung.get("uhrzeit")

        field_details = None
        einsatzorte = json_data.get("einsatzorte", [])
        field_list = []

        for ort in einsatzorte:
            name = ort.get("name", "").strip()
            if name:
                field_list.append(name)

        field_index = None
        for i, name in enumerate(field_list):
            if name == field_name:
                field_index = i
                break

        if field_index is not None and field_index < len(einsatzorte):
            field_details = einsatzorte[field_index]

        psm_details = []
        psm_list = json_data.get("pflanzenschutzmittel", [])

        for psm in psm_list:
            psm_info = {
                "name": psm.get("name", "Unbekannt"),
                "quantity": psm.get("aufwandMenge"),
                "unit": psm.get("aufwandEinheit"),
                "area": field_details.get("flaecheVolumen") if field_details else None,
                "area_unit": field_details.get("einheit") if field_details else None
            }
            psm_details.append(psm_info)

        applications.append({
            "id": row.id,
            "date": datum,
            "time": uhrzeit,
            "psm_applications": psm_details
        })

    return applications


def get_history_entry(history_id: int):
    db = get_db()
    obj = db.session.get(Applikation, history_id)
    if not obj:
        return None

    data = obj.to_dict()

    try:
        data["json_data"] = json.loads(data["json_data"])
    except (TypeError, json.JSONDecodeError):
        data["json_data"] = {}

    return data


def create_history_entry(output: dict):
    db = get_db()
    anwendung = output.get("anwendung", {})

    einsatzorte = ", ".join(
        e.get("name", "") for e in output.get("einsatzorte", []) if e.get("name")
    )
    psm_namen = ", ".join(
        p.get("name", "") for p in output.get("pflanzenschutzmittel", []) if p.get("name")
    )
    kulturen = ", ".join(
        k.get("name", "") for k in output.get("kulturen", []) if k.get("name")
    )

    obj = Applikation(
        created_at=anwendung.get("created_at") or datetime.now().isoformat(timespec="seconds"),
        datum=anwendung.get("datum", ""),
        uhrzeit=anwendung.get("uhrzeit", ""),
        artVerwendung=anwendung.get("artVerwendung", ""),
        verantwortlich=anwendung.get("verantwortlich", ""),
        anwender=anwendung.get("anwender", ""),
        einsatzorte=einsatzorte,
        psm_namen=psm_namen,
        kulturen=kulturen,
        json_data=json.dumps(output, ensure_ascii=False),
    )
    db.session.add(obj)
    db.session.commit()

    return {"ok": True, "id": obj.id}


def delete_history_entry(history_id: int):
    db = get_db()
    obj = db.session.get(Applikation, history_id)
    if not obj:
        return {"ok": False, "error": "Not Found"}

    db.session.delete(obj)
    db.session.commit()
    return {"ok": True}