from ..extensions import db

class Orte(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "orte"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    plz = db.Column(db.Integer)

    einsatzorte = db.relationship(
        "Einsatzort",
        back_populates="ort",
        cascade="all, delete-orphan"
    )