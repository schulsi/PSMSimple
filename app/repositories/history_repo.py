import json
from datetime import datetime
from .sqlite import get_db


def list_history(date_from=None, date_to=None):
    conn = get_db()
    query = """
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
        WHERE 1=1
        """
    params = []
    if date_from:
        query += " AND datum >= ?"
        params.append(date_from)

    if date_to:
        query += " AND datum <= ?"
        params.append(date_to)

    query += " ORDER BY datum DESC, uhrzeit DESC, id DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_psm_usage_history(date_from=None, date_to=None):
    conn = get_db()
    query = """
        SELECT
            datum,
            psm_namen,
            json_data
        FROM applikationen
        WHERE psm_namen IS NOT NULL AND psm_namen != ''
        """
    params = []
    if date_from:
        query += " AND datum >= ?"
        params.append(date_from)

    if date_to:
        query += " AND datum <= ?"
        params.append(date_to)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    usage = {}
    for row in rows:
        datum = row['datum']
        psm_list = [name.strip()
                    for name in row['psm_namen'].split(',') if name.strip()]
        try:
            json_data = json.loads(
                row['json_data']) if row['json_data'] else {}
        except json.JSONDecodeError:
            json_data = {}

        psm_details = json_data.get('pflanzenschutzmittel', [])

        for i, psm in enumerate(psm_list):
            if psm not in usage:
                usage[psm] = {'count': 0, 'last_used': None,
                              'total_quantity': 0, 'unit': None}
            usage[psm]['count'] += 1
            if not usage[psm]['last_used'] or datum > usage[psm]['last_used']:
                usage[psm]['last_used'] = datum

            # Add quantity if available
            if i < len(psm_details):
                psm_detail = psm_details[i]
                menge = psm_detail.get('aufwandMenge')
                einheit = psm_detail.get('aufwandEinheit')
                if menge:
                    try:
                        # Remove everything after "/" if present
                        if isinstance(menge, str):
                            menge = menge.split('/')[0].strip()
                        menge_float = round(float(menge), 3)
                        if menge_float > 0:
                            usage[psm]['total_quantity'] += menge_float
                            if not usage[psm]['unit']:
                                # Also remove "/" from unit
                                if isinstance(einheit, str):
                                    einheit = einheit.split('/')[0].strip()
                                usage[psm]['unit'] = einheit or '—'
                    except (ValueError, TypeError):
                        pass

    # Convert to list of dicts
    result = []
    for psm, data in usage.items():
        result.append({
            'psm_name': psm,
            'usage_count': data['count'],
            'last_used': data['last_used'],
            'total_quantity': data['total_quantity'],
            'unit': data['unit']
        })

    # Sort by usage count descending, then by last used descending
    result.sort(key=lambda x: (-x['usage_count'],
                x['last_used'] or ''), reverse=True)
    return result


def get_fields_usage_history(date_from=None, date_to=None):
    conn = get_db()
    query = """
        SELECT
            datum,
            einsatzorte,
            json_data
        FROM applikationen
        WHERE einsatzorte IS NOT NULL AND einsatzorte != ''
        """
    params = []
    if date_from:
        query += " AND datum >= ?"
        params.append(date_from)

    if date_to:
        query += " AND datum <= ?"
        params.append(date_to)

    rows = conn.execute(query, params).fetchall()
    conn.close()

    usage = {}
    for row in rows:
        datum = row['datum']
        field_list = [name.strip()
                      for name in row['einsatzorte'].split(',') if name.strip()]
        try:
            json_data = json.loads(
                row['json_data']) if row['json_data'] else {}
        except json.JSONDecodeError:
            json_data = {}

        field_details = json_data.get('einsatzorte', [])

        for i, field in enumerate(field_list):
            if field not in usage:
                usage[field] = {'count': 0, 'last_used': None,
                                'total_area': 0, 'unit': None}
            usage[field]['count'] += 1
            if not usage[field]['last_used'] or datum > usage[field]['last_used']:
                usage[field]['last_used'] = datum

            # Add area if available
            if i < len(field_details):
                field_detail = field_details[i]
                flaeche = field_detail.get('flaecheVolumen')
                einheit = field_detail.get('einheit')
                if flaeche and isinstance(flaeche, (int, float)):
                    flaeche = round(float(flaeche), 3)
                    usage[field]['total_area'] += flaeche
                    if not usage[field]['unit']:
                        usage[field]['unit'] = einheit or '—'

    # Convert to list of dicts
    result = []
    for field, data in usage.items():
        result.append({
            'field_name': field,
            'usage_count': data['count'],
            'last_used': data['last_used'],
            'total_area': data['total_area'],
            'unit': data['unit']
        })

    # Sort by usage count descending, then by last used descending
    result.sort(key=lambda x: (-x['usage_count'],
                x['last_used'] or ''), reverse=True)
    return result


def get_field_applications(field_name, date_from=None, date_to=None):
    conn = get_db()
    query = """
        SELECT
            id,
            datum,
            uhrzeit,
            json_data
        FROM applikationen
        WHERE einsatzorte LIKE ?
        """
    params = [f'%{field_name}%']
    if date_from:
        query += " AND datum >= ?"
        params.append(date_from)
    if date_to:
        query += " AND datum <= ?"
        params.append(date_to)

    query += " ORDER BY datum DESC, uhrzeit DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    applications = []
    for row in rows:
        try:
            json_data = json.loads(
                row['json_data']) if row['json_data'] else {}
        except json.JSONDecodeError:
            json_data = {}

        # Find the field details in einsatzorte array
        datum = json_data['anwendung']['datum']
        uhrzeit = json_data['anwendung']['uhrzeit']
        field_details = None
        einsatzorte = json_data.get('einsatzorte', [])
        field_list = []
        for row in einsatzorte:
            name = row.get('name', '').strip()
            if name:
                field_list.append(name)

        field_index = None
        for i, name in enumerate(field_list):
            if name == field_name:
                field_index = i
                break

        if field_index is not None and field_index < len(einsatzorte):
            field_details = einsatzorte[field_index]

        # Get PSM details for this application
        psm_details = []
        psm_list = json_data.get('pflanzenschutzmittel', [])

        for psm in psm_list:
            psm_info = {
                'name': psm.get('name', 'Unbekannt'),
                'quantity': psm.get('aufwandMenge'),
                'unit': psm.get('aufwandEinheit'),
                'area': field_details.get('flaecheVolumen') if field_details else None,
                'area_unit': field_details.get('einheit') if field_details else None
            }
            psm_details.append(psm_info)

        applications.append({
            'id': row['id'],
            'date': datum,
            'time': uhrzeit,
            'psm_applications': psm_details
        })

    return applications


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
            anwendung.get("created_at") or datetime.now(
            ).isoformat(timespec="seconds"),
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
