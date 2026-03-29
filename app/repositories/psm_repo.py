from .sqlite import get_db


def list_psm():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM pflanzenschutzmittel ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_psm_by_id(psm_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM pflanzenschutzmittel WHERE id = ?",
        (psm_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_psm_by_zulassungsnr(zulassungsnr: str):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM pflanzenschutzmittel WHERE zulassungsnr = ?",
        (zulassungsnr,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_psm_by_ids(psm_ids: list[int]):
    if not psm_ids:
        return []

    placeholders = ",".join("?" for _ in psm_ids)
    conn = get_db()
    rows = conn.execute(
        f"SELECT * FROM pflanzenschutzmittel WHERE id IN ({placeholders})",
        psm_ids
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_psm(data: dict):
    conn = get_db()
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM pflanzenschutzmittel WHERE zulassungsnr = ?",
        (data["zulassungsnr"],)
    )
    exists = cur.fetchone()

    if exists:
        conn.close()
        return {
            "ok": False,
            "error": "Mittel existiert bereits",
            "existing_id": exists[0],
        }

    cur.execute(
        """
        INSERT INTO pflanzenschutzmittel
            (name, zulassungsnr, wirkstoffe, aufwandEinheit, bienen)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            data["name"],
            data["zulassungsnr"],
            data["wirkstoffe"],
            data["aufwandEinheit"],
            data["bienen"],
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()

    return {"ok": True, "id": new_id}


def update_psm(psm_id: int, data: dict):
    conn = get_db()
    conn.execute(
        """
        UPDATE pflanzenschutzmittel
        SET name = ?, zulassungsnr = ?, wirkstoffe = ?, aufwandEinheit = ?, bienen = ?
        WHERE id = ?
        """,
        (
            data["name"],
            data["zulassungsnr"],
            data["wirkstoffe"],
            data["aufwandEinheit"],
            data["bienen"],
            psm_id,
        )
    )
    conn.commit()
    conn.close()
    return {"ok": True}


def delete_psm(psm_id: int):
    conn = get_db()
    conn.execute(
        "DELETE FROM pflanzenschutzmittel WHERE id = ?",
        (psm_id,)
    )
    conn.commit()
    conn.close()
    return {"ok": True}