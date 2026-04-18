from .sqlite import get_db


def list_orte():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM orte ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_ort_by_id(ort_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM orte WHERE id = ?",
        (ort_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_orte_by_ids(ort_ids: list[int]):
    if not ort_ids:
        return []

    placeholders = ",".join("?" for _ in ort_ids)
    conn = get_db()
    rows = conn.execute(
        f"SELECT * FROM orte WHERE id IN ({placeholders})",
        ort_ids
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_ort(data: dict):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO orte
            (name, plz, ort_id)
        VALUES (?, ?, ?)
        """,
        (
            data["name"],
            data["plz"],
            data["ort_id"]
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"ok": True, "id": new_id}


def update_ort(ort_id: int, data: dict):
    conn = get_db()
    conn.execute(
        """
        UPDATE orte
        SET name = ?, plz = ?
        WHERE id = ?
        """,
        (
            data["name"],
            data["plz"],
            ort_id,
        )
    )
    conn.commit()
    conn.close()
    return {"ok": True}


def delete_ort(ort_id: int):
    conn = get_db()
    conn.execute(
        "DELETE FROM ort WHERE id = ?",
        (ort_id,)
    )
    conn.commit()
    conn.close()
    return {"ok": True}
