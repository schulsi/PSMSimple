from flask import Blueprint, jsonify, request
import os

from ..services.psm_beratung_service import (
    PSMBeratungError,
    suche_mittel,
    suche_schadorganismen,
)
from ..services.llm_service import llm_query, LLMError
from ..services.permissions import login_required
from ..models import Kulturen

bp = Blueprint("beratung", __name__)


@bp.get("/api/beratung/schadorganismen")
@login_required
def get_schadorganismen():
    """Schadorganismen-Suche für Dropdown."""
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify({"ok": False, "message": "Mindestens 2 Zeichen eingeben"}), 400

    try:
        ergebnisse = suche_schadorganismen(q)
        return jsonify({"ok": True, "items": ergebnisse})
    except PSMBeratungError as e:
        return jsonify({"ok": False, "message": str(e)}), 502


@bp.post("/api/beratung/mittel")
@login_required
def get_mittel_empfehlung():
    """
    Gibt zugelassene Mittel für Kultur + Schadorganismus zurück.
    Body: { "kultur_id": 1, "schadorg_kode": "APHISS" }
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
            from .einsatzorte import cord2plz
            from ..repositories.orte_repo import get_ort_by_id
            from ..services.weather_service import fetch_forecast
            from ..utils.weather_utils import build_windows, SprayThresholds
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
    provider = os.environ.get("LLM_PROVIDER", "anthropic")
    
    key_map = {
        "anthropic": "ANTHROPIC_API_KEY",
        "openai": "OPENAI_API_KEY",
    }
    
    key_name = key_map.get(provider)
    configured = bool(key_name and os.environ.get(key_name))
    
    return jsonify({
        "ok": True,
        "configured": configured,
        "provider": provider,
    })