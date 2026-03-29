from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for, flash, send_from_directory
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import json
import uuid
from datetime import date, datetime
import requests
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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PSM_API = "https://psm-api.bvl.bund.de/ords/psm/api-v1/"

app = Flask(__name__, template_folder=os.path.join(BASE_DIR, "templates"))

# ── SECRET KEY (change in production!) ──────────────────
app.secret_key = os.environ.get("SECRET_KEY", "change-me-in-production-supersecretkey")

# ── SQLALCHEMY (user database) ───────────────────────────
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(BASE_DIR, "users.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# ── FLASK-LOGIN ──────────────────────────────────────────
login_manager = LoginManager(app)
login_manager.login_view = "login"           # redirect here if @login_required fails
login_manager.login_message = "Bitte melden Sie sich zuerst an."
login_manager.login_message_category = "error"

# ── USER MODEL ───────────────────────────────────────────
class User(UserMixin, db.Model):
    __tablename__ = "users"
    id       = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ── ORIGINAL SQLITE DB (app data) ────────────────────────
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

def api_to_string(einheit: str):
    if einheit == "GK":
        return "g/kg"
    elif einheit == "GL":
        return "g/l"
    elif einheit == "MD":
        return "ml/dosis"

# ── AUTH ROUTES ──────────────────────────────────────────

@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")
        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for("index"))
        else:
            flash("Ungültiger Benutzername oder Passwort.", "error")

    return render_template("login.html")


@app.route("/register", methods=["POST"])
def register():
    username  = request.form.get("username", "").strip()
    password  = request.form.get("password", "")
    password2 = request.form.get("password2", "")

    if not username or not password:
        flash("Bitte alle Felder ausfüllen.", "error")
        return redirect(url_for("login") + "?tab=register")

    if password != password2:
        flash("Die Passwörter stimmen nicht überein.", "error")
        return redirect(url_for("login") + "?tab=register")

    if len(password) < 6:
        flash("Das Passwort muss mindestens 6 Zeichen lang sein.", "error")
        return redirect(url_for("login") + "?tab=register")

    if User.query.filter_by(username=username).first():
        flash("Dieser Benutzername ist bereits vergeben.", "error")
        return redirect(url_for("login") + "?tab=register")

    new_user = User(
        username=username,
        password=generate_password_hash(password)
    )
    db.session.add(new_user)
    db.session.commit()

    flash(f"Konto für {username} erfolgreich erstellt. Bitte jetzt anmelden.", "success")
    return redirect(url_for("login"))


@app.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Sie wurden abgemeldet.", "success")
    return redirect(url_for("login"))

# ── USER RENAME ──────────────────────────────────────────

@app.route("/api/user/rename", methods=["POST"])
@login_required
def rename_user():
    d = request.json
    new_name = (d.get("username") or "").strip()

    if not new_name:
        return jsonify({"ok": False, "error": "Bitte einen Namen eingeben."})

    if len(new_name) < 2:
        return jsonify({"ok": False, "error": "Mindestens 2 Zeichen erforderlich."})

    # Check if name is already taken by a different user
    existing = User.query.filter_by(username=new_name).first()
    if existing and existing.id != current_user.id:
        return jsonify({"ok": False, "error": "Dieser Benutzername ist bereits vergeben."})

    # Update only the username — all other data (betrieb etc.) stays untouched
    current_user.username = new_name
    db.session.commit()
    return jsonify({"ok": True})

# ── BETRIEB ──────────────────────────────────────────────

@app.route("/api/betrieb", methods=["GET"])
@login_required
def get_betrieb():
    conn = get_db()
    row = conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone()
    conn.close()
    return jsonify(dict(row) if row else {})


@app.route("/api/betrieb", methods=["POST"])
@login_required
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
@login_required
def get_psm():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM pflanzenschutzmittel ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/psm", methods=["POST"])
@login_required
def add_psm():
    d = request.json
    conn = get_db()
    cur = conn.cursor()

    # Check if already exists
    cur.execute(
        "SELECT id FROM pflanzenschutzmittel WHERE zulassungsnr = ?", (d["zulassungsnr"],))
    exists = cur.fetchone()

    if exists:
        conn.close()
        return jsonify({
            "error": "Mittel existiert bereits",
            "existing_id": exists[0]
        }), 409
    conn.execute("""INSERT INTO pflanzenschutzmittel (name,zulassungsnr,wirkstoffe,aufwandEinheit,bienen)
                    VALUES (?,?,?,?,?)""",
                 (d["name"], d["zulassungsnr"], d["wirkstoffe"], d["aufwandEinheit"], d["bienen"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/psm/<int:pid>", methods=["PUT"])
@login_required
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
@login_required
def delete_psm(pid):
    conn = get_db()
    conn.execute("DELETE FROM pflanzenschutzmittel WHERE id=?", (pid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── EINSATZORTE ──────────────────────────────────────────

@app.route("/api/einsatzorte", methods=["GET"])
@login_required
def get_einsatzorte():
    conn = get_db()
    rows = conn.execute("SELECT * FROM einsatzorte ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/einsatzorte", methods=["POST"])
@login_required
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
@login_required
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
@login_required
def delete_einsatzort(eid):
    conn = get_db()
    conn.execute("DELETE FROM einsatzorte WHERE id=?", (eid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── KULTUREN ─────────────────────────────────────────────

@app.route("/api/kulturen", methods=["GET"])
@login_required
def get_kulturen():
    conn = get_db()
    rows = conn.execute("SELECT * FROM kulturen ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/kulturen", methods=["POST"])
@login_required
def add_kultur():
    d = request.json
    conn = get_db()
    conn.execute("INSERT INTO kulturen (name,eppoCode) VALUES (?,?)",
                 (d["name"], d["eppoCode"]))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/kulturen/<int:kid>", methods=["PUT"])
@login_required
def update_kultur(kid):
    d = request.json
    conn = get_db()
    conn.execute("UPDATE kulturen SET name=?,eppoCode=? WHERE id=?",
                 (d["name"], d["eppoCode"], kid))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/kulturen/<int:kid>", methods=["DELETE"])
@login_required
def delete_kultur(kid):
    conn = get_db()
    conn.execute("DELETE FROM kulturen WHERE id=?", (kid,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

# ── PDF / EXPORT HELPERS ─────────────────────────────────
# (unchanged from original — only @login_required added)

def build_output(d, betrieb):
    conn = get_db()

    psm_overrides = {p["id"]: p["aufwandMenge"] for p in d.get("psm_overrides", [])}
    eo_ids        = d.get("einsatzort_ids", [])
    kult_overrides = {k["id"]: k["bbchCode"] for k in d.get("kult_overrides", [])}

    psm_rows = conn.execute(
        f"SELECT * FROM pflanzenschutzmittel WHERE id IN ({','.join('?'*len(psm_overrides)) or 'NULL'})",
        list(psm_overrides.keys())).fetchall() if psm_overrides else []

    eo_rows = conn.execute(
        f"SELECT * FROM einsatzorte WHERE id IN ({','.join('?'*len(eo_ids)) or 'NULL'})",
        eo_ids).fetchall() if eo_ids else []

    kult_rows = conn.execute(
        f"SELECT * FROM kulturen WHERE id IN ({','.join('?'*len(kult_overrides)) or 'NULL'})",
        list(kult_overrides.keys())).fetchall() if kult_overrides else []

    conn.close()

    psm_list = []
    for p in psm_rows:
        entry = dict(p)
        entry["aufwandMenge"] = psm_overrides.get(p["id"], "")
        psm_list.append(entry)

    kult_list = []
    for k in kult_rows:
        entry = dict(k)
        entry["bbchCode"] = kult_overrides.get(k["id"], "")
        kult_list.append(entry)

    return {
        "betrieb": betrieb,
        "pflanzenschutzmittel": psm_list,
        "einsatzorte": [dict(e) for e in eo_rows],
        "kulturen": kult_list,
        "anwendung": d.get("anwendung", {}),
    }


def ps(name, **kwargs):
    return ParagraphStyle(name, **kwargs)


def generate_pdf(data):
    buf = io.BytesIO()
    betrieb  = data.get("betrieb", {})
    anwendung = data.get("anwendung", {})

    W, H   = A4
    margin = 18 * mm
    doc    = SimpleDocTemplate(buf, pagesize=A4,
                               leftMargin=margin, rightMargin=margin,
                               topMargin=14*mm, bottomMargin=20*mm)

    s_title    = ps("title",    fontName="Helvetica-Bold", fontSize=13, textColor=colors.HexColor("#1a3a2a"), spaceAfter=3)
    s_subtitle = ps("subtitle", fontName="Helvetica",      fontSize=8,  textColor=colors.HexColor("#5a7060"), spaceAfter=4)

    einsatzorte = data.get("einsatzorte", [])
    kulturen    = data.get("kulturen", [])
    psm_list    = data.get("pflanzenschutzmittel", [])

    b_name_full = f"{betrieb.get('vorname', '')} {betrieb.get('name', '')}".strip()
    b_firma     = betrieb.get("firma", "")
    eo_name     = einsatzorte[0]["name"] if einsatzorte else ""
    datum_raw   = anwendung.get("datum", str(date.today()))
    uhrzeit     = anwendung.get("uhrzeit", "")

    try:
        dt        = datetime.strptime(datum_raw, "%Y-%m-%d")
        datum_fmt = dt.strftime("%d.%m.%Y")
    except Exception:
        datum_fmt = datum_raw

    now_fmt = datetime.now().strftime("%d.%m.%Y %H:%M")

    GRAY  = colors.HexColor("#ede9df")
    GREEN = colors.HexColor("#2d6a4f")
    TEXT  = colors.HexColor("#1c2b22")
    MUTED = colors.HexColor("#5a7060")
    WHITE = colors.white

    story  = []
    col_w  = W - 2 * margin

    header_data = [[
        Paragraph("<b>PSM  Anwendung</b><br/>", ps("hl", fontSize=7.5, textColor=MUTED)),
        Paragraph(f"<b>{b_firma}</b><br/>{b_name_full}", ps("hr", fontSize=8, alignment=TA_RIGHT)),
    ]]
    ht = Table(header_data, colWidths=[col_w * 0.5, col_w * 0.5])
    ht.setStyle(TableStyle([
        ("VALIGN",         (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 6),
    ]))
    story.append(ht)
    story.append(HRFlowable(width="100%", thickness=1, color=GREEN, spaceAfter=6))

    title_str = f"{datum_fmt} | {eo_name}" if eo_name else datum_fmt
    story.append(Paragraph(f"<b>{title_str}</b>", s_title))
    erstellt = f"erstellt am: {now_fmt}"
    if uhrzeit:
        erstellt += f" &nbsp;·&nbsp; Uhrzeit Anwendung: {uhrzeit}"
    story.append(Paragraph(erstellt, s_subtitle))
    story.append(Spacer(1, 5 * mm))

    def section_table(rows, first_bold=False):
        tdata = []
        for i, (lbl, val) in enumerate(rows):
            label_style = ps(f"lbl{i}", fontName="Helvetica-Bold" if first_bold and i == 0 else "Helvetica",
                             fontSize=9, textColor=TEXT if first_bold and i == 0 else MUTED)
            val_style   = ps(f"val{i}", fontName="Helvetica-Bold" if first_bold and i == 0 else "Helvetica",
                             fontSize=9, textColor=TEXT)
            tdata.append([Paragraph(lbl, label_style), Paragraph(str(val), val_style)])

        t = Table(tdata, colWidths=[col_w * 0.38, col_w * 0.62])
        style_cmds = [
            ("FONTNAME",       (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE",       (0, 0), (-1, -1), 9),
            ("VALIGN",         (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",     (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING",  (0, 0), (-1, -1), 4),
            ("LINEBELOW",      (0, 0), (-1, -2), 0.4, GRAY),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, colors.HexColor("#fafaf8")]),
        ]
        if first_bold:
            style_cmds += [
                ("FONTNAME",   (0, 0), (1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0faf5")),
            ]
        t.setStyle(TableStyle(style_cmds))
        return t

    bl_rows = [
        ("Firma / Betrieb", b_firma),
        ("Name",            b_name_full),
        ("Straße",          betrieb.get("strHnr", "")),
        ("PLZ / Ort",       f"{betrieb.get('plz', '')} {betrieb.get('ort', '')}".strip()),
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

    anw_rows = [
        ("Art der Verwendung", anwendung.get("artVerwendung", "")),
        ("Datum",              datum_fmt + (f"  {uhrzeit} Uhr" if uhrzeit else "")),
        ("Anwender/in",        anwendung.get("anwender", "")),
        ("Verantwortliche/r",  anwendung.get("verantwortlich", "")),
    ]
    story.append(section_table(anw_rows, first_bold=True))
    story.append(Spacer(1, 3 * mm))

    for eo in einsatzorte:
        gps = f"{eo.get('gpsRechtswert', '')} / {eo.get('gpsHochwert', '')}".replace(".", ",")
        eo_rows = [
            ("Einsatzort",        eo.get("name", "")),
            ("Anwendungsbereich", eo.get("anwendungsbereich", "")),
            ("Größe",             f"{eo.get('flaecheVolumen', '')} {eo.get('einheit', '')}"),
            ("GPS-Koordinaten",   gps),
        ]
        story.append(section_table(eo_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    for k in kulturen:
        k_rows = [
            ("Kultur",       k.get("name", "")),
            ("EPPO-Code",    k.get("eppoCode", "")),
            ("BBCH-Stadium", k.get("bbchCode", "")),
        ]
        story.append(section_table(k_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    for psm in psm_list:
        menge   = psm.get("aufwandMenge", "")
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

# ── API ROUTES (protected) ───────────────────────────────

@app.route("/api/pdf", methods=["POST"])
@login_required
def export_pdf():
    d = request.json
    conn = get_db()
    betrieb = dict(conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone())
    conn.close()
    data = build_output(d, betrieb)
    buf  = generate_pdf(data)

    eo_name  = data["einsatzorte"][0]["name"] if data["einsatzorte"] else "export"
    datum    = data["anwendung"]["datum"].replace("-", "")
    psm_slug = data["pflanzenschutzmittel"][0]["name"].replace(" ", "_") if data["pflanzenschutzmittel"] else "PSM"
    filename = f"PSM_Anwendung_{datum}_{psm_slug}_{eo_name}.pdf"

    return send_file(buf, mimetype="application/pdf",
                     as_attachment=True, download_name=filename)


@app.route("/api/export", methods=["POST"])
@login_required
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
@login_required
def preview_json():
    d = request.json
    conn = get_db()
    betrieb = dict(conn.execute("SELECT * FROM betrieb LIMIT 1").fetchone())
    conn.close()
    return jsonify(build_output(d, betrieb))


@app.route('/media/<path:filename>')
def media(filename):
    return send_from_directory('media', filename)

@app.route('/search/psm/<term>')
@login_required
def search_psm(term):
    try:
        resp = requests.get(
            "https://psm-api.bvl.bund.de/ords/psm/api-v1/mittel/",
            params={"q": json.dumps({"MITTELNAME": {"$instr": term}}), "limit": 10},
            timeout=5
        )
        items = resp.json().get("items", [])
        return jsonify([{"name": r["mittelname"], "kennr": r["kennr"]} for r in items])
    except Exception:
        return jsonify([])


@app.route('/api/psm/info/<kennr>')
@login_required
def get_psm_info(kennr: str):
    try:
        wg_resp = requests.get(
            PSM_API + "wirkstoff_gehalt/",
            params={"q": json.dumps({"kennr": {"$eq": kennr}})},
            timeout=5
        ).json()
        items = wg_resp.get("items", [])
        wirkstoffe_parts = []
        for item in items:
            wirkstoff_nr = item.get("wirknr", "")
            menge = item.get("gehalt_rein_grundstruktur", "")
            einheit = api_to_string(item.get("gehalt_einheit", "")) or item.get("gehalt_einheit", "")
            ws_resp = requests.get(
                PSM_API + "wirkstoff/",
                params={"q": json.dumps({"wirknr": {"$eq": wirkstoff_nr}})},
                timeout=5
            ).json()
            ws_items = ws_resp.get("items", [])
            if ws_items:
                ws_name = ws_items[0].get("wirkstoffname", "")
                wirkstoffe_parts.append(f"{ws_name} {menge} {einheit}".strip())
        wirkstoffe = ", ".join(wirkstoffe_parts)
        return jsonify({"wirkstoffe": wirkstoffe, "zulassungsnr": kennr})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
@login_required
def index():
    return render_template("index.html")


# ── STARTUP ──────────────────────────────────────────────
if __name__ == "__main__":
    with app.app_context():
        db.create_all()   # creates users.db + users table
    init_db()             # creates pflanzenschutz.db
    app.run(debug=True, port=5001, host="0.0.0.0")
