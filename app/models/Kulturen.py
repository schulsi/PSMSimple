from ..extensions import db

class Kulturen(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "kulturen"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255))
    eppoCode = db.Column(db.String(32))

    bbch_codes = db.relationship(
        "BBCHCode",
        back_populates="kultur",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "eppoCode": self.eppoCode,
        }
