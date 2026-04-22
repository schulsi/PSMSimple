from ..models import Kulturen
from ..services.psm_beratung_service import (
    _get_kultur_awg_ids,
    _get_schad_awg_ids,
    _suche_schadorg_kodes,
    _get_awg_kennr,
    _get_mittel_info,
    _get_wirkstoffe,
    _get_wartezeit,
    _get_aufwand,
)
from ..repositories.settings_repo import get_setting

import json
import logging
import threading
import time

DEFAULT_WARMUP_SUCHWÖRTER = [
    "Mehltau",
    "Blattlaus",
    "Rost",
    "Botrytis",
    "Fusarium",
    "Alternaria",
    "Sklerotinia",
]

def get_warmup_suchwörter() -> list[str]:
    """Lädt Suchwörter aus Settings, Fallback auf Default."""
    try:
        value = get_setting("beratung_warmup_suchwörter")
        if value and value.get("value"):
            parsed = json.loads(value["value"])
            if isinstance(parsed, list) and parsed:
                return parsed
            
    except Exception:
        pass
    return DEFAULT_WARMUP_SUCHWÖRTER


def _start_warmup_cache(app):

    def warmup():
        time.sleep(5)

        with app.app_context():
            try:
                logger = logging.getLogger(__name__)
                alle_awg_ids: set[str] = set()
                alle_kodes: set[str] = set()
                alle_kennrn: set[str] = set()

                # --- 1. Kulturen vorläden ---
                kulturen = Kulturen.query.filter(
                    Kulturen.eppoCode.isnot(None)
                ).all()
                logger.info(f"Cache-Warmup: {len(kulturen)} Kulturen vorläden...")

                for kultur in kulturen:
                    try:
                        ids = _get_kultur_awg_ids(kultur.eppoCode)
                        logger.info(f"  ✓ {kultur.name} ({kultur.eppoCode}) — {len(ids)} AWG-IDs")
                    except Exception as e:
                        logger.warning(f"  ✗ {kultur.eppoCode}: {e}")

                # --- 2. Suchwörter → Kodes → awg_schadorg vorläden ---
                suchwörter = get_warmup_suchwörter()
                logger.info(f"Cache-Warmup: {len(suchwörter)} Suchwörter vorläden...")

                alle_kodes = set()
                for wort in suchwörter:
                    try:
                        treffer = _suche_schadorg_kodes(wort)
                        kodes = {item["kode"] for item in treffer}
                        alle_kodes |= kodes
                        logger.info(f"  ✓ '{wort}' — {len(kodes)} Kodes gecacht")
                    except Exception as e:
                        logger.warning(f"  ✗ '{wort}': {e}")

                # --- 3. awg_schadorg für alle gefundenen Kodes vorläden ---
                logger.info(f"Cache-Warmup: {len(alle_kodes)} Schadorg-Kodes vorläden...")

                for kode in alle_kodes:
                    try:
                        ids = {str(x).strip() for x in _get_schad_awg_ids(kode)}
                        alle_awg_ids |= ids
                        logger.info(f"  ✓ {kode} — {len(ids)} AWG-IDs")
                    except Exception as e:
                        logger.warning(f"  ✗ Schadorg-Kode {kode}: {e}")

                logger.info("Cache-Warmup abgeschlossen.")

            except Exception as e:
                logger.warning(f"Cache-Warmup Fehler: {e}")

    thread = threading.Thread(target=warmup, daemon=True)
    thread.start()