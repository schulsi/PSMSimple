from ..repositories.sqlite import get_db


def get_setting(key):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT value FROM application_settings WHERE key = ?", (key,))
    row = cursor.fetchone()

    conn.close()

    return row[0] if row else None


def set_setting(key, value):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO application_settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
    """, (key, value))

    conn.commit()
    conn.close()