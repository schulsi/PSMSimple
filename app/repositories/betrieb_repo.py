from .sqlite import get_db
from ..models.Betrieb import Betrieb
import uuid


def get_betrieb():
    betrieb = Betrieb.query.first()
    return betrieb.to_dict() if betrieb else {}


def save_betrieb(data):
    db = get_db()
    betrieb = db.session.query(Betrieb).first()
    if betrieb:
        betrieb.firma = data["firma"]
        betrieb.name = data["name"]
        betrieb.vorname = data["vorname"]
        betrieb.strHnr = data["strHnr"]
        betrieb.plz = data["plz"]
        betrieb.ort = data["ort"]
        betrieb.bundesland = data["bundesland"]
        db.session.commit()
    else:
        betrieb = Betrieb(
            firma=data["firma"],
            name=data["name"],
            vorname=data["vorname"],
            strHnr=data["strHnr"],
            plz=data["plz"],
            ort=data["ort"],
            bundesland=data["bundesland"],
            guid=str(uuid.uuid4())
        )
        db.session.add(betrieb)
        db.session.commit()
