from .sqlite import get_db
import uuid

def get_betrieb():
    conn = get_db()
    row = conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone()
    conn.close()
    return dict(row) if row else {}

def save_betrieb(data):
    conn = get_db()
    row = conn.execute("SELECT id FROM betrieb LIMIT 1").fetchone()
    if row:
        conn.execute("""
            UPDATE betrieb
            SET firma=?, name=?, vorname=?, strHnr=?, plz=?, ort=?, bundesland=?
            WHERE id=?
        """, (
            data["firma"], data["name"], data["vorname"],
            data["strHnr"], data["plz"], data["ort"], data["bundesland"],
            row["id"]
        ))
    else:
        conn.execute("""
            INSERT INTO betrieb (firma, name, vorname, strHnr, plz, ort, bundesland, guid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data["firma"], data["name"], data["vorname"],
            data["strHnr"], data["plz"], data["ort"], data["bundesland"],
            str(uuid.uuid4())
        ))
    conn.commit()
    conn.close()