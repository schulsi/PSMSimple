from .sqlite import get_db


def list_bbch():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM bbch_codes ORDER BY code"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_bbch_by_id(bbch_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM bbch_codes WHERE id = ?",
        (bbch_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def get_bbch_by_kultur(kultur_id: int):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM bbch_codes WHERE kultur_id = ?",
        (kultur_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_bbch_by_code(code: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM bbch_codes WHERE code = ?",
        (code,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_bbch_by_ids(bbch_ids: list[int]):
    if not bbch_ids:
        return []

    placeholders = ",".join("?" for _ in bbch_ids)
    conn = get_db()
    rows = conn.execute(
        f"SELECT * FROM bbch_codes WHERE id IN ({placeholders})",
        bbch_ids
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_bbch(data: dict):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO bbch_codes (kultur_id, code, beschreibung, bezeichnung, sortierung)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            data["kultur_id"],
            data["code"],
            data["beschreibung"],
            data["bezeichnung"],
            data["sortierung"]
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"ok": True, "id": new_id}


def update_bbch(bbch_id: int, data: dict):
    conn = get_db()
    conn.execute(
        """
        UPDATE bbch_codes
        SET code = ?, beschreibung = ?, bezeichnung = ?
        WHERE id = ?
        """,
        (
            data["code"],
            data["beschreibung"],
            data ["bezeichnung"],
            bbch_id,
        )
    )
    conn.commit()
    conn.close()
    return {"ok": True}


def delete_bbch(bbch_id: int):
    conn = get_db()
    conn.execute(
        "DELETE FROM bbch_codes WHERE id = ?",
        (bbch_id,)
    )
    conn.commit()
    conn.close()
    return {"ok": True}
