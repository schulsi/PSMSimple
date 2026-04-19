from datetime import datetime
from .sqlite import get_db


def insert_applikation(datum: str, json_data: str) -> int:
    """Speichert eine neue Applikation und gibt die neue ID zurück."""
    conn = get_db()
    now = datetime.utcnow().isoformat()
    cur = conn.execute(
        """
        INSERT INTO applikationen (datum, json_data, created_at)
        VALUES (?, ?, ?)
        """,
        (datum, json_data, now),
    )
    conn.commit()
    return cur.lastrowid