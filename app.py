from flask import Flask, render_template, request, jsonify, send_file
import sqlite3
import json
import uuid
from datetime import date
import io
import os

# Needed for PDF creation
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from datetime import datetime

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
                  ("Schulz", "Schulz", "Silas", "Am Dreschschopf 4", "79268", "Bötzingen", "BW",
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
                     (d["firma"], d["name"], d["vorname"], d["strHnr"], d["plz"], d["ort"], d["bundesland"], row["id"]))
    else:
        conn.execute("""INSERT INTO betrieb (firma,name,vorname,strHnr,plz,ort,bundesland,guid)
                        VALUES (?,?,?,?,?,?,?,?)""",
                     (d["firma"], d["name"], d["vorname"], d["strHnr"], d["plz"], d["ort"], d["bundesland"], str(uuid.uuid4())))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── PFLANZENSCHUTZMITTEL ─────────────────────────────────


@app.route("/api/psm", methods=["GET"])
def get_psm():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM pflanzenschutzmittel ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/psm", methods=["POST"])
def add_psm():
    d = request.json
    conn = get_db()
    conn.execute("""INSERT INTO pflanzenschutzmittel (name,zulassungsnr,wirkstoffe,aufwandEinheit,bienen)
                    VALUES (?,?,?,?,?)""",
                 (d["name"], d["zulassungsnr"], d["wirkstoffe"], d["aufwandEinheit"], d["bienen"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/psm/<int:pid>", methods=["PUT"])
def update_psm(pid):
    d = request.json
    conn = get_db()
    conn.execute("""UPDATE pflanzenschutzmittel SET name=?,zulassungsnr=?,wirkstoffe=?,
                    aufwandEinheit=?,bienen=? WHERE id=?""",
                 (d["name"], d["zulassungsnr"], d["wirkstoffe"], d["aufwandEinheit"], d["bienen"], pid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/psm/<int:pid>", methods=["DELETE"])
def delete_psm(pid):
    conn = get_db()
    conn.execute("DELETE FROM pflanzenschutzmittel WHERE id=?", (pid,))
    conn.commit()
    conn.close()
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
                 (d["name"], d["gpsRechtswert"], d["gpsHochwert"], d["anwendungsbereich"], d["geoTyp"], d["einheit"], d["flaecheVolumen"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/einsatzorte/<int:eid>", methods=["PUT"])
def update_einsatzort(eid):
    d = request.json
    conn = get_db()
    conn.execute("""UPDATE einsatzorte SET name=?,gpsRechtswert=?,gpsHochwert=?,
                    anwendungsbereich=?,geoTyp=?,einheit=?,flaecheVolumen=? WHERE id=?""",
                 (d["name"], d["gpsRechtswert"], d["gpsHochwert"], d["anwendungsbereich"], d["geoTyp"], d["einheit"], d["flaecheVolumen"], eid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/einsatzorte/<int:eid>", methods=["DELETE"])
def delete_einsatzort(eid):
    conn = get_db()
    conn.execute("DELETE FROM einsatzorte WHERE id=?", (eid,))
    conn.commit()
    conn.close()
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
    conn.execute("INSERT INTO kulturen (name,eppoCode) VALUES (?,?)",
                 (d["name"], d["eppoCode"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/kulturen/<int:kid>", methods=["PUT"])
def update_kultur(kid):
    d = request.json
    conn = get_db()
    conn.execute("UPDATE kulturen SET name=?,eppoCode=? WHERE id=?",
                 (d["name"], d["eppoCode"], kid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/kulturen/<int:kid>", methods=["DELETE"])
def delete_kultur(kid):
    conn = get_db()
    conn.execute("DELETE FROM kulturen WHERE id=?", (kid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── BUILD OUTPUT ─────────────────────────────────────────


def build_output(d, betrieb):
    psm_overrides = {
        str(item["id"]): item for item in d.get("psm_overrides", [])}
    kult_overrides = {
        str(item["id"]): item for item in d.get("kult_overrides", [])}
    eo_ids = d.get("einsatzort_ids", [])
    anwendung = d.get("anwendung", {})

    conn = get_db()
    psm_rows, eo_rows, kult_rows = [], [], []

    for sid, override in psm_overrides.items():
        row = conn.execute(
            "SELECT * FROM pflanzenschutzmittel WHERE id=?", (sid,)).fetchone()
        if row:
            r = dict(row)
            psm_rows.append({
                "name":          r["name"],
                "zulassungsnr":  r["zulassungsnr"],
                "wirkstoffe":    r["wirkstoffe"],
                "aufwandEinheit": r["aufwandEinheit"],
                "bienen":        r["bienen"],
                "aufwandMenge":  float(override.get("aufwandMenge", 0)),
            })

    for eid in eo_ids:
        row = conn.execute(
            "SELECT * FROM einsatzorte WHERE id=?", (eid,)).fetchone()
        if row:
            r = dict(row)
            eo_rows.append({k: v for k, v in r.items() if k != "id"})

    for kid, koverride in kult_overrides.items():
        krow = conn.execute(
            "SELECT * FROM kulturen WHERE id=?", (kid,)).fetchone()
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
        "betrieb": {k: betrieb[k] for k in ["firma", "name", "vorname", "strHnr", "plz", "ort", "bundesland", "guid"]},
        "einsatzorte": eo_rows,
        "pflanzenschutzmittel": psm_rows,
        "kulturen": kult_rows,
        "zusatzstoffe": [],
        "anwendung": {
            "verantwortlich": anwendung.get("verantwortlich", f"{betrieb['vorname']} {betrieb['name']}"),
            "artVerwendung":  anwendung.get("artVerwendung", ""),
            "anwender":       anwendung.get("anwender", f"{betrieb['vorname']} {betrieb['name']}"),
            "datum":          anwendung.get("datum", str(date.today())),
            "uhrzeit":        anwendung.get("uhrzeit", ""),
        }
    }
# ── PDF EXPORT ────────────────────────────────────────────


def generate_pdf(data):
    buf = io.BytesIO()
    W, H = A4
    margin = 20 * mm

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=margin, rightMargin=margin,
        topMargin=16 * mm, bottomMargin=20 * mm,
    )

    # ── Styles ──
    def ps(name, **kw):
        defaults = dict(fontName="Helvetica", fontSize=9, leading=12,
                        textColor=colors.HexColor("#1c2b22"))
        defaults.update(kw)
        return ParagraphStyle(name, **defaults)

    s_normal = ps("normal")
    s_bold = ps("bold",   fontName="Helvetica-Bold")
    s_small = ps("small",  fontSize=7.5, textColor=colors.HexColor("#5a7060"))
    s_title = ps("title",  fontSize=13, fontName="Helvetica-Bold", leading=16)
    s_subtitle = ps("sub",    fontSize=8,
                    textColor=colors.HexColor("#5a7060"))
    s_right = ps("right",  alignment=TA_RIGHT,
                 fontName="Helvetica-Bold", fontSize=8)
    s_right_sm = ps("rightsm", alignment=TA_RIGHT, fontSize=7.5,
                    textColor=colors.HexColor("#5a7060"))

    betrieb = data.get("betrieb", {})
    anwendung = data.get("anwendung", {})
    einsatzorte = data.get("einsatzorte", [])
    kulturen = data.get("kulturen", [])
    psm_list = data.get("pflanzenschutzmittel", [])

    b_name_full = f"{betrieb.get('vorname', '')} {betrieb.get('name', '')}".strip(
    )
    b_firma = betrieb.get("firma", "")
    eo_name = einsatzorte[0]["name"] if einsatzorte else ""
    datum_raw = anwendung.get("datum", str(date.today()))
    uhrzeit = anwendung.get("uhrzeit", "")

    # format date dd.mm.yyyy
    try:
        dt = datetime.strptime(datum_raw, "%Y-%m-%d")
        datum_fmt = dt.strftime("%d.%m.%Y")
    except:
        datum_fmt = datum_raw

    now_fmt = datetime.now().strftime("%d.%m.%Y %H:%M")

    GRAY = colors.HexColor("#ede9df")
    GREEN = colors.HexColor("#2d6a4f")
    TEXT = colors.HexColor("#1c2b22")
    MUTED = colors.HexColor("#5a7060")
    WHITE = colors.white

    story = []
    col_w = (W - 2 * margin)

    # ── Header table (logo left, betrieb right) ──
    header_data = [[
        Paragraph("<b>PSM  Anwendung</b><br/>",
                  ps("hl", fontSize=7.5, textColor=MUTED)),
        Paragraph(f"<b>{b_firma}</b><br/>{b_name_full}",
                  ps("hr", fontSize=8, alignment=TA_RIGHT)),
    ]]
    ht = Table(header_data, colWidths=[col_w * 0.5, col_w * 0.5])
    ht.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(ht)
    story.append(HRFlowable(width="100%", thickness=1,
                 color=GREEN, spaceAfter=6))

    # ── Title ──
    title_str = f"{datum_fmt} | {eo_name}" if eo_name else datum_fmt
    story.append(Paragraph(f"<b>{title_str}</b>", s_title))
    erstellt = f"erstellt am: {now_fmt}"
    if uhrzeit:
        erstellt += f" &nbsp;·&nbsp; Uhrzeit Anwendung: {uhrzeit}"
    story.append(Paragraph(erstellt, s_subtitle))
    story.append(Spacer(1, 5 * mm))

    # ── Helper: section table ──
    def section_table(rows, first_bold=False):
        """rows = list of (label, value) tuples"""
        tdata = []
        for i, (lbl, val) in enumerate(rows):
            label_style = ps(f"lbl{i}", fontName="Helvetica-Bold" if first_bold and i == 0 else "Helvetica",
                             fontSize=9, textColor=TEXT if first_bold and i == 0 else MUTED)
            val_style = ps(f"val{i}", fontName="Helvetica-Bold" if first_bold and i == 0 else "Helvetica",
                           fontSize=9, textColor=TEXT)
            tdata.append([Paragraph(lbl, label_style),
                         Paragraph(str(val), val_style)])

        t = Table(tdata, colWidths=[col_w * 0.38, col_w * 0.62])
        style_cmds = [
            ("FONTNAME",      (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW",     (0, 0), (-1, -2), 0.4, GRAY),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1),
             [WHITE, colors.HexColor("#fafaf8")]),
        ]
        if first_bold:
            style_cmds += [
                ("FONTNAME",      (0, 0), (1, 0), "Helvetica-Bold"),
                ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#f0faf5")),
            ]
        t.setStyle(TableStyle(style_cmds))
        return t

    # ── Betrieb section ──
    bl_rows = [
        ("Firma / Betrieb", b_firma),
        ("Name",            b_name_full),
        ("Straße",          betrieb.get("strHnr", "")),
        ("PLZ / Ort",
         f"{betrieb.get('plz', '')} {betrieb.get('ort', '')}".strip()),
        ("Bundesland",      {
            "BW": "Baden-Württemberg", "BY": "Bayern", "BE": "Berlin", "BB": "Brandenburg",
            "HB": "Bremen", "HH": "Hamburg", "HE": "Hessen", "MV": "Mecklenburg-Vorpommern",
            "NI": "Niedersachsen", "NW": "Nordrhein-Westfalen", "RP": "Rheinland-Pfalz",
            "SL": "Saarland", "SN": "Sachsen", "ST": "Sachsen-Anhalt",
            "SH": "Schleswig-Holstein", "TH": "Thüringen"
        }.get(betrieb.get("bundesland", ""), betrieb.get("bundesland", ""))),
    ]
    story.append(section_table(bl_rows, first_bold=True))
    story.append(Spacer(1, 3 * mm))

    # ── Anwendung section ──
    anw_rows = [
        ("Art der Verwendung", anwendung.get("artVerwendung", "")),
        ("Datum",              datum_fmt +
         (f"  {uhrzeit} Uhr" if uhrzeit else "")),
        ("Anwender/in",        anwendung.get("anwender", "")),
        ("Verantwortliche/r",  anwendung.get("verantwortlich", "")),
    ]
    story.append(section_table(anw_rows, first_bold=True))
    story.append(Spacer(1, 3 * mm))

    # ── Einsatzorte ──
    for eo in einsatzorte:
        gps = f"{eo.get('gpsRechtswert', '')} / {eo.get('gpsHochwert', '')}".replace(".", ",")
        eo_rows = [
            ("Einsatzort",        eo.get("name", "")),
            ("Anwendungsbereich", eo.get("anwendungsbereich", "")),
            ("Größe",
             f"{eo.get('flaecheVolumen', '')} {eo.get('einheit', '')}"),
            ("GPS-Koordinaten",   gps),
        ]
        story.append(section_table(eo_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    # ── Kulturen ──
    for k in kulturen:
        k_rows = [
            ("Kultur",       k.get("name", "")),
            ("EPPO-Code",    k.get("eppoCode", "")),
            ("BBCH-Stadium", k.get("bbchCode", "")),
        ]
        story.append(section_table(k_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    # ── PSM ──
    for psm in psm_list:
        menge = psm.get("aufwandMenge", "")
        einheit = psm.get("aufwandEinheit", "")
        aufwand = f"{menge} {einheit}".strip() if menge else einheit
        psm_rows = [
            ("Pflanzenschutzmittel", psm.get("name", "")),
            ("Zulassungsnummer",     psm.get("zulassungsnr", "")),
            ("Wirkstoffe",           psm.get("wirkstoffe", "")),
            ("Bienengefährdung",     psm.get("bienen", "")),
            ("Aufwandmenge",         aufwand),
        ]
        story.append(section_table(psm_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    # ── Footer ──
    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        footer_left = f"{b_firma}\n{betrieb.get('strHnr', '')}, {betrieb.get('plz', '')} {betrieb.get('ort', '')}"
        y = 12 * mm
        for i, line in enumerate(footer_left.split("\n")):
            canvas.drawString(margin, y - i * 9, line)
        canvas.drawRightString(W - margin, y, f"Seite {doc.page} von 1")
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    buf.seek(0)
    return buf


@app.route("/api/pdf", methods=["POST"])
def export_pdf():
    d = request.json
    conn = get_db()
    betrieb = dict(conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone())
    conn.close()
    data = build_output(d, betrieb)
    buf = generate_pdf(data)

    eo_name = data["einsatzorte"][0]["name"] if data["einsatzorte"] else "export"
    datum = data["anwendung"]["datum"].replace("-", "")
    psm_slug = data["pflanzenschutzmittel"][0]["name"].replace(
        " ", "_") if data["pflanzenschutzmittel"] else "PSM"
    filename = f"PSM_Anwendung_{datum}_{psm_slug}_{eo_name}.pdf"

    return send_file(buf, mimetype="application/pdf",
                     as_attachment=True, download_name=filename)

# ── EXPORT ───────────────────────────────────────────────


@app.route("/api/export", methods=["POST"])
def export_json():
    d = request.json
    conn = get_db()
    betrieb = dict(conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone())
    conn.close()
    output = build_output(d, betrieb)
    buf = io.BytesIO(json.dumps(
        output, ensure_ascii=False, indent=2).encode("utf-8"))
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
    app.run(debug=True, port=5000, host="0.0.0.0")
