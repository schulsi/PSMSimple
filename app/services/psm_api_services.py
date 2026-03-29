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

        return {
            "wirkstoffe": ", ".join(wirkstoffe_parts),
            "zulassungsnr": kennr,
        }

    except requests.RequestException as exc:
        raise RuntimeError(f"PSM-API nicht erreichbar: {exc}") from exc