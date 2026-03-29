import json
from datetime import datetime
from .sqlite import get_db


def list_history():
    conn = get_db()
    rows = conn.execute(
        """
        SELECT
            id,
            created_at,
            datum,
            uhrzeit,
            artVerwendung,
            verantwortlich,
            anwender,
            einsatzorte,
            psm_namen,
            kulturen
        FROM applikationen
        ORDER BY datetime(created_at) DESC, id DESC
        """
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_history_entry(history_id: int):
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM applikationen WHERE id = ?",
        (history_id,)
    ).fetchone()
    conn.close()

    if not row:
        return None

    data = dict(row)
    try:
        data["json_data"] = json.loads(data["json_data"])
    except (TypeError, json.JSONDecodeError):
        data["json_data"] = {}
    return data


def create_history_entry(output: dict):
    anwendung = output.get("anwendung", {})
    einsatzorte = ", ".join(
        e.get("name", "") for e in output.get("einsatzorte", []) if e.get("name")
    )
    psm_namen = ", ".join(
        p.get("name", "") for p in output.get("pflanzenschutzmittel", []) if p.get("name")
    )
    kulturen = ", ".join(
        k.get("name", "") for k in output.get("kulturen", []) if k.get("name")
    )

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO applikationen (
            created_at,
            datum,
            uhrzeit,
            artVerwendung,
            verantwortlich,
            anwender,
            einsatzorte,
            psm_namen,
            kulturen,
            json_data
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            anwendung.get("created_at") or datetime.now().isoformat(timespec="seconds"),
            anwendung.get("datum", ""),
            anwendung.get("uhrzeit", ""),
            anwendung.get("artVerwendung", ""),
            anwendung.get("verantwortlich", ""),
            anwendung.get("anwender", ""),
            einsatzorte,
            psm_namen,
            kulturen,
            json.dumps(output, ensure_ascii=False),
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()

    return {"ok": True, "id": new_id}


def delete_history_entry(history_id: int):
    conn = get_db()
    conn.execute(
        "DELETE FROM applikationen WHERE id = ?",
        (history_id,)
    )
    conn.commit()
    conn.close()
    return {"ok": True}