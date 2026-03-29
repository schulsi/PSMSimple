from .sqlite import get_db


def list_einsatzorte():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM einsatzorte ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_einsatzort_by_id(einsatzort_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM einsatzorte WHERE id = ?",
        (einsatzort_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def list_einsatzorte_by_ids(einsatzort_ids: list[int]):
    if not einsatzort_ids:
        return []

    placeholders = ",".join("?" for _ in einsatzort_ids)
    conn = get_db()
    rows = conn.execute(
        f"SELECT * FROM einsatzorte WHERE id IN ({placeholders})",
        einsatzort_ids
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_einsatzort(data: dict):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO einsatzorte
            (name, gpsRechtswert, gpsHochwert, anwendungsbereich, geoTyp, einheit, flaecheVolumen)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            data["name"],
            data["gpsRechtswert"],
            data["gpsHochwert"],
            data["anwendungsbereich"],
            data["geoTyp"],
            data["einheit"],
            data["flaecheVolumen"],
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"ok": True, "id": new_id}


def update_einsatzort(einsatzort_id: int, data: dict):
    conn = get_db()
    conn.execute(
        """
        UPDATE einsatzorte
        SET name = ?, gpsRechtswert = ?, gpsHochwert = ?,
            anwendungsbereich = ?, geoTyp = ?, einheit = ?, flaecheVolumen = ?
        WHERE id = ?
        """,
        (
            data["name"],
            data["gpsRechtswert"],
            data["gpsHochwert"],
            data["anwendungsbereich"],
            data["geoTyp"],
            data["einheit"],
            data["flaecheVolumen"],
            einsatzort_id,
        )
    )
    conn.commit()
    conn.close()
    return {"ok": True}


def delete_einsatzort(einsatzort_id: int):
    conn = get_db()
    conn.execute(
        "DELETE FROM einsatzorte WHERE id = ?",
        (einsatzort_id,)
    )
    conn.commit()
    conn.close()
    return {"ok": True}