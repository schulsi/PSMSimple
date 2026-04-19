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

    code = db.Column(db.Text)
    bezeichnung = db.Column(db.Text)
    beschreibung = db.Column(db.Text)
    sortierung = db.Column(db.Integer)

    # Beziehung
    kultur = db.relationship("Kultur", back_populates="bbch_codes")