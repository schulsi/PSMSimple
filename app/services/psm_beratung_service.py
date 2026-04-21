from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import requests

from ..config import Config
from ..extensions import cache

# bereits in deiner Config: "https://psm-api.bvl.bund.de/ords/psm/api-v1/"
PSM_API = Config.PSM_API
TIMEOUT = 10


class PSMBeratungError(Exception):
    pass


def _get(path: str, params: dict | None = None) -> dict:
    """Hilfsfunktion für GET-Requests gegen die BVL-API."""
    try:
        resp = requests.get(f"{PSM_API}{path}", params=params, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        raise PSMBeratungError(f"BVL-API Fehler bei {path}: {exc}") from exc


def _get_all_items(path: str, params: dict | None = None) -> list[dict]:
    """Holt alle Seiten einer paginierten BVL-Antwort."""
    items = []
    url = f"{PSM_API}{path}"
    while url:
        try:
            resp = requests.get(url, params=params, timeout=TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as exc:
            raise PSMBeratungError(
                f"BVL-API Fehler bei {path}: {exc}") from exc

        items.extend(data.get("items", []))
        params = None  # nur beim ersten Request, danach next-Link nutzen
        next_link = next(
            (l["href"] for l in data.get("links", []) if l["rel"] == "next"),
            None
        )
        url = next_link if data.get("hasMore") else None

    return items


# ---------------------------------------------------------------------------
# Kulturen & Schadorganismen aus BVL laden
# ---------------------------------------------------------------------------

def lade_bvl_kulturen() -> list[dict]:
    """
    Lädt alle Kulturen aus der BVL-API (/kultur_gruppe).
    Gibt Liste von {kultur, kultur_gruppe} zurück.
    Kann gecacht werden — ändert sich nur monatlich.
    """
    items = _get_all_items("kultur_gruppe/")
    return items


def suche_kultur_by_eppo(eppo_code: str) -> list[str]:
    """
    Sucht BVL-Kultur-Kodes anhand eines EPPO-Codes.
    EPPO-Codes stimmen oft direkt überein (z.B. TRZAW, MAISE).
    Gibt Liste von passenden BVL-Kodes zurück.
    """
    # Direkte Suche: EPPO-Code als BVL-Kultur-Kode
    data = _get("awg_kultur/", params={
        "q": json.dumps({"KULTUR": {"$instr": eppo_code}})
    })
    direkt = list({item["kultur"] for item in data.get("items", [])})

    if direkt:
        return direkt

    # Fallback: Suche über Klartext-Namen in kultur_gruppe
    # (für den Fall dass EPPO != BVL-Kode)
    return []


def suche_schadorganismen(suchbegriff: str, eppo_code: str | None = None) -> list[dict]:

    if eppo_code:
        kultur_awg_ids = _get_kultur_awg_ids(eppo_code)

        if not kultur_awg_ids:
            return []

        # 2. Schadorganismen nach Text suchen — NUR ein API-Call
        schad_data = _get_all_items("kode/", params={
            "q": json.dumps({
                "KODETEXT": {"$instr": suchbegriff},
                "KODELISTE": {"$eq": "947"},
                "SPRACHE": {"$eq": "DE"}
            })
        })
        treffer_kodes = {item["kode"] for item in schad_data}

        if not treffer_kodes:
            return []

        # 3. awg_schadorg nach Schadorganismus-Text filtern — ein Call pro Treffer-Kode
        # Das sind typisch 3-10 Kodes, nicht hunderte AWG-IDs
        zugelassene = {}
        for kode in treffer_kodes:
            awg_schad = _get("awg_schadorg/", params={
                "q": json.dumps({
                    "SCHADORG": {"$eq": kode}
                })
            })
            for item in awg_schad.get("items", []):
                if item.get("ausgenommen") != "J" and item["awg_id"] in kultur_awg_ids:
                    # Dieser Schadorganismus ist für die Kultur zugelassen
                    zugelassene[kode] = next(
                        i["kodetext"] for i in schad_data if i["kode"] == kode
                    )
                    break  # einmal gefunden reicht

        return [
            {"kode": kode, "bezeichnung": bez}
            for kode, bez in sorted(zugelassene.items(), key=lambda x: x[1])
        ]

    else:
        # Ohne Kultur — einfache Textsuche
        data = _get("kode/", params={
            "q": json.dumps({
                "KODETEXT": {"$instr": suchbegriff},
                "KODELISTE": {"$eq": "7"},
                "SPRACHE": {"$eq": "DE"}
            })
        })
        return [
            {"kode": item["kode"], "bezeichnung": item["kodetext"]}
            for item in data.get("items", [])
        ]


@dataclass
class PSMMittelInfo:
    awg_id: str
    kennr: str
    mittelname: str
    zul_ende: str
    geringes_risiko: bool
    wirkbereiche: list[str] = field(default_factory=list)
    wirkstoffe: list[str] = field(default_factory=list)
    wartezeit_tage: int | None = None
    aufwand_info: str | None = None

    def to_dict(self) -> dict:
        return {
            "awg_id": self.awg_id,
            "kennr": self.kennr,
            "mittelname": self.mittelname,
            "zul_ende": self.zul_ende,
            "geringes_risiko": self.geringes_risiko,
            "wirkbereiche": self.wirkbereiche,
            "wirkstoffe": self.wirkstoffe,
            "wartezeit_tage": self.wartezeit_tage,
            "aufwand_info": self.aufwand_info,
        }


def suche_mittel(
    eppo_code: str,
    schadorg_kode: str,
) -> list[PSMMittelInfo]:
    """
    Kernfunktion: Findet alle zugelassenen Mittel für eine
    Kultur (per EPPO-Code) + Schadorganismus (BVL-Kode).
    """

    # 1. Alle AWG-IDs für die Kultur holen
    kultur_data = _get_all_items("awg_kultur/", params={
        "q": json.dumps({"KULTUR": {"$instr": eppo_code}})
    })
    kultur_awg_ids = {
        item["awg_id"]
        for item in kultur_data
        if item.get("ausgenommen") != "J"
    }

    if not kultur_awg_ids:
        return []

    # 2. Alle AWG-IDs für den Schadorganismus holen
    schad_data = _get_all_items("awg_schadorg/", params={
        "q": json.dumps({"SCHADORG": {"$eq": schadorg_kode}})
    })
    schad_awg_ids = {
        item["awg_id"]
        for item in schad_data
        if item.get("ausgenommen") != "J"
    }

    # 3. Schnittmenge
    treffer_ids = kultur_awg_ids & schad_awg_ids
    if not treffer_ids:
        return []

    # 4. Mittelinfos für jeden Treffer laden
    ergebnisse: list[PSMMittelInfo] = []
    gesehene_kennr: set[str] = set()  # Duplikate vermeiden

    for awg_id in treffer_ids:
        try:
            awg_data = _get(f"awg/{awg_id}")
            items = awg_data.get("items", [awg_data])
            awg = items[0] if items else awg_data
            kennr = awg.get("kennr")

            if not kennr or kennr in gesehene_kennr:
                continue
            gesehene_kennr.add(kennr)

            mittel_data = _get(f"mittel/{kennr}")
            mittel_items = mittel_data.get("items", [mittel_data])
            mittel = mittel_items[0] if mittel_items else mittel_data

            zul_ende = mittel.get("zul_ende", "")

            # Wirkstoffe laden
            ws_data = _get("wirkstoff_gehalt/", params={"kennr": kennr})
            wirkstoffe = [
                item.get("wirkstoff_name", item.get("wirknr", ""))
                for item in ws_data.get("items", [])
            ]

            # Wartezeit laden
            wz_data = _get("awg_wartezeit/", params={"awg_id": awg_id})
            wz_items = wz_data.get("items", [])
            wartezeit = wz_items[0].get("wartezeit") if wz_items else None

            # Aufwand laden
            aw_data = _get("awg_aufwand/", params={"awg_id": awg_id})
            aw_items = aw_data.get("items", [])
            aufwand_info = None
            if aw_items:
                aw = aw_items[0]
                menge = aw.get("aufwandmenge")
                einheit = aw.get("aufwandeinheit", "")
                if menge:
                    aufwand_info = f"{menge} {einheit}".strip()

            ergebnisse.append(PSMMittelInfo(
                awg_id=awg_id,
                kennr=kennr,
                mittelname=mittel.get("mittelname", kennr),
                zul_ende=zul_ende,
                geringes_risiko=mittel.get(
                    "mittel_mit_geringem_risiko") == "J",
                wirkstoffe=[ws for ws in wirkstoffe if ws],
                wartezeit_tage=int(wartezeit) if wartezeit else None,
                aufwand_info=aufwand_info,
            ))

        except PSMBeratungError:
            continue  # einzelne Fehler überspringen

    # Nach geringem Risiko und dann Mittelname sortieren
    ergebnisse.sort(key=lambda m: (not m.geringes_risiko, m.mittelname))
    return ergebnisse

@cache.memoize(Config.CACHE_DEFAULT_TIMEOUT)
def _get_kultur_awg_ids(eppo_code: str) -> set[str]:
    """Gecachte AWG-IDs für eine Kultur — 24h TTL."""
    kultur_data = _get_all_items("awg_kultur/", params={
        "q": json.dumps({"KULTUR": {"$instr": eppo_code}})
    })
    return {
        item["awg_id"]
        for item in kultur_data
        if item.get("ausgenommen") != "J"
    }