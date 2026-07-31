from ..extensions import db

class Betrieb(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "betrieb"

    id = db.Column(db.Integer, primary_key=True)
    firma = db.Column(db.String(255))
    name = db.Column(db.String(255))
    vorname = db.Column(db.String(255))
    strHnr = db.Column(db.String(255))
    plz = db.Column(db.String(16))
    ort = db.Column(db.String(255))
    bundesland = db.Column(db.String(100))
    guid = db.Column(db.String(64))

    def to_dict(self):
        return {
            "id": self.id,
            "firma": self.firma,
            "name": self.name,
            "vorname": self.vorname,
            "strHnr": self.strHnr,
            "plz": self.plz,
            "ort": self.ort,
            "bundesland": self.bundesland,
            "guid": self.guid,
        }
