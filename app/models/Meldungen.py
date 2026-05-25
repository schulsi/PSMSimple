from ..extensions import db


MELDUNG_TYPEN = [
    "draht_abgerissen",
    "rebe_kaputt",
    "pfahl_kaputt",
    "wildschaden",
    "hagelschaden",
    "krankheit",
    "schaedling",
    "freifeld",
    "sonstiges",
]

STATUS = [
    "offen",
    "in_bearbeitung",
    "erledigt",
    "verworfen",
]

PRIORITAET = [
    "niedrig",
    "normal",
    "hoch",
    "kritisch",
]


class Meldung(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "meldungen"

    id = db.Column(db.Integer, primary_key=True)
    flaeche_id = db.Column(db.Integer, db.ForeignKey("einsatzorte.id"))
    datum = db.Column(db.Text, nullable=False)
    typ = db.Column(db.Text, nullable=False)
    titel = db.Column(db.Text, nullable=False)
    beschreibung = db.Column(db.Text)
    status = db.Column(db.Text, server_default="offen")
    prioritaet = db.Column(db.Text, server_default="normal")
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    created_at = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.Text, nullable=False)

    flaeche = db.relationship("Felder")
    fotos = db.relationship(
        "MeldungFoto",
        back_populates="meldung",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "flaeche_id": self.flaeche_id,
            "datum": self.datum,
            "typ": self.typ,
            "titel": self.titel,
            "beschreibung": self.beschreibung,
            "status": self.status,
            "prioritaet": self.prioritaet,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class MeldungFoto(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "meldung_fotos"

    id = db.Column(db.Integer, primary_key=True)
    meldung_id = db.Column(db.Integer, db.ForeignKey("meldungen.id"), nullable=False)
    filename = db.Column(db.Text, nullable=False)
    path = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.Text, nullable=False)

    meldung = db.relationship("Meldung", back_populates="fotos")

    def to_dict(self):
        return {
            "id": self.id,
            "meldung_id": self.meldung_id,
            "filename": self.filename,
            "path": self.path,
            "created_at": self.created_at,
        }
