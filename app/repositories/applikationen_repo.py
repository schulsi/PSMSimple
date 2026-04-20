from datetime import datetime, timezone
from .sqlite import get_db
from ..models.ApplicationSetting import ApplicationSetting


def insert_applikation(datum: str, json_data: str) -> int:
    """Speichert eine neue Applikation und gibt die neue ID zurück."""
    db = get_db()
    obj = ApplicationSetting(
        datum = datum,
        json_data = json_data,
        created_at = datetime.now(timezone.utc)
    )
    db.session.add(obj)
    db.session.commit()
    return obj.id