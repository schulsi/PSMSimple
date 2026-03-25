from flask import Flask, render_template, request, jsonify, send_file
import sqlite3
import json
import uuid
from datetime import date
import io
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "templates"))
DB = os.path.join(BASE_DIR, "pflanzenschutz.db")

def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS betrieb (
            id INTEGER PRIMARY KEY,
            firma TEXT, name TEXT, vorname TEXT,
            strHnr TEXT, plz TEXT, ort TEXT,
            bundesland TEXT, guid TEXT
        );

        CREATE TABLE IF NOT EXISTS pflanzenschutzmittel (
            id INTEGER PRIMARY KEY,
            name TEXT, zulassungsnr TEXT,
            wirkstoffe TEXT,
            aufwandEinheit TEXT, bienen TEXT
        );

        CREATE TABLE IF NOT EXISTS einsatzorte (
            id INTEGER PRIMARY KEY,
            name TEXT, gpsRechtswert REAL,
            gpsHochwert REAL, anwendungsbereich TEXT,
            geoTyp TEXT, einheit TEXT, flaecheVolumen REAL
        );

        CREATE TABLE IF NOT EXISTS kulturen (
            id INTEGER PRIMARY KEY,
            name TEXT, eppoCode TEXT
        );
    """)

    if not c.execute("SELECT id FROM betrieb LIMIT 1").fetchone():
        c.execute("""INSERT INTO betrieb (firma,name,vorname,strHnr,plz,ort,bundesland,guid)
                     VALUES (?,?,?,?,?,?,?,?)""",
                  ("Schulz","Schulz","Silas","Am Dreschschopf 4","79268","Bötzingen","BW",
                   str(uuid.uuid4())))

    conn.commit()
    conn.close()

# ── BETRIEB ──────────────────────────────────────────────
@app.route("/api/betrieb", methods=["GET"])
def get_betrieb():
    conn = get_db()
    row = conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})

@app.route("/api/betrieb", methods=["POST"])
def save_betrieb():
    d = request.json
    conn = get_db()
    row = conn.execute("SELECT id FROM betrieb LIMIT 1").fetchone()
    if row:
        conn.execute("""UPDATE betrieb SET firma=?,name=?,vorname=?,strHnr=?,plz=?,ort=?,bundesland=?
                        WHERE id=?""",
                     (d["firma"],d["name"],d["vorname"],d["strHnr"],d["plz"],d["ort"],d["bundesland"],row["id"]))
    else:
        conn.execute("""INSERT INTO betrieb (firma,name,vorname,strHnr,plz,ort,bundesland,guid)
                        VALUES (?,?,?,?,?,?,?,?)""",
                     (d["firma"],d["name"],d["vorname"],d["strHnr"],d["plz"],d["ort"],d["bundesland"],str(uuid.uuid4())))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

# ── PFLANZENSCHUTZMITTEL ─────────────────────────────────
@app.route("/api/psm", methods=["GET"])
def get_psm():
    conn = get_db()
    rows = conn.execute("SELECT * FROM pflanzenschutzmittel ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/psm", methods=["POST"])
def add_psm():
    d = request.json
    conn = get_db()
    conn.execute("""INSERT INTO pflanzenschutzmittel (name,zulassungsnr,wirkstoffe,aufwandEinheit,bienen)
                    VALUES (?,?,?,?,?)""",
                 (d["name"],d["zulassungsnr"],d["wirkstoffe"],d["aufwandEinheit"],d["bienen"]))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/psm/<int:pid>", methods=["PUT"])
def update_psm(pid):
    d = request.json
    conn = get_db()
    conn.execute("""UPDATE pflanzenschutzmittel SET name=?,zulassungsnr=?,wirkstoffe=?,
                    aufwandEinheit=?,bienen=? WHERE id=?""",
                 (d["name"],d["zulassungsnr"],d["wirkstoffe"],d["aufwandEinheit"],d["bienen"],pid))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/psm/<int:pid>", methods=["DELETE"])
def delete_psm(pid):
    conn = get_db()
    conn.execute("DELETE FROM pflanzenschutzmittel WHERE id=?", (pid,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

# ── EINSATZORTE ──────────────────────────────────────────
@app.route("/api/einsatzorte", methods=["GET"])
def get_einsatzorte():
    conn = get_db()
    rows = conn.execute("SELECT * FROM einsatzorte ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/einsatzorte", methods=["POST"])
def add_einsatzort():
    d = request.json
    conn = get_db()
    conn.execute("""INSERT INTO einsatzorte (name,gpsRechtswert,gpsHochwert,anwendungsbereich,geoTyp,einheit,flaecheVolumen)
                    VALUES (?,?,?,?,?,?,?)""",
                 (d["name"],d["gpsRechtswert"],d["gpsHochwert"],d["anwendungsbereich"],d["geoTyp"],d["einheit"],d["flaecheVolumen"]))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/einsatzorte/<int:eid>", methods=["PUT"])
def update_einsatzort(eid):
    d = request.json
    conn = get_db()
    conn.execute("""UPDATE einsatzorte SET name=?,gpsRechtswert=?,gpsHochwert=?,
                    anwendungsbereich=?,geoTyp=?,einheit=?,flaecheVolumen=? WHERE id=?""",
                 (d["name"],d["gpsRechtswert"],d["gpsHochwert"],d["anwendungsbereich"],d["geoTyp"],d["einheit"],d["flaecheVolumen"],eid))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/einsatzorte/<int:eid>", methods=["DELETE"])
def delete_einsatzort(eid):
    conn = get_db()
    conn.execute("DELETE FROM einsatzorte WHERE id=?", (eid,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

# ── KULTUREN ─────────────────────────────────────────────
@app.route("/api/kulturen", methods=["GET"])
def get_kulturen():
    conn = get_db()
    rows = conn.execute("SELECT * FROM kulturen ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route("/api/kulturen", methods=["POST"])
def add_kultur():
    d = request.json
    conn = get_db()
    conn.execute("INSERT INTO kulturen (name,eppoCode) VALUES (?,?)", (d["name"],d["eppoCode"]))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/kulturen/<int:kid>", methods=["PUT"])
def update_kultur(kid):
    d = request.json
    conn = get_db()
    conn.execute("UPDATE kulturen SET name=?,eppoCode=? WHERE id=?", (d["name"],d["eppoCode"],kid))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

@app.route("/api/kulturen/<int:kid>", methods=["DELETE"])
def delete_kultur(kid):
    conn = get_db()
    conn.execute("DELETE FROM kulturen WHERE id=?", (kid,))
    conn.commit(); conn.close()
    return jsonify({"ok": True})

# ── BUILD OUTPUT ─────────────────────────────────────────
def build_output(d, betrieb):
    psm_overrides  = {str(item["id"]): item for item in d.get("psm_overrides", [])}
    kult_overrides = {str(item["id"]): item for item in d.get("kult_overrides", [])}
    eo_ids         = d.get("einsatzort_ids", [])
    anwendung      = d.get("anwendung", {})

    conn = get_db()
    psm_rows, eo_rows, kult_rows = [], [], []

    for sid, override in psm_overrides.items():
        row = conn.execute("SELECT * FROM pflanzenschutzmittel WHERE id=?", (sid,)).fetchone()
        if row:
            r = dict(row)
            psm_rows.append({
                "name":          r["name"],
                "zulassungsnr":  r["zulassungsnr"],
                "wirkstoffe":    r["wirkstoffe"],
                "aufwandEinheit":r["aufwandEinheit"],
                "bienen":        r["bienen"],
                "aufwandMenge":  float(override.get("aufwandMenge", 0)),
            })

    for eid in eo_ids:
        row = conn.execute("SELECT * FROM einsatzorte WHERE id=?", (eid,)).fetchone()
        if row:
            r = dict(row)
            eo_rows.append({k: v for k, v in r.items() if k != "id"})

    for kid, koverride in kult_overrides.items():
        krow = conn.execute("SELECT * FROM kulturen WHERE id=?", (kid,)).fetchone()
        if krow:
            kr = dict(krow)
            kult_rows.append({
                "name":     kr["name"],
                "eppoCode": kr["eppoCode"],
                "bbchCode": koverride.get("bbchCode", ""),
            })

    conn.close()

    return {
        "version": "1",
        "guid": str(uuid.uuid4()),
        "betrieb": {k: betrieb[k] for k in ["firma","name","vorname","strHnr","plz","ort","bundesland","guid"]},
        "einsatzorte": eo_rows,
        "pflanzenschutzmittel": psm_rows,
        "kulturen": kult_rows,
        "zusatzstoffe": [],
        "anwendung": {
            "verantwortlich": anwendung.get("verantwortlich", f"{betrieb['vorname']} {betrieb['name']}"),
            "artVerwendung":  anwendung.get("artVerwendung", ""),
            "anwender":       anwendung.get("anwender", f"{betrieb['vorname']} {betrieb['name']}"),
            "datum":          anwendung.get("datum", str(date.today())),
        }
    }

# ── EXPORT ───────────────────────────────────────────────
@app.route("/api/export", methods=["POST"])
def export_json():
    d = request.json
    conn = get_db()
    betrieb = dict(conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone())
    conn.close()
    output = build_output(d, betrieb)
    buf = io.BytesIO(json.dumps(output, ensure_ascii=False, indent=2).encode("utf-8"))
    buf.seek(0)
    return send_file(buf, mimetype="application/json",
                     as_attachment=True, download_name="pflanzenschutz_export.json")

@app.route("/api/preview", methods=["POST"])
def preview_json():
    d = request.json
    conn = get_db()
    betrieb = dict(conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone())
    conn.close()
    return jsonify(build_output(d, betrieb))

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
