from ..models import Kulturen
from ..services.psm_beratung_service import _get_kultur_awg_ids, _get_schad_awg_ids

import logging
import threading
import time

WARMUP_SCHADORG = [
    "ERYSSP",   # Echter Mehltau
    "BOTRCI",   # Grauschimmel (Botrytis)
    "PHYTIN",   # Kraut- und Knollenfäule
    "APHISS",   # Blattläuse allgemein
    "PUCCSF",   # Braunrost
    "FUSASP",   # Fusarium
    "SCLESP",   # Sklerotinia
    "AGRRSP",   # Wurzelhalsfäule
    "ALTESO",   # Alternaria
    "VERCCI",   # Verticillium
]

def _start_warmup_cache(app):

    def warmup():
        time.sleep(5)

        with app.app_context():
            try:
                logger = logging.getLogger(__name__)

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

                logger.info("Cache-Warmup abgeschlossen.")

                for kode in WARMUP_SCHADORG:
                    try:
                        ids = _get_schad_awg_ids(kode)
                        logger.info(f"  ✓ {kode} — {len(ids)} AWG-IDs")
                    except Exception as e:
                        logger.warning(f"  ✗ {kode}: {e}")

                logger.info("Cache-Warmup abgeschlossen.")

            except Exception as e:
                logging.getLogger(__name__).warning(f"Cache-Warmup Fehler: {e}")

    thread = threading.Thread(target=warmup, daemon=True)
    thread.start()