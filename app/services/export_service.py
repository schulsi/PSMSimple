import io
import json

from ..repositories.betrieb_repo import get_betrieb
from ..repositories.einsatzorte_repo import list_einsatzorte_by_ids
from ..repositories.kulturen_repo import list_kulturen_by_ids
from ..repositories.psm_repo import list_psm_by_ids
from ..utils.paths import create_save_path


def build_output(payload: dict, betrieb: dict) -> dict:
    psm_overrides = {
        int(item["id"]): item.get("aufwandMenge", "")
        for item in payload.get("psm_overrides", [])
    }
    einsatzort_ids = [int(x) for x in payload.get("einsatzort_ids", [])]
    kult_overrides = {
        int(item["id"]): item.get("bbchCode", "")
        for item in payload.get("kult_overrides", [])
    }

    psm_rows = list_psm_by_ids(list(psm_overrides.keys()))
    einsatzorte = list_einsatzorte_by_ids(einsatzort_ids)
    kult_rows = list_kulturen_by_ids(list(kult_overrides.keys()))

    psm_list = []
    for psm in psm_rows:
        entry = dict(psm)
        entry["aufwandMenge"] = psm_overrides.get(entry["id"], "")
        psm_list.append(entry)

    kulturen = []
    for kultur in kult_rows:
        entry = dict(kultur)
        entry["bbchCode"] = kult_overrides.get(entry["id"], "")
        kulturen.append(entry)

    return {
        "betrieb": betrieb,
        "pflanzenschutzmittel": psm_list,
        "einsatzorte": [dict(e) for e in einsatzorte],
        "kulturen": kulturen,
        "anwendung": payload.get("anwendung", {}),
    }


def build_output_for_current_betrieb(payload: dict) -> dict:
    betrieb = get_betrieb()
    if not betrieb:
        raise ValueError("Kein Betrieb vorhanden.")
    return build_output(payload, betrieb)


def build_export_filename(data: dict, extension: str) -> str:
    einsatzorte = data.get("einsatzorte", [])
    psm_list = data.get("pflanzenschutzmittel", [])
    anwendung = data.get("anwendung", {})

    eo_name = einsatzorte[0]["name"] if einsatzorte else "export"
    datum = (anwendung.get("datum") or "").replace("-", "") or "ohne_datum"
    psm_slug = psm_list[0]["name"].replace(" ", "_") if psm_list else "PSM"

    return f"PSM_Anwendung_{datum}_{psm_slug}_{eo_name}.{extension}"


def json_bytes(output: dict) -> io.BytesIO:
    buf = io.BytesIO(
        json.dumps(output, ensure_ascii=False, indent=2).encode("utf-8")
    )
    buf.seek(0)
    return buf


def save_buffer_to_exports(buf: io.BytesIO, filename: str, datum: str | None = None) -> str:
    export_dir = create_save_path(datum)
    full_path = export_dir / filename

    with open(full_path, "wb") as f:
        f.write(buf.getbuffer())

    return str(full_path)