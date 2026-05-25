from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from flask import current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from ..models.Meldungen import MELDUNG_TYPEN, PRIORITAET, STATUS
from ..repositories.meldungen_repo import (
    delete_meldung,
    delete_meldung_foto,
    get_meldung,
    get_meldung_foto,
    insert_meldung,
    insert_meldung_foto,
    list_meldung_fotos,
    list_meldungen,
    update_meldung,
)


ALLOWED_PHOTO_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}


def get_meldung_metadata() -> dict:
    return {
        "typen": MELDUNG_TYPEN,
        "status": STATUS,
        "prioritaet": PRIORITAET,
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _optional_int(value) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def _optional_float(value) -> float | None:
    if value in (None, ""):
        return None
    return float(value)


def _validate_choice(value: str, allowed: list[str], field: str) -> str:
    if value not in allowed:
        raise ValueError(f"Ungültiger Wert für {field}: '{value}'. Erlaubt: {allowed}")
    return value


def _build_meldung_payload(data: dict, *, existing: dict | None = None) -> dict:
    payload = {}

    if "flaeche_id" in data:
        payload["flaeche_id"] = _optional_int(data.get("flaeche_id"))

    if "datum" in data:
        datum = str(data.get("datum") or "").strip()
        if not datum:
            raise ValueError("datum darf nicht leer sein")
        payload["datum"] = datum

    if "typ" in data:
        typ = str(data.get("typ") or "").strip()
        payload["typ"] = _validate_choice(typ, MELDUNG_TYPEN, "typ")

    if "titel" in data:
        titel = str(data.get("titel") or "").strip()
        if not titel:
            raise ValueError("titel darf nicht leer sein")
        payload["titel"] = titel

    if "beschreibung" in data:
        payload["beschreibung"] = (str(data.get("beschreibung") or "").strip() or None)

    if "status" in data:
        status = str(data.get("status") or "offen").strip()
        payload["status"] = _validate_choice(status, STATUS, "status")

    if "prioritaet" in data:
        prioritaet = str(data.get("prioritaet") or "normal").strip()
        payload["prioritaet"] = _validate_choice(prioritaet, PRIORITAET, "prioritaet")

    if "latitude" in data:
        payload["latitude"] = _optional_float(data.get("latitude"))

    if "longitude" in data:
        payload["longitude"] = _optional_float(data.get("longitude"))

    if existing is None:
        required = ["datum", "typ", "titel"]
        missing = [field for field in required if field not in payload]
        if missing:
            raise ValueError(f"Pflichtfelder fehlen: {', '.join(missing)}")

        payload.setdefault("status", "offen")
        payload.setdefault("prioritaet", "normal")
        now = _now_iso()
        payload["created_at"] = now
        payload["updated_at"] = now
    else:
        payload["updated_at"] = _now_iso()

    return payload


def list_meldungen_service(
    *,
    flaeche_id: int | None = None,
    status: str | None = None,
    typ: str | None = None,
    limit: int = 200,
) -> list[dict]:
    if status:
        _validate_choice(status, STATUS, "status")
    if typ:
        _validate_choice(typ, MELDUNG_TYPEN, "typ")

    return list_meldungen(flaeche_id=flaeche_id, status=status, typ=typ, limit=limit)


def get_meldung_service(meldung_id: int) -> dict:
    item = get_meldung(meldung_id)
    if not item:
        raise LookupError("Meldung nicht gefunden")
    return item


def create_meldung_service(data: dict) -> dict:
    return insert_meldung(_build_meldung_payload(data))


def update_meldung_service(meldung_id: int, data: dict) -> dict:
    existing = get_meldung(meldung_id)
    if not existing:
        raise LookupError("Meldung nicht gefunden")

    updated = update_meldung(meldung_id, _build_meldung_payload(data, existing=existing))
    if not updated:
        raise LookupError("Meldung nicht gefunden")
    return updated


def delete_meldung_service(meldung_id: int) -> None:
    item = get_meldung_service(meldung_id)
    for foto in item.get("fotos", []):
        _delete_photo_file(foto)

    if not delete_meldung(meldung_id):
        raise LookupError("Meldung nicht gefunden")


def _photo_root() -> Path:
    root = current_app.config.get("MELDUNG_FOTO_DIR")
    if root:
        return Path(root)
    return Path(current_app.config["BASE_DIR"]) / "data" / "meldung_fotos"


def _allowed_photo(filename: str) -> bool:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return extension in ALLOWED_PHOTO_EXTENSIONS


def add_meldung_foto_service(meldung_id: int, file: FileStorage) -> dict:
    get_meldung_service(meldung_id)

    if not file or not file.filename:
        raise ValueError("Keine Datei hochgeladen")

    original_name = secure_filename(file.filename)
    if not original_name or not _allowed_photo(original_name):
        raise ValueError(f"Ungültiger Dateityp. Erlaubt: {sorted(ALLOWED_PHOTO_EXTENSIONS)}")

    storage_dir = _photo_root() / str(meldung_id)
    storage_dir.mkdir(parents=True, exist_ok=True)

    extension = original_name.rsplit(".", 1)[-1].lower()
    filename = f"{uuid4().hex}.{extension}"
    target = storage_dir / filename
    file.save(target)

    relative_path = f"{meldung_id}/{filename}"
    return insert_meldung_foto({
        "meldung_id": meldung_id,
        "filename": original_name,
        "path": relative_path,
        "created_at": _now_iso(),
    })


def list_meldung_fotos_service(meldung_id: int) -> list[dict]:
    get_meldung_service(meldung_id)
    return list_meldung_fotos(meldung_id)


def get_meldung_foto_file(foto_id: int) -> tuple[dict, Path]:
    foto = get_meldung_foto(foto_id)
    if not foto:
        raise LookupError("Foto nicht gefunden")

    path = _photo_root() / foto["path"]
    if not path.exists():
        raise FileNotFoundError("Fotodatei nicht gefunden")

    return foto, path


def delete_meldung_foto_service(foto_id: int) -> None:
    foto = delete_meldung_foto(foto_id)
    if not foto:
        raise LookupError("Foto nicht gefunden")
    _delete_photo_file(foto)


def _delete_photo_file(foto: dict) -> None:
    path = _photo_root() / foto["path"]
    if path.exists() and path.is_file():
        path.unlink()
