from ..extensions import db

class ApplicationSetting(db.Model):
    __bind_key__ = "app_db"
    __tablename__ = "application_settings"

    key = db.Column(db.Text, primary_key=True)
    value = db.Column(db.Text)
    
    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
        }
    