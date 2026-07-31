from ..extensions import db

class BBCHCode(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "bbch_codes"

    id = db.Column(db.Integer, primary_key=True)
    kultur_id = db.Column(
        db.Integer,
        db.ForeignKey("kulturen.id"),
        nullable=False
    )

    code = db.Column(db.String(32))
    bezeichnung = db.Column(db.String(255))
    beschreibung = db.Column(db.Text)
    sortierung = db.Column(db.Integer)

    # Beziehung
    kultur = db.relationship("Kulturen", back_populates="bbch_codes")

    def to_dict(self):
        return {
            "id": self.id,
            "kultur_id": self.kultur_id,
            "code": self.code,
            "bezeichnung": self.bezeichnung,
            "beschreibung": self.beschreibung,
            "sortierung": self.sortierung,
        }
