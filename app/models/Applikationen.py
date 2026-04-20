from ..extensions import db

class Applikation(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "applikationen"

    id = db.Column(db.Integer, primary_key=True)

    created_at = db.Column(db.Text, nullable=False)

    datum = db.Column(db.Text)
    uhrzeit = db.Column(db.Text)

    artVerwendung = db.Column(db.Text)
    verantwortlich = db.Column(db.Text)
    anwender = db.Column(db.Text)

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