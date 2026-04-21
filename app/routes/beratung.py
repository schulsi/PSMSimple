from flask import Blueprint, jsonify, request
import json
from ..config import Config
from ..models import Kulturen

from ..services.psm_beratung_service import (
    PSMBeratungError,
    suche_mittel,
    suche_schadorganismen,
    _get,
    _suche_schadorg_kodes,
    _get_kultur_awg_ids,
    _get_schad_awg_ids,
    _is_schad_cached,
    )
from .einsatzorte import cord2plz
from ..repositories.orte_repo import get_ort_by_id
from ..services.weather_service import fetch_forecast
from ..utils.weather_utils import build_windows, SprayThresholds       
from ..services.llm_service import llm_query, LLMError
from ..services.permissions import login_required
from ..models import Kulturen

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


def _format_mittel(mittel: list) -> str:
    if not mittel:
        return "Keine Mittel gefunden."
    lines = []
    for m in mittel[:20]:  # max 20 damit der Kontext nicht zu groß wird
        riziko = " [geringes Risiko]" if m.geringes_risiko else ""
        wz = f", Wartezeit: {m.wartezeit_tage}d" if m.wartezeit_tage else ""
        ws = f", Wirkstoffe: {', '.join(m.wirkstoffe)}" if m.wirkstoffe else ""
        aufwand = f", Aufwand: {m.aufwand_info}" if m.aufwand_info else ""
        lines.append(f"- {m.mittelname} (Zul. bis {m.zul_ende[:10]}){riziko}{wz}{ws}{aufwand}")
    return "\n".join(lines)


def _format_historie(historie: list) -> str:
    lines = []
    for h in historie[:5]:
        lines.append(f"- {h.get('datum', '?')}: {h.get('mittel', '?')} auf {h.get('kultur', '?')}")
    return "\n".join(lines) or "Keine History vorhanden."

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

    return jsonify({
        "ok": True,
        "configured": configured,
        "provider": provider,
    })