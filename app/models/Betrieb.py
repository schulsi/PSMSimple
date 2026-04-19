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