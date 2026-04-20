from .sqlite import get_db
from ..models.ApplicationSetting import ApplicationSetting


def get_setting(key):
    db = get_db()
    return db.session.get(ApplicationSetting, key).to_dict()


def get_settings():
    db = get_db()
    return [setting.to_dict() for setting in db.session.query(ApplicationSetting).all()]


def set_setting(key, value):
    db = get_db()
    setting = db.session.get(ApplicationSetting, key)
    if not setting:
        return {"ok": False, "error": "Not Found"}
    setting.value = value
    db.session.commit()
