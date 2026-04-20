from ..extensions import db

class Ort(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "orte"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    plz = db.Column(db.Integer)

    einsatzorte = db.relationship(
        "Felder",
        back_populates="ort",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "plz": self.plz,
        }