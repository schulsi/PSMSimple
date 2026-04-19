from ..extensions import db

class Kulturen(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "kulturen"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.Text)
    eppoCode = db.Column(db.Text)

    bbch_codes = db.relationship(
        "BBCHCode",
        back_populates="kultur",
        cascade="all, delete-orphan"
    )