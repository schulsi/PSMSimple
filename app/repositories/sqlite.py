from ..models.ApplicationSetting import ApplicationSetting
from ..extensions import db

def get_db():
    return db

def init_appdata_db():
    defaults = {
        "registration_allowed": "1",
        "inventory_warn_default": "2",
        "inventory_min_default": "2",
    }
    for key, value in defaults.items():
        existing = db.session.get(ApplicationSetting, key)
        if existing is None:
            db.session.add(ApplicationSetting(key=key, value=value))

    db.session.commit()
