from ..extensions import db


class Felder(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "einsatzorte"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)

    gpsRechtswert = db.Column(db.Float)
    gpsHochwert = db.Column(db.Float)

    anwendungsbereich = db.Column(db.Text)
    geoTyp = db.Column(db.Text)

    einheit = db.Column(db.Text)
    flaecheVolumen = db.Column(db.Float)

    ort_id = db.Column(
        db.Integer,
        db.ForeignKey("orte.id"),
        nullable=False
    )
    kultur_id = db.Column(
        db.Integer,
        db.ForeignKey("kulturen.id"),
        nullable=True
    )

    # Beziehung
    ort = db.relationship("Ort", back_populates="einsatzorte")
    kultur = db.relationship("Kulturen")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "gpsRechtswert": self.gpsRechtswert,
            "gpsHochwert": self.gpsHochwert,
            "anwendungsbereich": self.anwendungsbereich,
            "geoTyp": self.geoTyp,
            "einheit": self.einheit,
            "flaecheVolumen": self.flaecheVolumen,
            "ort_id": self.ort_id,
            "kultur_id": self.kultur_id,
        }
