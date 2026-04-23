from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import requests

from ..config import Config
from ..extensions import cache

# bereits in deiner Config: "https://psm-api.bvl.bund.de/ords/psm/api-v1/"
PSM_API = Config.PSM_API
TIMEOUT = 20
SCHAD_CACHE_PREFIX = "psm_schad_awg_"


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
    """
    Sucht Schadorganismen nach deutschem Namen.
    Falls eppo_code angegeben, nur Schadorganismen die für diese Kultur zugelassen sind.
    Alle Teilabfragen sind gecacht.
    """

    if eppo_code:
        # 1. AWG-IDs für die Kultur — gecacht
        kultur_awg_ids = _get_kultur_awg_ids(eppo_code)

        if not kultur_awg_ids:
            return []

        # 2. Textsuche in Kodeliste — gecacht
        schad_data = _suche_schadorg_kodes(suchbegriff)
        treffer_kodes = {item["kode"] for item in schad_data}

        if not treffer_kodes:
            return []

        # 3. Pro Treffer-Kode prüfen ob er für die Kultur zugelassen ist — gecacht
        zugelassene = {}
        for kode in treffer_kodes:
            awg_ids_fuer_kode = _get_schad_awg_ids(kode)
            if awg_ids_fuer_kode & kultur_awg_ids:  # Schnittmenge nicht leer
                zugelassene[kode] = next(
                    i["kodetext"] for i in schad_data if i["kode"] == kode
                )

        return [
            {"kode": kode, "bezeichnung": bez}
            for kode, bez in sorted(zugelassene.items(), key=lambda x: x[1])
        ]

    else:
        # Ohne Kultur — nur Textsuche, gecacht
        schad_data = _suche_schadorg_kodes(suchbegriff)
        return [
            {"kode": item["kode"], "bezeichnung": item["kodetext"]}
            for item in schad_data
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


def suche_mittel(eppo_code: str, schadorg_kode: str) -> list[PSMMittelInfo]:

    kultur_awg_ids = _get_kultur_awg_ids(eppo_code)
    if not kultur_awg_ids:
        return []

    schad_awg_ids = _get_schad_awg_ids(schadorg_kode)
    treffer_ids = kultur_awg_ids & schad_awg_ids
    if not treffer_ids:
        return []

    ergebnisse: list[PSMMittelInfo] = []
    gesehene_kennr: set[str] = set()

    for awg_id in treffer_ids:
        try:
            kennr = _get_awg_kennr(awg_id)
            if not kennr or kennr in gesehene_kennr:
                print(f"Skippt Nr {kennr}")
                continue

            mittel = _get_mittel_info(kennr)
            zul_ende = mittel.get("zul_ende", "")
            wirkstoffe = _get_wirkstoffe(kennr)

            gesehene_kennr.add(kennr)

            ergebnisse.append(PSMMittelInfo(
                awg_id=awg_id,
                kennr=kennr,
                mittelname=mittel.get("mittelname", kennr),
                zul_ende=zul_ende,
                geringes_risiko=mittel.get(
                    "mittel_mit_geringem_risiko") == "J",
                wirkstoffe=[ws for ws in wirkstoffe if ws],
            ))

        except PSMBeratungError:
            continue

    ergebnisse.sort(key=lambda m: (not m.geringes_risiko, m.mittelname))
    return ergebnisse


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _suche_schad_kodes(suchbegriff: str) -> list[dict]:
    return _get_all_items("kode/", params={
        "q": json.dumps({
            "KODETEXT": {"$instr": suchbegriff},
            "KODELISTE": {"$eq": "947"},
            "SPRACHE": {"$eq": "DE"}
        })
    })


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _get_awg_ids_fuer_schadkode(kode: str) -> set[str]:
    awg_schad = _get_all_items("awg_schadorg/", params={
        "q": json.dumps({"SCHADORG": {"$eq": kode}})
    })
    return {
        item["awg_id"]
        for item in awg_schad
        if item.get("ausgenommen") != "J"
    }


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _get_mittel_info(kennr: str) -> dict:
    """Gecachte Mittel-Stammdaten."""
    mittel_data = _get(f"mittel/?kennr={kennr}")
    mittel_items = mittel_data.get("items", [mittel_data])
    return mittel_items[0] if mittel_items else mittel_data


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _get_wirkstoffe(kennr: str) -> list[str]:
    """Gecachte Wirkstoffe für ein Mittel."""
    wsg_data = _get("wirkstoff_gehalt/", params={"kennr": kennr})
    
    for item in wsg_data.get("items", []):
        wirkstoffnr = item.get("wirknr") 

    ws_data = _get("wirkstoff/", params={"wirknr": wirkstoffnr})
    return [
        item.get("wirkstoffname") for item in ws_data.get("items", [])
    ]


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _get_wartezeit(awg_id: str) -> int | None:
    """Gecachte Wartezeit für eine Anwendung."""
    wz_data = _get("awg_wartezeit/", params={"awg_id": awg_id})
    wz_items = wz_data.get("items", [])
    wartezeit = wz_items[0].get("wartezeit") if wz_items else None
    return int(wartezeit) if wartezeit else None


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _get_aufwand(awg_id: str) -> str | None:
    """Gecachte Aufwandmenge für eine Anwendung."""
    aw_data = _get("awg_aufwand/", params={"awg_id": awg_id})
    aw_items = aw_data.get("items", [])
    if not aw_items:
        return None
    aw = aw_items[0]
    menge = aw.get("aufwandmenge")
    einheit = aw.get("aufwandeinheit", "")
    return f"{menge} {einheit}".strip() if menge else None


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _get_awg_kennr(awg_id: str) -> str | None:
    """Gecachte kennr für eine AWG-ID."""
    awg_data = _get(f"awg/?awg_id={awg_id}")
    items = awg_data.get("items", [awg_data])
    awg = items[0] if items else awg_data
    return awg.get("kennr")


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _get_schad_awg_ids(schadorg_kode: str) -> set[str]:
    """Gecachte AWG-IDs für einen Schadorganismus."""
    explicit_key = f"psm_schad_{schadorg_kode}"
    cached = cache.get(explicit_key)
    if cached is not None:
        return cached

    result = set()
    schad_data = _get_all_items("awg_schadorg/", params={
        "q": json.dumps({"SCHADORG": {"$eq": schadorg_kode}})
    })
    result = {
        item["awg_id"]
        for item in schad_data
        if item.get("ausgenommen") != "J"
    }
    cache.set(explicit_key, result, timeout=Config.CACHE_DEFAULT_TIMEOUT)
    return result

def _is_schad_cached(schadorg_kode: str) -> bool:
    """Prüft ob ein Schadorganismus-Kode im Cache ist."""
    return cache.get(f"psm_schad_{schadorg_kode}") is not None

@cache.memoize(Config.CACHE_DEFAULT_TIMEOUT)
def _get_kultur_awg_ids(eppo_code: str) -> set[str]:
    """Gecachte AWG-IDs für eine Kultur — 20d TTL."""
    kultur_data = _get_all_items("awg_kultur/", params={
        "q": json.dumps({"KULTUR": {"$instr": eppo_code}})
    })
    return {
        item["awg_id"]
        for item in kultur_data
        if item.get("ausgenommen") != "J"
    }


@cache.memoize(timeout=Config.CACHE_DEFAULT_TIMEOUT)
def _suche_schadorg_kodes(suchbegriff: str) -> list[dict]:
    """Gecachte Kodelisten-Suche nach Schadorganismus-Text."""
    data = _get_all_items("kode/", params={
        "q": json.dumps({
            "KODETEXT": {"$instr": suchbegriff},
            "KODELISTE": {"$eq": "947"},
            "SPRACHE": {"$eq": "DE"}
        })
    })
    return [{"kode": item["kode"], "kodetext": item["kodetext"]} for item in data]

def suche_schadorganismen_partial(suchbegriff: str, eppo_code: str | None = None) -> tuple[list[dict], bool]:
    """
    Gibt gecachte Treffer sofort zurück + Flag ob noch mehr nachgeladen wird.
    Returns: (treffer, has_more_loading)
    """
    # Zuerst prüfen was bereits gecacht ist
    cached_results = []
    uncached_kodes = []

    schad_data = _suche_schadorg_kodes(suchbegriff)
    treffer_kodes = {item["kode"] for item in schad_data}

    if not treffer_kodes:
        return [], False

    if eppo_code:
        kultur_awg_ids = _get_kultur_awg_ids(eppo_code)
        if not kultur_awg_ids:
            return [], False

        for item in schad_data:
            kode = item["kode"]
            cache_key = f"flask_cache_suche_schadorg_{kode}"

            # Prüfen ob dieser Kode bereits im Cache ist
            cached = cache.get(f"_get_schad_awg_ids_{kode}")
            if cached is not None:
                # Gecacht — sofort prüfen
                if cached & kultur_awg_ids:
                    cached_results.append({
                        "kode": kode,
                        "bezeichnung": item["kodetext"]
                    })
            else:
                uncached_kodes.append(item)

        has_more = len(uncached_kodes) > 0
        return sorted(cached_results, key=lambda x: x["bezeichnung"]), has_more

    else:
        return [
            {"kode": item["kode"], "bezeichnung": item["kodetext"]}
            for item in schad_data
        ], False

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

def suche_mittel_stream(eppo_code: str, schadorg_kode: str):
    """
    Generator-Version von suche_mittel().
    Yields PSMMittelInfo-Objekte einzeln sobald sie geladen sind,
    plus ein abschließendes 'done'-Event mit Gesamtanzahl.
    
    Yields tuples: ("mittel", PSMMittelInfo) | ("total", int) | ("progress", dict)
    """
    kultur_awg_ids = _get_kultur_awg_ids(eppo_code)
    if not kultur_awg_ids:
        yield ("total", 0)
        return

    schad_awg_ids = _get_schad_awg_ids(schadorg_kode)
    treffer_ids = kultur_awg_ids & schad_awg_ids
    if not treffer_ids:
        yield ("total", 0)
        return

    total = len(treffer_ids)
    yield ("progress", {"loaded": 0, "total": total})

    gesehene_kennr: set[str] = set()
    ergebnisse: list[PSMMittelInfo] = []
    loaded = 0

    for awg_id in treffer_ids:
        loaded += 1
        try:
            kennr = _get_awg_kennr(awg_id)
            if not kennr or kennr in gesehene_kennr:
                yield ("progress", {"loaded": loaded, "total": total})
                continue

            mittel = _get_mittel_info(kennr)
            zul_ende = mittel.get("zul_ende", "")
            wirkstoffe = _get_wirkstoffe(kennr)

            gesehene_kennr.add(kennr)

            info = PSMMittelInfo(
                awg_id=awg_id,
                kennr=kennr,
                mittelname=mittel.get("mittelname", kennr),
                zul_ende=zul_ende,
                geringes_risiko=mittel.get("mittel_mit_geringem_risiko") == "J",
                wirkstoffe=[ws for ws in wirkstoffe if ws],
            )
            ergebnisse.append(info)
            yield ("mittel", info)

        except PSMBeratungError:
            pass

        yield ("progress", {"loaded": loaded, "total": total})

    yield ("total", len(ergebnisse))