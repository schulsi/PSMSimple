import json
import requests
from flask import current_app


def api_to_string(einheit: str | None) -> str:
    mapping = {
        "GK": "g/kg",
        "GL": "g/l",
        "MD": "ml/dosis",
    }
    return mapping.get(einheit or "", einheit or "")  

def _psm_api_base() -> str:
    base = current_app.config["PSM_API"]
    return base if base.endswith("/") else base + "/"

def _get_bee_class(base: str, kennr: str) -> str:
    mapping = {
        "NB6611": "B1",
        "NB6621": "B2",
        "NB663": "B3",
        "NB6641": "B4",
    }

    bee_classes = set()

    for endpoint in ["auflagen", "hinweis"]:
        resp = requests.get(
            base + endpoint,
            params={"ebene": kennr},
            timeout=5,
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])

        for item in items:
            code = (
                item.get("auflage")
                or item.get("AUFLAGE")
                or item.get("hinweis")
                or item.get("HINWEIS")
                or ""
            )
            code = str(code).strip().upper()

            if code in mapping:
                bee_classes.add(mapping[code])

    return ", ".join(sorted(bee_classes))

import requests


def _decode_code(base: str, table: str, field: str, code: str, sprache: str = "DE") -> str:
    code = (code or "").strip()
    if not code:
        return ""

    # passende Kodeliste zum Feld ermitteln
    map_resp = requests.get(
        base + "kodeliste_feldname",
        params={
            "tabelle": table,
            "feldname": field,
        },
        timeout=5,
    )
    map_resp.raise_for_status()
    map_items = map_resp.json().get("items", [])

    if not map_items:
        return code  # Fallback: Rohkode zurückgeben

    kodeliste = str(
        map_items[0].get("kodeliste")
        or map_items[0].get("KODELISTE")
        or ""
    ).strip()

    if not kodeliste:
        return code

    # Kode in Klartext dekodieren
    kode_resp = requests.get(
        base + "kode",
        params={
            "kodeliste": kodeliste,
            "kode": code,
            "sprache": sprache,
        },
        timeout=5,
    )
    kode_resp.raise_for_status()
    kode_items = kode_resp.json().get("items", [])

    if not kode_items:
        return code

    return str(
        kode_items[0].get("kodetext")
        or kode_items[0].get("KODETEXT")
        or code
    ).strip()


def _get_application_rate(base: str, kennr: str) -> str:
    awg_resp = requests.get(
        base + "awg/",
        params={"kennr": kennr},
        timeout=5,
    )
    awg_resp.raise_for_status()
    awg_items = awg_resp.json().get("items", [])

    if not awg_items:
        return ""

    awg_id = awg_items[0].get("awg_id", "")
    if not awg_id:
        return ""

    aufwand_resp = requests.get(
        base + "awg_aufwand",
        params={"awg_id": awg_id},
        timeout=5,
    )
    aufwand_resp.raise_for_status()
    aufwand_items = aufwand_resp.json().get("items", [])

    if not aufwand_items:
        return ""

    item = aufwand_items[0]
    code = str(item.get("m_aufwand_einheit") or "").strip()
    if not code:
        return ""

    return _decode_code(
        base=base,
        table="AWG_AUFWAND",
        field="M_AUFWAND_EINHEIT",
        code=code,
        sprache="DE",
    )

def search_psm_by_term(term: str, limit: int = 10) -> list[dict]:
    term = (term or "").strip()
    if len(term) < 2:
        return []

    try:
        resp = requests.get(
            _psm_api_base() + "mittel/",
            params={
                "q": json.dumps({"MITTELNAME": {"$instr": term}}),
                "limit": limit,
            },
            timeout=5,
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])

        result = []
        for row in items:
            result.append({
                "name": row.get("mittelname", ""),
                "kennr": row.get("kennr", ""),
            })
        return result

    except Exception:
        return []


def get_psm_info_by_kennr(kennr: str) -> dict:
    kennr = (kennr or "").strip()
    if not kennr:
        raise ValueError("Keine Kennnummer angegeben.")

    base = _psm_api_base()

    try:
        wg_resp = requests.get(
            base + "wirkstoff_gehalt/",
            params={"q": json.dumps({"kennr": {"$eq": kennr}})},
            timeout=5,
        )
        wg_resp.raise_for_status()
        items = wg_resp.json().get("items", [])

        wirkstoffe_parts = []
        einheit = ""

        for item in items:
            wirkstoff_nr = item.get("wirknr", "")
            menge = item.get("gehalt_rein_grundstruktur", "")
            einheit = api_to_string(item.get("gehalt_einheit", ""))

            if not wirkstoff_nr:
                continue

            ws_resp = requests.get(
                base + "wirkstoff/",
                params={"q": json.dumps({"wirknr": {"$eq": wirkstoff_nr}})},
                timeout=5,
            )
            ws_resp.raise_for_status()
            ws_items = ws_resp.json().get("items", [])

            if ws_items:
                ws_name = ws_items[0].get("wirkstoffname", "")
                text = f"{ws_name} {menge} {einheit}".strip()
                if text:
                    wirkstoffe_parts.append(text)
            bee_class = _get_bee_class(base, kennr)
            einheit = _get_application_rate(base, kennr)
        return {
            "wirkstoffe": ", ".join(wirkstoffe_parts),
            "zulassungsnr": kennr,
            "bienenfreundlichkeit": bee_class,
            "aufwand_einheit": einheit,


        }

    except requests.RequestException as exc:
        raise RuntimeError(f"PSM-API nicht erreichbar: {exc}") from exc