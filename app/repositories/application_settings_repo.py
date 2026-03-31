from .sqlite import get_appdata_connection

def get_application_settings():
    conn = get_appdata_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT *
        FROM application_settings
        WHERE key = 'allow_registration'
    """)
    row = cur.fetchone()
    conn.close()

    if not row:
        return {
            "allow_registration": True
        }

    return {
        "allow_registration": bool(row["value"] if hasattr(row, "__getitem__") else row[0])
    }


def update_application_settings(key: str, value: str):
    conn = get_appdata_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE application_settings
        SET value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE key = ?
    """, (value, key))
    conn.commit()
    conn.close()

    return {
        "allow_registration": value
    }