from flask import Blueprint, jsonify, request, Response
import json
from ..config import Config
from ..models import Kulturen

from ..services.psm_beratung_service import (
    PSMBeratungError,
    suche_mittel,
    _get,
    _get_all_items,
    _suche_schadorg_kodes,
    _get_kultur_awg_ids,
    _get_schad_awg_ids,
    _is_schad_cached,
    _format_historie,
    _format_mittel,
    suche_mittel_stream,
    )
from .einsatzorte import cord2plz
from ..repositories.orte_repo import get_ort_by_id
from ..services.weather_service import fetch_forecast
from ..utils.weather_utils import build_windows, SprayThresholds       
from ..services.llm_service import llm_query, LLMError
from ..services.permissions import login_required
from ..repositories.settings_repo import get_setting

bp = Blueprint("beratung", __name__)


@bp.get("/api/beratung/schadorganismen")
@login_required
def get_schadorganismen():
    """
    Schadorganismen abrufen
    ---
    tags:
      - Beratung
    parameters:
      - in: kultur_id
        name: kid
        type: integer
        required: true
        description: Kultur-ID
      - in: search_term
        name: search_term
        type: string
        required: true
        description: Suchbegiff
    responses:
      200:
        description: Erfolgreich abgerufen
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    q = request.args.get("q", "").strip()
    kultur_id = request.args.get("kultur_id")

    if len(q) < 2:
        return jsonify({"ok": False, "message": "Mindestens 2 Zeichen eingeben"}), 400

    eppo_code = None
    if kultur_id:
        kultur = Kulturen.query.get(int(kultur_id))
        if kultur and kultur.eppoCode:
            eppo_code = kultur.eppoCode

    try:

        schad_data = _suche_schadorg_kodes(q)

        if not schad_data:
            return jsonify({"ok": True, "items": [], "partial": False})

        cached_items = []
        pending_items = []

        if eppo_code:
            kultur_awg_ids = _get_kultur_awg_ids(eppo_code)
            for item in schad_data:
                if _is_schad_cached(item["kode"]):
                    awg_ids = _get_schad_awg_ids(item["kode"])
                    if awg_ids & kultur_awg_ids:
                        cached_items.append({
                            "kode": item["kode"],
                            "bezeichnung": item["kodetext"]
                        })
                else:
                    pending_items.append(item["kode"])
        else:
            cached_items = [
                {"kode": i["kode"], "bezeichnung": i["kodetext"]}
                for i in schad_data
            ]

        return jsonify({
            "ok": True,
            "items": sorted(cached_items, key=lambda x: x["bezeichnung"]),
            "partial": len(pending_items) > 0,
            "pending_kodes": pending_items,  # Frontend pollt diese nach
        })

    except PSMBeratungError as e:
        return jsonify({"ok": False, "message": str(e)}), 502

@bp.get("/api/beratung/schadorganismen/resolve")
@login_required  
def resolve_schadorganismen():
    """
    Lädt ungecachte Kodes nach
    ---
    tags:
      - Beratung
    parameters:
      - in: kodes
        name: kodes
        type: List
        required: true
        description: List of Kodes
      - in: kultur_id
        name: kid
        type: integer
        required: true
        description: Kultur ID
    responses:
      200:
        description: Erfolgreich abgerufen
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    kodes = request.args.get("kodes", "").split(",")
    kultur_id = request.args.get("kultur_id")
    kodes = [k.strip() for k in kodes if k.strip()]

    if not kodes:
        return jsonify({"ok": True, "items": []})

    eppo_code = None
    if kultur_id:
        kultur = Kulturen.query.get(int(kultur_id))
        if kultur and kultur.eppoCode:
            eppo_code = kultur.eppoCode

    try:
        items = []
        kultur_awg_ids = _get_kultur_awg_ids(eppo_code) if eppo_code else None

        for kode in kodes:
            awg_ids = _get_schad_awg_ids(kode)  # lädt + cacht jetzt
            if kultur_awg_ids is None or (awg_ids & kultur_awg_ids):
                # Bezeichnung aus Kodeliste holen

                data = _get("kode/", params={
                    "q": json.dumps({
                        "KODE": {"$eq": kode},
                        "KODELISTE": {"$eq": "947"},
                        "SPRACHE": {"$eq": "DE"}
                    })
                })
                kode_items = data.get("items", [])
                if kode_items:
                    items.append({
                        "kode": kode,
                        "bezeichnung": kode_items[0]["kodetext"]
                    })

        return jsonify({"ok": True, "items": items})

    except PSMBeratungError as e:
        return jsonify({"ok": False, "message": str(e)}), 502

@bp.post("/api/beratung/mittel")
@login_required
def get_mittel_empfehlung():
    """
    Gibt zugelassene Mittel für Kultur + Schadorganismus zurück.
    ---
    tags:
      - Beratung
    parameters:
      - in: schadorg_kode
        name: code
        type: string
        required: true
        description: Schadorganismus Code
      - in: kultur_id
        name: kid
        type: integer
        required: true
        description: Kultur ID
    responses:
      200:
        description: Erfolgreich abgerufen
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"ok": False, "message": "Keine Daten"}), 400

    kultur_id = data.get("kultur_id")
    schadorg_kode = data.get("schadorg_kode")

    if not kultur_id or not schadorg_kode:
        return jsonify({"ok": False, "message": "kultur_id und schadorg_kode erforderlich"}), 400

    kultur = Kulturen.query.get(kultur_id)
    if not kultur:
        return jsonify({"ok": False, "message": "Kultur nicht gefunden"}), 404

    if not kultur.eppoCode:
        return jsonify({"ok": False, "message": f"Kultur '{kultur.name}' hat keinen EPPO-Code"}), 400

    try:
        mittel = suche_mittel(
            eppo_code=kultur.eppoCode,
            schadorg_kode=schadorg_kode,
        )
        return jsonify({
            "ok": True,
            "kultur": kultur.to_dict(),
            "schadorg_kode": schadorg_kode,
            "mittel": [m.to_dict() for m in mittel],
            "anzahl": len(mittel),
        })
    except PSMBeratungError as e:
        return jsonify({"ok": False, "message": str(e)}), 502
    
@bp.post("/api/beratung/empfehlung")
@login_required
def get_empfehlung():
    """
    Gibt AI Empfehlung für PSM zurück.
    ---
    tags:
      - Beratung
    parameters:
      - in: schadorg_kode
        name: code
        type: string
        required: true
        description: Schadorganismus Code
      - in: kultur_id
        name: kid
        type: integer
        required: true
        description: Kultur ID
    responses:
      200:
        description: Erfolgreich abgerufen
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    data = request.get_json(silent=True)
    kultur_id = data.get("kultur_id")
    schadorg_kode = data.get("schadorg_kode")
    schadorg_name = data.get("schadorg_name", schadorg_kode)
    ort_id = data.get("ort_id")          # optional, für Wetterfenster
    anwendungshistorie = data.get("historie", [])  # letzte Anwendungen vom Frontend

    kultur = Kulturen.query.get(kultur_id)
    mittel = suche_mittel(kultur.eppoCode, schadorg_kode)

    # Wetterfenster optional dazu
    wetter_kontext = ""
    if ort_id:
        try:
            ort = get_ort_by_id(ort_id)
            gps = cord2plz(ort.get("plz")).get_json()
            forecast = fetch_forecast(float(gps["lat"]), float(gps["lon"]))
            windows = build_windows(forecast["rows"], SprayThresholds())
            best = windows.get("best_window")
            if best:
                wetter_kontext = f"Bestes Spritzfenster: {best['start']} bis {best['end']} ({best['duration_hours']} h)"
        except Exception:
            pass  # Wetter ist optional, Fehler nicht durchreichen

    system = (
        "Du bist ein Pflanzenschutzberater. Antworte sachlich, präzise und auf Deutsch. "
        "Gib keine rechtliche oder medizinische Beratung. Weise darauf hin, dass die "
        "Zulassungsinformationen vom BVL stammen und monatlich aktualisiert werden."
    )

    user = f"""Beratungsanfrage:
Kultur: {kultur.name} (EPPO: {kultur.eppoCode})
Schadorganismus: {schadorg_name}

Zugelassene Mittel laut BVL:
{_format_mittel(mittel)}

{f"Wetterbedingungen: {wetter_kontext}" if wetter_kontext else ""}

{f"Bisherige Anwendungen (für Resistenzrotation):{chr(10)}{_format_historie(anwendungshistorie)}" if anwendungshistorie else ""}

Bitte empfehle die 2-3 geeignetsten Mittel mit Begründung. Berücksichtige:
- Mittel mit geringem Risiko bevorzugen
- Wirkstoffwechsel bei wiederholter Anwendung
- Aufwandmengen und Wartezeiten
- Aktuelle Wetterbedingungen falls vorhanden
"""

    try:
        response = llm_query(system=system, user=user, max_tokens=1024)
        return jsonify({
            "ok": True,
            "empfehlung": response.text,
            "provider": response.provider,
            "model": response.model,
            "mittel_anzahl": len(mittel),
        })
    except LLMError as e:
        return jsonify({"ok": False, "message": str(e)}), 502


@bp.get("/api/beratung/llm-status")
@login_required
def llm_status():
    """
    Gibt Status der LLM Integration zurück.
    ---
    tags:
      - Beratung
    responses:
      200:
        description: Erfolgreich abgerufen
      401:
        description: Nicht authentifiziert
      403:
        description: Keine Schreibberechtigung
    """
    provider = Config.LLM_PROVIDER
    
    is_ollama = "11434" in Config.OPENAI_BASE_URL or "ollama" in Config.OPENAI_BASE_URL.lower()
    configured = bool(Config.OPENAI_API_KEY) or bool(Config.ANTHROPIC_API_KEY) or (Config.LLM_PROVIDER=="openai" and is_ollama)
    ai_enabled = get_setting("aiEnabled") in ("1", "true", "True", True)

    return jsonify({
        "ok": True,
        "configured": configured,
        "ai_enabled": ai_enabled,
        "provider": provider,
    })

@bp.get("/api/beratung/mittel/stream")
@login_required
def stream_mittel_empfehlung():
    """
    Streamt zugelassene Mittel per Server-Sent Events.
    Schickt jedes Mittel einzeln sobald es geladen ist.
    ---
    tags:
      - Beratung
    parameters:
      - in: query
        name: kultur_id
        type: integer
        required: true
      - in: query
        name: schadorg_kode
        type: string
        required: true
    responses:
      200:
        description: SSE-Stream mit Mittel-Daten
      400:
        description: Fehlende Parameter
      404:
        description: Kultur nicht gefunden
    """
    kultur_id = request.args.get("kultur_id")
    schadorg_kode = request.args.get("schadorg_kode")

    if not kultur_id or not schadorg_kode:
        return jsonify({"ok": False, "message": "kultur_id und schadorg_kode erforderlich"}), 400

    kultur = Kulturen.query.get(int(kultur_id))
    if not kultur:
        return jsonify({"ok": False, "message": "Kultur nicht gefunden"}), 404

    if not kultur.eppoCode:
        return jsonify({"ok": False, "message": f"Kultur '{kultur.name}' hat keinen EPPO-Code"}), 400

    def generate():
        try:
            for event_type, payload in suche_mittel_stream(kultur.eppoCode, schadorg_kode):
                if event_type == "mittel":
                    data = json.dumps({"type": "mittel", "mittel": payload.to_dict()})
                elif event_type == "progress":
                    data = json.dumps({"type": "progress", **payload})
                elif event_type == "total":
                    data = json.dumps({"type": "done", "anzahl": payload})
                else:
                    continue
                yield f"data: {data}\n\n"
        except PSMBeratungError as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # nginx: Buffering deaktivieren
        }
    )


@bp.get("/api/beratung/mittel/detail")
@login_required
def get_mittel_detail():
    kennr = request.args.get("kennr", "").strip()
    awg_id = request.args.get("awg_id", "").strip()

    if not kennr:
        return jsonify({"ok": False, "message": "kennr erforderlich"}), 400

    def get_items(path, params):
        return _get_all_items(path, params=params)

    def get_optional_items(path, params):
        try:
            return get_items(path, params)
        except PSMBeratungError:
            return []

    decode_cache = {}

    def decode_code(table, field, code):
        code = str(code or "").strip()
        if not code:
            return ""

        cache_key = (str(table).upper(), str(field).upper(), code)
        if cache_key in decode_cache:
            return decode_cache[cache_key]

        decoded = code
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

            if kodeliste:
                kode_data = _get("kode", params={
                    "kodeliste": kodeliste,
                    "kode": code,
                    "sprache": "DE",
                })
                kode_items = kode_data.get("items", [])
                if kode_items:
                    decoded = str(
                        kode_items[0].get("kodetext")
                        or kode_items[0].get("KODETEXT")
                        or code
                    ).strip()
        except PSMBeratungError:
            decoded = code

        decode_cache[cache_key] = decoded
        return decoded

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

    def pretty_label(key):
        labels = {
            "anwendungen_anz_je_befall": "Anwendungen je Befall",
            "anwendungen_anz_je_kultur": "Anwendungen je Kultur",
            "anwendungen_anz_je_jahr": "Anwendungen je Jahr",
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
            "wartezeit": "Wartezeit",
            "wartezeit_tage": "Wartezeit in Tagen",
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
            str(key).replace("_", " ").replace("-", " ").strip().capitalize()
        )

    def matching_entries(rows, *needles):
        entries = []
        seen = set()
        for row in rows:
            for key, value in row.items():
                key_l = str(key).lower()
                if value in (None, "") or not any(needle in key_l for needle in needles):
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

    def format_list(values, fallback="Keine Angabe"):
        values = [str(value).strip() for value in values if str(value).strip()]
        return ", ".join(values) if values else fallback

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
            einheit = value_from(gehalt, "gehalt_einheit", "einheit")
            result.append(" ".join(part for part in [name, menge, einheit] if part))
        return result

    def bee_class(rows):
        mapping = {
            "NB6611": "B1 - Bienengefährlich",
            "NB6621": "B2 - Bienengefährlich außer nach dem täglichen Bienenflug",
            "NB663": "B3 - Bienengefährlich, Anwendungsverbot",
            "NB6641": "B4 - Nicht bienengefährlich",
        }
        found = []
        for row in rows:
            code = value_from(row, "auflage", "hinweis", "kode", "code").upper()
            if code in mapping:
                found.append(mapping[code])
        return format_list(sorted(set(found)))

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

    try:
        mittel_items = get_items("mittel/", {"kennr": kennr})
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
                {"label": "Zulassungsinhaber / Vertrieb", "value": format_list([
                    *unique_values([mittel], "zulassungsinhaber", "zul_inhaber", "inhaber", "firma", "vertrieb", "vertriebsfirma"),
                    *unique_values(awg, "zulassungsinhaber", "vertrieb", "vertriebsfirma"),
                ])},
                {"label": "Zulassungsende", "value": first_text([mittel], "zul_ende", "zulassungsende", "gueltig_bis")},
                {"label": "Wirkungsbereich", "value": format_list([
                    *unique_values([mittel], "wirkungsbereich", "wirkbereich", "mittelart", "produktart"),
                    *unique_values(awg, "wirkungsbereich", "wirkbereich", "mittelart", "produktart"),
                ])},
                {"label": "Bienengefährlichkeit", "value": bee_class(all_rules)},
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
                        {"label": "Anwendungstechnik / Bereich", "value": format_lines([
                            *decoded_entries_for_keys(
                                awg,
                                "AWG",
                                "anwendungsbereich",
                                "anwendungstechnik",
                                "anwendungsart",
                                "einsatzgebiet",
                                "anwendungsort",
                            ),
                            *decoded_matching_entries(awg, "AWG", "technik", "bereich", "anwendungsart", "einsatz"),
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
                                "behandlungen_anz_je_befall",
                                "behandlungen_anz_je_kultur",
                                "behandlungen_anz_je_jahr",
                                "max_anwendungen",
                                "max_anzahl_anwendungen",
                                "maximale_anwendungen",
                                "anzahl_anwendungen",
                                "max_awg",
                            ),
                            *matching_entries(awg, "max", "anwend", "behandl"),
                        ])},
                        {"label": "Aufwandmenge", "value": format_lines([
                            *decoded_entries_for_keys(
                                awg_aufwand,
                                "AWG_AUFWAND",
                                "aufwandmenge",
                                "aufwandeinheit",
                                "aufwand",
                                "m_aufwand",
                                "m_aufwandmenge",
                                "m_aufwand_einheit",
                            ),
                            *decoded_matching_entries(awg_aufwand, "AWG_AUFWAND", "aufwand", "menge", "einheit"),
                        ])},
                        {"label": "Wartezeiten", "value": format_lines([
                            *decoded_entries_for_keys(awg_wartezeit, "AWG_WARTEZEIT", "wartezeit", "wartezeit_tage", "wz"),
                            *decoded_matching_entries(awg_wartezeit, "AWG_WARTEZEIT", "wartezeit", "kultur", "nutzung"),
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

        return jsonify({
            "ok": True,
            "kennr": kennr,
            "awg_id": awg_id,
            "detail": structured,
            "sections": [
                {"title": "Mittel", "items": mittel_items},
                {"title": "Anwendung", "items": awg},
                {"title": "Alle Anwendungen", "items": all_awg},
                {"title": "Aufwand", "items": awg_aufwand},
                {"title": "Wartezeit", "items": awg_wartezeit},
                {"title": "Kultur", "items": awg_kultur},
                {"title": "Schadorganismus", "items": awg_schadorg},
                {"title": "Alle Kulturen", "items": all_awg_kultur},
                {"title": "Alle Schadorganismen", "items": all_awg_schadorg},
                {"title": "Anwendungsbestimmungen", "items": anwendungsbestimmungen},
                {"title": "Wirkstoffgehalt", "items": wirkstoff_gehalt},
                {"title": "Wirkstoffe", "items": wirkstoffe},
                {"title": "Auflagen", "items": auflagen},
                {"title": "Hinweise", "items": hinweise},
            ],
        })
    except PSMBeratungError as e:
        return jsonify({"ok": False, "message": str(e)}), 502
