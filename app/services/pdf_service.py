import io
from datetime import date, datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from xml.sax.saxutils import escape
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def ps(name: str, **kwargs):
    return ParagraphStyle(name, **kwargs)


def generate_pdf(data: dict) -> io.BytesIO:
    buf = io.BytesIO()

    betrieb = data.get("betrieb", {})
    anwendung = data.get("anwendung", {})
    einsatzorte = data.get("einsatzorte", [])
    kulturen = data.get("kulturen", [])
    psm_list = data.get("pflanzenschutzmittel", [])

    width, _height = A4
    margin = 18 * mm

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=margin,
        rightMargin=margin,
        topMargin=14 * mm,
        bottomMargin=20 * mm,
    )

    s_title = ps(
        "title",
        fontName="Helvetica-Bold",
        fontSize=13,
        textColor=colors.HexColor("#1a3a2a"),
        spaceAfter=3,
    )
    s_subtitle = ps(
        "subtitle",
        fontName="Helvetica",
        fontSize=8,
        textColor=colors.HexColor("#5a7060"),
        spaceAfter=4,
    )

    b_name_full = f"{betrieb.get('vorname', '')} {betrieb.get('name', '')}".strip()
    b_firma = betrieb.get("firma", "")
    eo_name = einsatzorte[0]["name"] if einsatzorte else ""
    datum_raw = anwendung.get("datum", str(date.today()))
    uhrzeit = anwendung.get("uhrzeit", "")

    try:
        dt = datetime.strptime(datum_raw, "%Y-%m-%d")
        datum_fmt = dt.strftime("%d.%m.%Y")
    except Exception:
        datum_fmt = datum_raw

    now_fmt = datetime.now().strftime("%d.%m.%Y %H:%M")

    gray = colors.HexColor("#ede9df")
    green = colors.HexColor("#2d6a4f")
    text = colors.HexColor("#1c2b22")
    muted = colors.HexColor("#5a7060")
    white = colors.white

    story = []
    col_w = width - 2 * margin

    header_data = [[
        Paragraph(escape("<b>PSM Anwendung</b><br/>"), ps("hl", fontSize=7.5, textColor=muted)),
        Paragraph(escape(f"<b>{b_firma}</b><br/>{b_name_full}"), ps("hr", fontSize=8, alignment=TA_RIGHT)),
    ]]

    header_table = Table(header_data, colWidths=[col_w * 0.5, col_w * 0.5])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1, color=green, spaceAfter=6))

    title_str = f"{datum_fmt} | {eo_name}" if eo_name else datum_fmt
    story.append(Paragraph(escape(f"<b>{title_str}</b>"), s_title))

    erstellt = f"erstellt am: {now_fmt}"
    if uhrzeit:
        erstellt += f" &nbsp;·&nbsp; Uhrzeit Anwendung: {uhrzeit}"
    story.append(Paragraph(erstellt, s_subtitle))
    story.append(Spacer(1, 5 * mm))

    def section_table(rows, first_bold=False):
        table_data = []

        for i, (label, value) in enumerate(rows):
            label_style = ps(
                f"lbl{i}",
                fontName="Helvetica-Bold" if first_bold and i == 0 else "Helvetica",
                fontSize=9,
                textColor=text if first_bold and i == 0 else muted,
            )
            value_style = ps(
                f"val{i}",
                fontName="Helvetica-Bold" if first_bold and i == 0 else "Helvetica",
                fontSize=9,
                textColor=text,
            )
            table_data.append([
                Paragraph(str(label), label_style),
                Paragraph(str(value), value_style),
            ])

        table = Table(table_data, colWidths=[col_w * 0.38, col_w * 0.62])
        style_cmds = [
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LINEBELOW", (0, 0), (-1, -2), 0.4, gray),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [white, colors.HexColor("#fafaf8")]),
        ]

        if first_bold:
            style_cmds += [
                ("FONTNAME", (0, 0), (1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0faf5")),
            ]

        table.setStyle(TableStyle(style_cmds))
        return table

    bl_rows = [
        ("Firma / Betrieb", b_firma),
        ("Name", b_name_full),
        ("Straße", betrieb.get("strHnr", "")),
        ("PLZ / Ort", f"{betrieb.get('plz', '')} {betrieb.get('ort', '')}".strip()),
        ("Bundesland", {
            "BW": "Baden-Württemberg",
            "BY": "Bayern",
            "BE": "Berlin",
            "BB": "Brandenburg",
            "HB": "Bremen",
            "HH": "Hamburg",
            "HE": "Hessen",
            "MV": "Mecklenburg-Vorpommern",
            "NI": "Niedersachsen",
            "NW": "Nordrhein-Westfalen",
            "RP": "Rheinland-Pfalz",
            "SL": "Saarland",
            "SN": "Sachsen",
            "ST": "Sachsen-Anhalt",
            "SH": "Schleswig-Holstein",
            "TH": "Thüringen",
        }.get(betrieb.get("bundesland", ""), betrieb.get("bundesland", ""))),
    ]
    story.append(section_table(bl_rows, first_bold=True))
    story.append(Spacer(1, 3 * mm))

    anw_rows = [
        ("Art der Verwendung", anwendung.get("artVerwendung", "")),
        ("Datum", datum_fmt + (f"  {uhrzeit} Uhr" if uhrzeit else "")),
        ("Anwender/in", anwendung.get("anwender", "")),
        ("Verantwortliche/r", anwendung.get("verantwortlich", "")),
    ]
    story.append(section_table(anw_rows, first_bold=True))
    story.append(Spacer(1, 3 * mm))

    for eo in einsatzorte:
        gps = f"{eo.get('gpsRechtswert', '')} / {eo.get('gpsHochwert', '')}".replace(".", ",")
        eo_rows = [
            ("Feld", eo.get("name", "")),
            ("Anwendungsbereich", eo.get("anwendungsbereich", "")),
            ("Größe", f"{eo.get('flaecheVolumen', '')} {eo.get('einheit', '')}"),
            ("GPS-Koordinaten", gps),
        ]
        story.append(section_table(eo_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    for kultur in kulturen:
        kultur_rows = [
            ("Kultur", kultur.get("name", "")),
            ("EPPO-Code", kultur.get("eppoCode", "")),
            ("BBCH-Stadium", kultur.get("bbchCode", "")),
        ]
        story.append(section_table(kultur_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    for psm in psm_list:
        menge = psm.get("aufwandMenge", "")
        einheit = psm.get("aufwandEinheit", "")
        aufwand = f"{menge} {einheit}".strip() if menge else einheit

        psm_rows = [
            ("Pflanzenschutzmittel", psm.get("name", "")),
            ("Zulassungsnummer", psm.get("zulassungsnr", "")),
            ("Wirkstoffe", psm.get("wirkstoffe", "")),
            ("Bienengefährdung", psm.get("bienen", "")),
            ("Aufwandmenge", aufwand),
        ]
        story.append(section_table(psm_rows, first_bold=True))
        story.append(Spacer(1, 3 * mm))

    def on_page(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(muted)

        footer_left = (
            f"{b_firma}\n"
            f"{betrieb.get('strHnr', '')}, {betrieb.get('plz', '')} {betrieb.get('ort', '')}"
        )

        y = 12 * mm
        for i, line in enumerate(footer_left.split("\n")):
            canvas.drawString(margin, y - i * 9, line)

        canvas.drawRightString(width - margin, y, f"Seite {doc.page} von 1")
        canvas.restoreState()

    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    buf.seek(0)
    return buf