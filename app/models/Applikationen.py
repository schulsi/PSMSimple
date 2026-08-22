from ..extensions import db

class Applikation(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "applikationen"

    id = db.Column(db.Integer, primary_key=True)

    created_at = db.Column(db.String(32), nullable=False)

    datum = db.Column(db.String(32))
    uhrzeit = db.Column(db.String(16))

    artVerwendung = db.Column(db.String(100))
    verantwortlich = db.Column(db.String(255))
    anwender = db.Column(db.String(255))

    einsatzorte = db.Column(db.Text)
    psm_namen = db.Column(db.Text)
    kulturen = db.Column(db.Text)

    json_data = db.Column(db.Text, nullable=False)

    # Beziehung zu Inventory
    inventory_movements = db.relationship(
        "Inventory",
        back_populates="applikation"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "created_at": self.created_at,
            "datum": self.datum,
            "uhrzeit": self.uhrzeit,
            "artVerwendung": self.artVerwendung,
            "anwender": self.anwender,
            "einsatzorte": self.einsatzorte,
            "psm_namen": self.psm_namen,
            "kulturen": self.kulturen,
            "json_data": self.json_data,
        }
