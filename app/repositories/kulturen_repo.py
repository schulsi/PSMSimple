from .sqlite import get_db


def list_kulturen():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM kulturen ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_kultur_by_id(kultur_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM kulturen WHERE id = ?",
        (kultur_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_kulturen_by_ids(kultur_ids: list[int]):
    if not kultur_ids:
        return []

    placeholders = ",".join("?" for _ in kultur_ids)
    conn = get_db()
    rows = conn.execute(
        f"SELECT * FROM kulturen WHERE id IN ({placeholders})",
        kultur_ids
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_kultur(data: dict):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO kulturen (name, eppoCode)
        VALUES (?, ?)
        """,
        (
            data["name"],
            data["eppoCode"],
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"ok": True, "id": new_id}


def update_kultur(kultur_id: int, data: dict):
    conn = get_db()
    conn.execute(
        """
        UPDATE kulturen
        SET name = ?, eppoCode = ?
        WHERE id = ?
        """,
        (
            data["name"],
            data["eppoCode"],
            kultur_id,
        )
    )
    conn.commit()
    conn.close()
    return {"ok": True}


def delete_kultur(kultur_id: int):
    conn = get_db()
    conn.execute(
        "DELETE FROM kulturen WHERE id = ?",
        (kultur_id,)
    )
    conn.commit()
    conn.close()
    return {"ok": True}