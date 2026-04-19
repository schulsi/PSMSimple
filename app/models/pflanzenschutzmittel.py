from ..extensions import db

class Pflanzenschutzmittel(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "pflanzenschutzmittel"

    id = db.Column(db.Text, primary_key=True)
    name = db.Column(db.Text)
    zulassungsnr = db.Column(db.text)
    wirkstoffe = db.Column(db.Text)
    aufwandEinheit = db.Column(db.Text)
    bienen = db.Column(db.Text)
    lager_einheit = db.Column(db.Text)
    min_lager = db.Column(db.Float)
    warnung_lager = db.Column(db.Float)