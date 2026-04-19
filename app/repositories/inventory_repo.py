from datetime import datetime
from .sqlite import get_db

def _row_to_dict(cursor, row) -> dict:
    """Wandelt eine sqlite3.Row anhand der Cursor-Beschreibung in ein dict um."""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


def _rows_to_dicts(cursor, rows) -> list[dict]:
    return [_row_to_dict(cursor, row) for row in rows]


def get_application_by_id(applikations_id: int) -> dict | None:
    conn = get_db()
    cur = conn.execute(
        """
        SELECT id, datum, json_data
        FROM applikationen
        WHERE id = ?
        """,
        (applikations_id,),
    )
    row = cur.fetchone()
    return _row_to_dict(cur, row) if row else None


def get_psm_by_id(psm_id: int) -> dict | None:
    conn = get_db()
    cur = conn.execute(
        """
        SELECT id, name, lager_einheit, min_lager, warnung_lager
        FROM pflanzenschutzmittel
        WHERE id = ?
        """,
        (psm_id,),
    )
    row = cur.fetchone()
    return _row_to_dict(cur, row) if row else None


# ---------------------------------------------------------------------------
# Inventory – Bestandsberechnungen
# ---------------------------------------------------------------------------

def sum_inventory_for_psm(psm_id: int) -> float:
    """Berechnet den aktuellen Lagerbestand für ein einzelnes PSM."""
    conn = get_db()
    cur = conn.execute(
        """
        SELECT COALESCE(SUM(
            CASE
                WHEN typ IN ('purchase', 'correction_plus') THEN menge
                WHEN typ IN ('application', 'correction_minus', 'disposal') THEN -menge
                ELSE 0
            END
        ), 0) AS bestand
        FROM inventory_movements
        WHERE psm_id = ?
        """,
        (psm_id,),
    )
    row = cur.fetchone()
    return float(row[0] or 0)


def get_inventory_overview_raw() -> list[dict]:
    """
    Gibt Bestand + PSM-Stammdaten für alle Mittel in einer einzigen Query zurück.
    Ersetzt das N+1-Muster aus dem Service.
    """
    conn = get_db()
    cur = conn.execute(
        """
        SELECT
            p.id,
            p.name,
            p.lager_einheit,
            COALESCE(p.min_lager, 0)      AS min_lager,
            COALESCE(p.warnung_lager, 0)  AS warnung_lager,
            COALESCE(SUM(
                CASE
                    WHEN im.typ IN ('purchase', 'correction_plus') THEN im.menge
                    WHEN im.typ IN ('application', 'correction_minus', 'disposal') THEN -im.menge
                    ELSE 0
                END
            ), 0) AS bestand
        FROM pflanzenschutzmittel p
        LEFT JOIN inventory_movements im ON im.psm_id = p.id
        GROUP BY p.id
        ORDER BY p.name COLLATE NOCASE ASC
        """
    )
    return _rows_to_dicts(cur, cur.fetchall())


# ---------------------------------------------------------------------------
# Inventory – Bewegungen schreiben / löschen
# ---------------------------------------------------------------------------

def insert_inventory_movement(
    *,
    psm_id: int,
    applikations_id: int | None,
    typ: str,
    menge: float,
    einheit: str,
    datum: str,
    notiz: str | None,
    quelle: str | None,
) -> dict:
    conn = get_db()
    now = datetime.utcnow().isoformat()

    cur = conn.execute(
        """
        INSERT INTO inventory_movements (
            psm_id, applikations_id, typ, menge, einheit, datum,
            notiz, quelle, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            psm_id,
            applikations_id,
            typ,
            menge,
            einheit,
            datum,
            notiz,
            quelle,
            now,
            now,
        ),
    )
    conn.commit()
    return {"ok": True, "id": cur.lastrowid}


def delete_auto_inventory_movements_by_application(applikations_id: int) -> None:
    conn = get_db()
    conn.execute(
        """
        DELETE FROM inventory_movements
        WHERE applikations_id = ?
          AND typ = 'application'
          AND quelle = 'auto_from_application'
        """,
        (applikations_id,),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Inventory – Bewegungen lesen
# ---------------------------------------------------------------------------

def get_inventory_movements(limit: int = 200) -> list[dict]:
    conn = get_db()
    cur = conn.execute(
        """
        SELECT
            im.id,
            im.psm_id,
            p.name          AS psm_name,
            im.applikations_id,
            im.typ,
            im.menge,
            im.einheit,
            im.datum,
            im.notiz,
            im.quelle,
            im.created_at
        FROM inventory_movements im
        LEFT JOIN pflanzenschutzmittel p ON p.id = im.psm_id
        ORDER BY im.datum DESC, im.id DESC
        LIMIT ?
        """,
        (limit,),
    )
    return _rows_to_dicts(cur, cur.fetchall())