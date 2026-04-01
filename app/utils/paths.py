from datetime import datetime
from pathlib import Path
import re
from ..config import Config

EXPORT_DIR =Path(Config.EXPORTS_DIR)  
BASE_DIR =Path(__file__).resolve().parents[2]

from ..config import Config

BASE_DIR = Config.BASE_DIR
EXPORT_DIR = Config.EXPORTS_DIR

def slugify(value: str, fallback: str = "export") -> str:
    value = (value or "").strip()
    if not value:
        return fallback
    value = value.replace(" ", "_")
    value = re.sub(r"[^A-Za-z0-9_\-äöüÄÖÜß]", "", value)
    return value or fallback

def create_save_path(datum: str | None = None) -> Path:
    now = datetime.strptime(datum, "%Y-%m-%d") if datum else datetime.now()
    path = EXPORT_DIR / str(now.year) / f"{now.month:02d}_{now.strftime('%B')}"
    path.mkdir(parents=True, exist_ok=True)
    return path

def build_export_filename(data: dict, ext: str) -> str:
    eo_name = slugify(
        data["einsatzorte"][0]["name"] if data.get("einsatzorte") else "export"
    )
    datum = (data.get("anwendung", {}).get("datum") or "").replace("-", "") or "undated"
    psm_slug = slugify(
        data["pflanzenschutzmittel"][0]["name"] if data.get("pflanzenschutzmittel") else "PSM"
    )
    return f"PSM_Anwendung_{datum}_{psm_slug}_{eo_name}.{ext}"