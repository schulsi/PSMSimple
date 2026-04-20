from ..extensions import db

class Inventory(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "inventory_movements"

    id = db.Column(db.Integer, primary_key=True)
    psm_id = db.Column(db.Integer, db.ForeignKey("pflanzenschutzmittel.id"), nullable=False)
    applikations_Id = db.Column(db.Integer, db.ForeignKey("applikationen.id"))
    typ = db.Column(db.Text, nullable=False)
    menge = db.Column(db.Float, nullable=False)
    einheit = db.Column(db.Text, nullable=False)
    datum = db.Column(db.Text, nullable=False)
    notiz = db.Column(db.Text)
    quelle = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False)

    applikation = db.relationship(
    "Applikation",
    back_populates="inventory_movements"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "psm_id": self.psm_id,
            "applikations_Id": self.applikations_Id,
            "typ": self.typ,
            "menge": self.menge,
            "einheit": self.einheit,
            "datum": self.datum,
            "notiz": self.notiz,
            "quelle": self.quelle,
            "updated_at": self.updated_at,
            "created_at": self.created_at,
        }
