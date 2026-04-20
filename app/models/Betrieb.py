from ..extensions import db

class Betrieb(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "betrieb"

    id = db.Column(db.Integer, primary_key=True)
    firma = db.Column(db.Text)
    name = db.Column(db.Text)
    vorname = db.Column(db.Text)
    strHnr = db.Column(db.Text)
    plz = db.Column(db.Text)
    ort = db.Column(db.Text)
    bundesland = db.Column(db.Text)
    guid = db.Column(db.Text)

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