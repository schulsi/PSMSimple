from .sqlite import get_db
from ..models.ApplicationSetting import ApplicationSetting


def get_setting(key):
    db = get_db()
    return db.session.get(ApplicationSetting, key).get_value()


def get_settings():
    db = get_db()
    settings = db.session.query(
        ApplicationSetting.key,
        ApplicationSetting.value
    ).all()

    return dict(settings)


def set_setting(key, value):
    db = get_db()
    setting = db.session.get(ApplicationSetting, key)
    if not setting:
        sett = ApplicationSetting(
            key=key,
            value=value
        )
        db.session.add(sett)
    else:
        setting.value = value
    db.session.commit()
