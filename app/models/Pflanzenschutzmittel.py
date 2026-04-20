from ..extensions import db

class Pflanzenschutzmittel(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "pflanzenschutzmittel"

    id = db.Column(db.Text, primary_key=True)
    name = db.Column(db.Text)
    zulassungsnr = db.Column(db.Text)
    wirkstoffe = db.Column(db.Text)
    aufwandEinheit = db.Column(db.Text)
    bienen = db.Column(db.Text)
    lager_einheit = db.Column(db.Text)
    min_lager = db.Column(db.Float)
    warnung_lager = db.Column(db.Float)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "zulassungsnr": self.zulassungsnr,
            "wirkstoffe": self.wirkstoffe,
            "aufwandEinheit": self.aufwandEinheit,
            "bienen": self.bienen,
            "lager_einheit": self.lager_einheit,
            "min_lager": self.min_lager,
            "warnung_lager": self.warnung_lager,
        }
