import json
from datetime import datetime

from ..config import Config
from ..extensions import cache
from .psm_api_services import _get_bee_class
from .psm_beratung_service import PSMBeratungError, _get, _get_all_items


DETAIL_CACHE_VERSION = "9"


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _cached_bvl_items(path, params_json):
    return _get_all_items(path, params=json.loads(params_json))


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _cached_decode_code(table, field, code):
    code = str(code or "").strip()
    if not code:
        return ""

    try:
        map_data = _get("kodeliste_feldname", params={
            "tabelle": str(table).upper(),
            "feldname": str(field).upper(),
        })
        map_items = map_data.get("items", [])
        kodeliste = ""
        if map_items:
            kodeliste = str(
                map_items[0].get("kodeliste")
                or map_items[0].get("KODELISTE")
                or ""
            ).strip()

        if not kodeliste:
            return code

        kode_data = _get("kode", params={
            "kodeliste": kodeliste,
            "kode": code,
            "sprache": "DE",
        })
        kode_items = kode_data.get("items", [])
        if not kode_items:
            return code

        return str(
            kode_items[0].get("kodetext")
            or kode_items[0].get("KODETEXT")
            or code
        ).strip()
    except PSMBeratungError:
        return code


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _cached_bee_class(kennr):
    return _get_bee_class(Config.PSM_API, kennr)


def get_items(path, params):
    params_json = json.dumps(params or {}, sort_keys=True, separators=(",", ":"))
    return _cached_bvl_items(path, params_json)


def get_optional_items(path, params):
    try:
        return get_items(path, params)
    except PSMBeratungError:
        return []


def decode_code(table, field, code):
    code = str(code or "").strip()
    if not code:
        return ""
    return _cached_decode_code(table, field, code)


def value_from(row, *keys):
    if not row:
        return ""
    lower_map = {str(key).lower(): value for key, value in row.items()}
    for key in keys:
        value = lower_map.get(str(key).lower())
        if value not in (None, ""):
            return str(value).strip()
    return ""


def unique_values(rows, *keys):
    values = []
    seen = set()
    for row in rows:
        value = value_from(row, *keys)
        if value and value not in seen:
            seen.add(value)
            values.append(value)
    return values


def company_name(row):
    if not row:
        return ""
    return value_from(row, "firmenname", "anschrift_1", "firma")


def resolve_company(code="", number=""):
    code = str(code or "").strip()
    number = str(number or "").strip()

    rows = []
    if number:
        rows = get_optional_items("adresse/", {"adresse_nr": number})
    if not rows and code:
        rows = get_optional_items("adresse/", {"firma": code})

    name = company_name(rows[0]) if rows else ""
    if name:
        return name
    return code or number


def format_holder_and_distribution(kennr):
    holder_rows = get_optional_items("antrag/", {"kennr": kennr})
    distribution_rows = get_optional_items("mittel_vertrieb/", {"kennr": kennr})

    holders = []
    for row in holder_rows:
        name = resolve_company(
            value_from(row, "antragsteller"),
            value_from(row, "antragsteller_nr"),
        )
        if name and name not in holders:
            holders.append(name)

    distributors = []
    for row in distribution_rows:
        name = resolve_company(
            value_from(row, "vertriebsfirma"),
            value_from(row, "vertriebsfirma_nr"),
        )
        if name and name not in distributors:
            distributors.append(name)

    lines = []
    if holders:
        lines.append(f"Zulassungsinhaber: {', '.join(holders)}")
    if distributors:
        lines.append(f"Vertrieb: {', '.join(distributors)}")

    return "\n".join(lines) if lines else "Keine Angabe"


def format_wirkungsbereiche(mittel_wirkbereiche, awg, mittel):
    values = []
    seen = set()

    for row in mittel_wirkbereiche:
        code = value_from(row, "wirkungsbereich", "wirkbereich")
        if not code:
            continue
        decoded = decode_code("MITTEL_WIRKBEREICH", "wirkungsbereich", code)
        rendered = decoded if decoded and decoded != code else code
        if rendered and rendered not in seen:
            seen.add(rendered)
            values.append(rendered)

    if values:
        return format_list(values)

    fallback_values = [
        *decoded_values_for_keys([mittel], "MITTEL", "wirkungsbereich", "wirkbereich"),
        *decoded_values_for_keys(awg, "AWG", "wirkungsbereich", "wirkbereich"),
        *unique_values([mittel], "wirkungsbereich", "wirkbereich"),
        *unique_values(awg, "wirkungsbereich", "wirkbereich"),
    ]
    return format_list(fallback_values)


def pretty_label(key):
    labels = {
        "anwendungen_anz_je_befall": "Anwendungen je Befall",
        "anwendungen_anz_je_kultur": "Anwendungen je Kultur",
        "anwendungen_anz_je_jahr": "Anwendungen je Jahr",
        "anwendungen_max_je_vegetation": "Max. Anwendungen je Vegetation",
        "behandlungen_anz_je_befall": "Behandlungen je Befall",
        "behandlungen_anz_je_kultur": "Behandlungen je Kultur",
        "behandlungen_anz_je_jahr": "Behandlungen je Jahr",
        "max_anwendungen": "Max. Anwendungen",
        "max_anzahl_anwendungen": "Max. Anzahl Anwendungen",
        "aufwandmenge": "Aufwandmenge",
        "aufwandeinheit": "Aufwandeinheit",
        "m_aufwand": "Mittel-Aufwand",
        "m_aufwandmenge": "Mittel-Aufwandmenge",
        "m_aufwand_einheit": "Mittel-Aufwandeinheit",
        "w_aufwand_von": "Wasser Aufwand min.",
        "w_aufwand_bis": "Wasser Aufwand max.",
        "w_aufwand_einheit": "Wasser Aufwandeinheit",
        "wartezeit": "Wartezeit",
        "wartezeit_tage": "Wartezeit in Tagen",
        "gesetzt_wartezeit": "Wartezeit in Tagen",
        "gesetzt_wartezeit_bem": "Wartezeit-Bemerkung",
        "erlaeuterung": "Erlaeuterung",
        "stadium": "Stadium",
        "bbch": "BBCH",
        "anwendungszeitpunkt": "Anwendungszeitpunkt",
        "anwendungsbereich": "Anwendungsbereich",
        "anwendungstechnik": "Anwendungstechnik",
        "anwendungsart": "Anwendungsart",
        "einsatzgebiet": "Einsatzgebiet",
        "zeitpunkt": "Zeitpunkt",
    }
    normalized = str(key).lower()
    return labels.get(
        normalized,
        str(key).replace("_", " ").replace("-", " ").strip().capitalize(),
    )


def matching_entries(rows, *needles):
    entries = []
    seen = set()
    for row in rows:
        for key, value in row.items():
            key_l = str(key).lower()
            if value in (None, "") or not any(needle in key_l for needle in needles):
                continue
            if "technik" in key_l or "bereich" in key_l:
                continue
            text = f"{pretty_label(key)}: {value}"
            if text not in seen:
                seen.add(text)
                entries.append(text)
    return entries


def decoded_matching_entries(rows, table, *needles):
    entries = []
    seen = set()
    for row in rows:
        for key, value in row.items():
            key_l = str(key).lower()
            if value in (None, "") or not any(needle in key_l for needle in needles):
                continue
            code = str(value).strip()
            decoded = decode_code(table, key, code)
            rendered = f"{decoded} ({code})" if decoded and decoded != code else code
            text = f"{pretty_label(key)}: {rendered}"
            if text not in seen:
                seen.add(text)
                entries.append(text)
    return entries


def entries_for_keys(rows, *keys):
    entries = []
    seen = set()
    for row in rows:
        lower_map = {str(key).lower(): value for key, value in row.items()}
        for key in keys:
            value = lower_map.get(str(key).lower())
            if value in (None, ""):
                continue
            text = f"{pretty_label(key)}: {value}"
            if text not in seen:
                seen.add(text)
                entries.append(text)
    return entries


def decoded_entries_for_keys(rows, table, *keys):
    entries = []
    seen = set()
    for row in rows:
        lower_map = {str(key).lower(): (key, value) for key, value in row.items()}
        for key in keys:
            original = lower_map.get(str(key).lower())
            if not original:
                continue
            original_key, value = original
            if value in (None, ""):
                continue
            code = str(value).strip()
            decoded = decode_code(table, original_key, code)
            rendered = f"{decoded} ({code})" if decoded and decoded != code else code
            text = f"{pretty_label(original_key)}: {rendered}"
            if text not in seen:
                seen.add(text)
                entries.append(text)
    return entries


def decoded_value_for_key(row, table, key):
    value = value_from(row, key)
    if not value:
        return ""
    decoded = decode_code(table, key, value)
    return decoded if decoded else value


def decoded_values_for_keys(rows, table, *keys):
    values = []
    seen = set()
    for row in rows:
        lower_map = {str(key).lower(): (key, value) for key, value in row.items()}
        for key in keys:
            original = lower_map.get(str(key).lower())
            if not original:
                continue
            original_key, value = original
            if value in (None, ""):
                continue
            code = str(value).strip()
            decoded = decode_code(table, original_key, code)
            rendered = f"{decoded} ({code})" if decoded and decoded != code else code
            if rendered and rendered not in seen:
                seen.add(rendered)
                values.append(rendered)
    return values


def amount_with_unit(value, unit):
    return " ".join(part for part in [str(value or "").strip(), str(unit or "").strip()] if part)


def range_with_unit(value_from_text, value_to_text, unit):
    start = str(value_from_text or "").strip()
    end = str(value_to_text or "").strip()
    if start and end and start != end:
        value = f"{start} - {end}"
    else:
        value = start or end
    return amount_with_unit(value, unit)


def format_aufwand_entries(rows):
    entries = []
    seen = set()

    def add(label, value):
        text = str(value or "").strip()
        if not text:
            return
        entry = f"{label}: {text}"
        if entry not in seen:
            seen.add(entry)
            entries.append(entry)

    for row in rows:
        mittel_unit = decoded_value_for_key(row, "AWG_AUFWAND", "m_aufwand_einheit")
        if not mittel_unit:
            mittel_unit = decoded_value_for_key(row, "AWG_AUFWAND", "aufwandeinheit")
        add("Mittel-Aufwand", amount_with_unit(
            value_from(row, "m_aufwand", "m_aufwandmenge", "aufwandmenge", "aufwand"),
            mittel_unit,
        ))

        wasser_unit = decoded_value_for_key(row, "AWG_AUFWAND", "w_aufwand_einheit")
        add("Wasser-Aufwand", range_with_unit(
            value_from(row, "w_aufwand_von"),
            value_from(row, "w_aufwand_bis"),
            wasser_unit,
        ))

    return entries


def format_wartezeit_value(row):
    value = value_from(row, "gesetzt_wartezeit", "wartezeit", "wartezeit_tage", "wz")
    parts = []

    if value:
        if value.isdigit():
            parts.append(f"{value} {'Tag' if value == '1' else 'Tage'}")
        else:
            decoded = decode_code("AWG_WARTEZEIT", "gesetzt_wartezeit", value)
            parts.append(decoded if decoded and decoded != value else value)

    for field in ("gesetzt_wartezeit_bem", "erlaeuterung"):
        code = value_from(row, field)
        if not code:
            continue
        decoded = decode_code("AWG_WARTEZEIT", field, code)
        text = decoded if decoded and decoded != code else code
        if text and text not in parts:
            parts.append(text)

    return " - ".join(parts)


def format_wartezeit_entries(rows):
    entries = []
    seen = set()

    for row in rows:
        wartezeit = format_wartezeit_value(row)
        if not wartezeit:
            continue

        kultur = (
            decoded_value_for_key(row, "AWG_WARTEZEIT", "kultur")
            or decoded_value_for_key(row, "AWG_WARTEZEIT", "kultur_code")
        )
        nutzung = decoded_value_for_key(row, "AWG_WARTEZEIT", "nutzung")
        anwendungsbereich = decoded_value_for_key(row, "AWG_WARTEZEIT", "anwendungsbereich")
        context = ", ".join(part for part in [kultur, nutzung, anwendungsbereich] if part)
        entry = f"{context}: {wartezeit}" if context else f"Wartezeit: {wartezeit}"

        if entry not in seen:
            seen.add(entry)
            entries.append(entry)

    return entries


def format_list(values, fallback="Keine Angabe"):
    values = [str(value).strip() for value in values if str(value).strip()]
    return ", ".join(values) if values else fallback


def format_unit(value):
    code = str(value or "").strip()
    if not code:
        return ""

    decoded = decode_code("WIRKSTOFF_GEHALT", "gehalt_einheit", code)
    unit = decoded if decoded and decoded != code else code
    normalized = unit.strip()
    compact = normalized.lower().replace(" ", "")

    mapping = {
        "%": "%",
        "prozent": "%",
        "g/l": "g/l",
        "g/ l": "g/l",
        "gl": "g/l",
        "g/kg": "g/kg",
        "g/ kg": "g/kg",
        "gk": "g/kg",
        "mg/l": "mg/l",
        "mg/kg": "mg/kg",
        "ml/l": "ml/l",
        "ml/kg": "ml/kg",
        "ml/dosis": "ml/Dosis",
        "md": "ml/Dosis",
        "g/100g": "g/100 g",
        "g/100ml": "g/100 ml",
    }
    if compact in mapping:
        return mapping[compact]

    text_mapping = {
        "gramm pro liter": "g/l",
        "gramm je liter": "g/l",
        "gramm pro kilogramm": "g/kg",
        "gramm je kilogramm": "g/kg",
        "milligramm pro liter": "mg/l",
        "milligramm je liter": "mg/l",
        "milliliter pro liter": "ml/l",
        "milliliter je liter": "ml/l",
    }
    return text_mapping.get(normalized.lower(), normalized)


def format_lines(values, fallback="Keine Angabe"):
    seen = set()
    lines = []
    for value in values:
        text = str(value).strip()
        if not text or text in seen:
            continue
        seen.add(text)
        lines.append(text)
    return "\n".join(lines) if lines else fallback


def first_text(rows, *keys, fallback="Keine Angabe"):
    return format_list(unique_values(rows, *keys)[:1], fallback=fallback)


def format_date(value, fallback="Keine Angabe"):
    text = str(value or "").strip()
    if not text:
        return fallback

    date_part = text[:10]
    for date_format in ("%Y-%m-%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(date_part, date_format).strftime("%d.%m.%Y")
        except ValueError:
            continue

    return text


def display_name(row, code_keys, text_keys, table=""):
    code = value_from(row, *(code_keys if isinstance(code_keys, (list, tuple)) else [code_keys]))
    text = value_from(row, *(text_keys if isinstance(text_keys, (list, tuple)) else [text_keys]))
    if not text and code and table:
        field = next(
            (
                key for key in (code_keys if isinstance(code_keys, (list, tuple)) else [code_keys])
                if value_from(row, key) == code
            ),
            code_keys[0] if isinstance(code_keys, (list, tuple)) else code_keys,
        )
        text = decode_code(table, field, code)
    if text and code and text != code:
        return f"{text} ({code})"
    return text or code


def named_values(rows, code_keys, text_keys, table=""):
    values = []
    seen = set()
    for row in rows:
        value = display_name(row, code_keys, text_keys, table=table)
        if value and value not in seen:
            seen.add(value)
            values.append(value)
    return values


def join_codes(rows, *keys, table=""):
    entries = []
    seen = set()
    for row in rows:
        code = value_from(row, *keys)
        text = value_from(row, "text", "kodetext", "bezeichnung", "beschreibung", "auflagentext", "hinweistext")
        if not text and code and table:
            field = next((key for key in keys if value_from(row, key) == code), keys[0] if keys else "")
            text = decode_code(table, field, code)
        entry = " - ".join(part for part in [code, text] if part)
        if entry and entry not in seen:
            seen.add(entry)
            entries.append(entry)
    return entries


def format_wirkstoffe(gehalte, stoffe):
    stoff_by_nr = {}
    for stoff in stoffe:
        nr = value_from(stoff, "wirknr")
        name = value_from(stoff, "wirkstoffname", "name")
        if nr and name:
            stoff_by_nr[nr] = name

    result = []
    for gehalt in gehalte:
        nr = value_from(gehalt, "wirknr")
        name = stoff_by_nr.get(nr) or nr
        menge = value_from(gehalt, "gehalt_rein_grundstruktur", "gehalt", "menge")
        einheit = format_unit(value_from(gehalt, "gehalt_einheit", "einheit"))
        result.append(" ".join(part for part in [name, menge, einheit] if part))
    return result


def bee_class(kennr):
    labels = {
        "B1": "B1 - Bienengefährlich",
        "B2": "B2 - Bienengefährlich außer nach dem täglichen Bienenflug",
        "B3": "B3 - Bienengefährlich, Anwendungsverbot",
        "B4": "B4 - Nicht bienengefährlich",
    }
    try:
        classes = _cached_bee_class(kennr).split(",")
    except Exception:
        classes = []
    values = [labels.get(value.strip(), value.strip()) for value in classes if value.strip()]
    return format_list(values)


def filtered_codes(rows, prefixes, table=""):
    result = []
    for row in rows:
        code = value_from(row, "auflage", "hinweis", "kode", "code").upper()
        if any(code.startswith(prefix) for prefix in prefixes):
            text = value_from(row, "text", "kodetext", "bezeichnung", "beschreibung", "auflagentext", "hinweistext")
            if not text and table:
                field = next(
                    (
                        key for key in ("auflage", "hinweis", "kode", "code")
                        if value_from(row, key).upper() == code
                    ),
                    "auflage",
                )
                text = decode_code(table, field, code)
            result.append(" - ".join(part for part in [code, text] if part))
    return result


def items_for_awg_ids(path, ids):
    items = []
    for current_awg_id in ids:
        items.extend(get_optional_items(path, {"awg_id": current_awg_id}))
    return items


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _build_mittel_detail_cached(kennr, awg_id="", cache_version=DETAIL_CACHE_VERSION):
    mittel_items = get_items("mittel/", {"kennr": kennr})
    mittel_wirkbereiche = get_optional_items("mittel_wirkbereich/", {"kennr": kennr})
    wirkstoff_gehalt = get_items("wirkstoff_gehalt/", {"kennr": kennr})
    wirkstoffe = []

    for gehalt in wirkstoff_gehalt:
        wirknr = gehalt.get("wirknr") or gehalt.get("WIRKNR")
        if not wirknr:
            continue
        wirkstoffe.extend(get_items("wirkstoff/", {"wirknr": wirknr}))

    all_awg = get_items("awg/", {"kennr": kennr})
    awg = get_items("awg/", {"awg_id": awg_id}) if awg_id else all_awg
    all_awg_ids = list(dict.fromkeys(
        current_id
        for current_id in (value_from(row, "awg_id") for row in all_awg)
        if current_id
    ))
    awg_aufwand = get_items("awg_aufwand/", {"awg_id": awg_id}) if awg_id else []
    awg_wartezeit = get_items("awg_wartezeit/", {"awg_id": awg_id}) if awg_id else []
    awg_kultur = get_items("awg_kultur/", {"awg_id": awg_id}) if awg_id else []
    awg_schadorg = get_items("awg_schadorg/", {"awg_id": awg_id}) if awg_id else []
    all_awg_kultur = items_for_awg_ids("awg_kultur/", all_awg_ids)
    all_awg_schadorg = items_for_awg_ids("awg_schadorg/", all_awg_ids)
    auflagen = get_items("auflagen", {"ebene": awg_id or kennr})
    hinweise = get_items("hinweis", {"ebene": awg_id or kennr})
    anwendungsbestimmungen = (
        get_optional_items("anwendungsbestimmungen", {"awg_id": awg_id})
        or get_optional_items("awg_anwendungsbestimmungen/", {"awg_id": awg_id})
        if awg_id else []
    )
    all_rules = [*anwendungsbestimmungen, *auflagen, *hinweise]
    mittel = mittel_items[0] if mittel_items else {}
    bvl_source_url = f"{Config.PSM_API.rstrip('/')}/mittel/?kennr={kennr}"

    structured = {
        "title": first_text([mittel], "mittelname", "handelsbezeichnung", fallback=kennr),
        "subtitle": f"Zulassungsnummer {kennr}",
        "source_url": bvl_source_url,
        "facts": [
            {"label": "Name / Handelsbezeichnung", "value": first_text([mittel], "mittelname", "handelsbezeichnung", fallback=kennr)},
            {"label": "Zulassungsnummer", "value": kennr},
            {"label": "Zulassungsinhaber / Vertrieb", "value": format_holder_and_distribution(kennr)},
            {"label": "Zulassungsende", "value": format_date(value_from(mittel, "zul_ende", "zulassungsende", "gueltig_bis"))},
            {"label": "Wirkungsbereich", "value": format_wirkungsbereiche(mittel_wirkbereiche, awg, mittel)},
            {"label": "Bienengefährlichkeit", "value": bee_class(kennr)},
        ],
        "groups": [
            {
                "title": "Wirkstoffe",
                "items": [{"label": "Wirkstoffe + Gehalt", "value": format_list(format_wirkstoffe(wirkstoff_gehalt, wirkstoffe))}],
            },
            {
                "title": "Zulassung und Einsatz",
                "items": [
                    {"label": "Kulturen", "value": format_lines([
                        *named_values(
                            all_awg_kultur or awg_kultur,
                            ("kultur", "kultur_code", "kode", "code"),
                            ("kultur_text", "kultur_name", "bezeichnung", "text", "kodetext"),
                            table="AWG_KULTUR",
                        ),
                        *named_values(
                            all_awg,
                            ("kultur", "kultur_code"),
                            ("kultur_text", "kultur_name", "bezeichnung"),
                            table="AWG",
                        ),
                    ])},
                    {"label": "Schadorganismen", "value": format_lines([
                        *named_values(
                            all_awg_schadorg or awg_schadorg,
                            ("schadorg", "schadorganismus", "schadorg_code", "kode", "code"),
                            ("schadorg_text", "schadorganismus_text", "bezeichnung", "text", "kodetext"),
                            table="AWG_SCHADORG",
                        ),
                        *named_values(
                            all_awg,
                            ("schadorg", "schadorganismus"),
                            ("schadorg_text", "schadorganismus_text", "bezeichnung"),
                            table="AWG",
                        ),
                    ])},
                    {"label": "Anwendungszeitpunkt", "value": format_lines([
                        *decoded_entries_for_keys(awg, "AWG", "anwendungszeitpunkt", "zeitpunkt", "bbch", "stadium"),
                        *decoded_matching_entries(awg, "AWG", "zeitpunkt", "bbch", "stadium"),
                    ])},
                    {"label": "Max. Anwendungen", "value": format_lines([
                        *entries_for_keys(
                            awg,
                            "anwendungen_anz_je_befall",
                            "anwendungen_anz_je_kultur",
                            "anwendungen_anz_je_jahr",
                            "anwendungen_max_je_vegetation",
                            "behandlungen_anz_je_befall",
                            "behandlungen_anz_je_kultur",
                            "behandlungen_anz_je_jahr",
                            "max_anwendungen",
                            "max_anzahl_anwendungen",
                            "maximale_anwendungen",
                            "anzahl_anwendungen",
                            "max_awg",
                        ),
                        *matching_entries(awg, "max", "behandl"),
                    ])},
                    {"label": "Aufwandmenge", "value": format_lines([
                        *format_aufwand_entries(awg_aufwand),
                    ])},
                    {"label": "Wartezeiten", "value": format_lines([
                        *format_wartezeit_entries(awg_wartezeit),
                    ])},
                ],
            },
            {
                "title": "Auflagen und Schutz",
                "items": [
                    {"label": "Anwendungsbestimmungen", "value": format_lines(
                        join_codes(anwendungsbestimmungen, "anwendungsbestimmung", "auflage", "hinweis", "kode", "code", table="ANWENDUNGSBESTIMMUNGEN")
                        or join_codes(all_rules, "anwendungsbestimmung", "auflage", "hinweis", "kode", "code", table="AUFLAGEN")
                    )},
                    {"label": "Auflagen", "value": format_lines(join_codes(auflagen, "auflage", "kode", "code", table="AUFLAGEN"))},
                    {"label": "Gewässerschutz-/Abstandsauflagen", "value": format_lines(filtered_codes(all_rules, ["NW", "NG", "NT", "VA"], table="AUFLAGEN"))},
                ],
            },
        ],
    }

    return {
        "ok": True,
        "kennr": kennr,
        "awg_id": awg_id,
        "detail": structured,
    }


def build_mittel_detail(kennr, awg_id=""):
    return _build_mittel_detail_cached(kennr, awg_id, DETAIL_CACHE_VERSION)
