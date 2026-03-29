from ..extensions import db
from ..models import UserSettings


def get_user_settings_dict(user_id: int) -> dict:
    settings = UserSettings.for_user(user_id)
    return settings.to_dict()


def normalize_settings_payload(data: dict | None) -> dict:
    data = data or {}

    return {
        "browser_download": bool(data.get("browser_download", True)),
        "local_save": bool(data.get("local_save", True)),
        "default_anwender": (data.get("default_anwender") or "").strip(),
        "default_verantwortlich": (data.get("default_verantwortlich") or "").strip(),
    }


def save_user_settings(user_id: int, data: dict | None) -> dict:
    normalized = normalize_settings_payload(data)

    settings = UserSettings.for_user(user_id)
    settings.browser_download = normalized["browser_download"]
    settings.local_save = normalized["local_save"]
    settings.default_anwender = normalized["default_anwender"] or None
    settings.default_verantwortlich = normalized["default_verantwortlich"] or None

    db.session.commit()
    return settings.to_dict()