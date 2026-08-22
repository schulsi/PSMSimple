from datetime import datetime

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from ..repositories.settings_repo import get_setting, set_setting, get_settings
from ..services.permissions import require_admin
from ..extensions import db, logger
from ..models.ApplicationSetting import ApplicationSetting

settings_bp = Blueprint("settings", __name__)

BACKUP_FORMAT = "psmsimple-settings"
BACKUP_VERSION = 1

ALLOWED_SETTINGS = {"registration_allowed", "forecast_default_max_wind_ms", "forecast_default_max_precip_mm", "forecast_default_min_temp_c", "forecast_default_max_temp_c", "forecast_default_min_humidity_pct",
                    "forecast_default_dry_hours_after", "forecast_default_min_hour", "forecast_default_max_hour", "forecast_default_range_hours", "inventory_warn_default", "inventory_min_default",
                    "beratung_warmup_suchwörter", "aiEnabled"}


@settings_bp.route("/api/app/settings", methods=["GET"])
@login_required
@require_admin
def get_app_setting():
    """
    Anwendungseinstellungen abrufen
    ---
    tags:
      - Einstellungen
    responses:
      200:
        description: Einstellungen
      401:
        description: Nicht authentifiziert
      403:
        description: Admin-Berechtigung erforderlich
    """
    setting = get_settings()
    return jsonify(setting)


@settings_bp.route("/api/app/settings/inventory-defaults", methods=["GET"])
@login_required
def get_inventory_defaults():
    """
    Lager-Standardwerte fuer normale Formularnutzung abrufen
    ---
    tags:
      - Einstellungen
      - Inventory
    summary: Liefert die globalen Standardwerte fuer neue Lagerdaten
    responses:
      200:
        description: Lager-Standardwerte
        schema:
          type: object
          properties:
            inventory_min_default:
              type: string
              description: Standard-Mindestbestand
            inventory_warn_default:
              type: string
              description: Standard-Warnbestand
      401:
        description: Nicht authentifiziert
    """
    settings = get_settings()
    return jsonify({
        "inventory_min_default": settings.get("inventory_min_default", ""),
        "inventory_warn_default": settings.get("inventory_warn_default", ""),
    })


@settings_bp.route("/api/app/settings/<term>", methods=["GET"])
@login_required
@require_admin
def get_app_settings(term):
    """
    Spezifische Anwendungseinstellungen abrufen
    ---
    tags:
      - Einstellungen
    responses:
      200:
        description: Einstellungen
      401:
        description: Nicht authentifiziert
      403:
        description: Admin-Berechtigung erforderlich
    """
    setting = get_setting(term)
    return jsonify(setting)


@settings_bp.route("/api/app/settings", methods=["POST"])
@login_required
@require_admin
def update_app_settings():
    """
    Anwendungseinstellungen aktualisieren
    ---
    tags:
      - Einstellungen
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            registration_allowed:
              type: boolean
              description: Registrierung von neuen Benutzern erlauben
    responses:
      200:
        description: Einstellungen erfolgreich aktualisiert
      400:
        description: Ungültige Einstellung
      401:
        description: Nicht authentifiziert
      403:
        description: Admin-Berechtigung erforderlich
    """
    data = request.get_json(silent=True) or {}

    for key, value in data.items():
        if key not in ALLOWED_SETTINGS:
            return jsonify({"ok": False, "error": f"Setting '{key}' is not allowed."}), 400

        set_setting(key, value)
        logger.info(
            f"Setting '{key}' updated to '{value}' by user: {current_user.username} from IP: {request.remote_addr}"
        )

    return jsonify({"ok": True})


@settings_bp.route("/api/app/settings/backup", methods=["GET"])
@login_required
@require_admin
def export_app_settings_backup():
    """
    Globale Anwendungseinstellungen sichern
    ---
    tags:
      - Einstellungen
    summary: Erstellt ein versioniertes Backup der globalen Einstellungen
    description: >
      Liefert alle unterstützten globalen Anwendungseinstellungen als
      JSON-Dokument. Benutzerkonten und persönliche Benutzereinstellungen
      sind nicht Bestandteil des Backups.
    produces:
      - application/json
    responses:
      200:
        description: Backup erfolgreich erstellt
        schema:
          type: object
          required:
            - format
            - version
            - exported_at
            - settings
          properties:
            format:
              type: string
              enum:
                - psmsimple-settings
              example: psmsimple-settings
            version:
              type: integer
              enum:
                - 1
              example: 1
            exported_at:
              type: string
              format: date-time
              example: '2026-07-31T15:34:19.224000+00:00'
            settings:
              type: object
              description: Globale Einstellungen als Schlüssel-Wert-Paare
              additionalProperties:
                type: string
              example:
                registration_allowed: '1'
                forecast_default_max_wind_ms: '3.5'
                inventory_warn_default: '2'
                aiEnabled: '0'
      401:
        description: Nicht authentifiziert
      403:
        description: Admin-Berechtigung erforderlich
    """
    settings = get_settings()
    return jsonify({
        "format": BACKUP_FORMAT,
        "version": BACKUP_VERSION,
        "exported_at": datetime.now(datetime.UTC).isoformat(),
        "settings": {
            key: settings[key]
            for key in sorted(ALLOWED_SETTINGS)
            if key in settings
        },
    })


@settings_bp.route("/api/app/settings/backup", methods=["POST"])
@login_required
@require_admin
def import_app_settings_backup():
    """
    Globale Anwendungseinstellungen wiederherstellen
    ---
    tags:
      - Einstellungen
    summary: Spielt ein versioniertes Einstellungs-Backup ein
    description: >
      Validiert Format, Version, Einstellungsschlüssel und Werte und ersetzt
      die im Backup enthaltenen globalen Einstellungen atomar. Einstellungen,
      die nicht im Backup enthalten sind, bleiben unverändert.
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        description: Zuvor über den Backup-Endpunkt exportiertes JSON-Dokument
        schema:
          type: object
          required:
            - format
            - version
            - settings
          properties:
            format:
              type: string
              enum:
                - psmsimple-settings
              example: psmsimple-settings
            version:
              type: integer
              enum:
                - 1
              example: 1
            exported_at:
              type: string
              format: date-time
              description: Optionaler Exportzeitpunkt des Backups
            settings:
              type: object
              description: Wiederherzustellende globale Einstellungen
              additionalProperties:
                type: string
              example:
                registration_allowed: '1'
                forecast_default_max_wind_ms: '3.5'
                inventory_warn_default: '2'
                aiEnabled: '0'
    responses:
      200:
        description: Einstellungen erfolgreich wiederhergestellt
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: true
            settings:
              type: object
              description: Aktuelle globale Einstellungen nach dem Import
              additionalProperties:
                type: string
      400:
        description: Ungültiges JSON, Backup-Format oder Einstellungsdaten
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: false
            error:
              type: string
      401:
        description: Nicht authentifiziert
      403:
        description: Admin-Berechtigung erforderlich
      500:
        description: Datenbankfehler beim Wiederherstellen
        schema:
          type: object
          properties:
            ok:
              type: boolean
              example: false
            error:
              type: string
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"ok": False, "error": "Die Backup-Datei enthält kein gültiges JSON-Objekt."}), 400

    if data.get("format") != BACKUP_FORMAT or data.get("version") != BACKUP_VERSION:
        return jsonify({"ok": False, "error": "Unbekanntes oder nicht unterstütztes Backup-Format."}), 400

    settings = data.get("settings")
    if not isinstance(settings, dict):
        return jsonify({"ok": False, "error": "Das Backup enthält keine gültigen Einstellungen."}), 400

    unknown_keys = sorted(set(settings) - ALLOWED_SETTINGS)
    if unknown_keys:
        return jsonify({
            "ok": False,
            "error": f"Nicht unterstützte Einstellungen: {', '.join(unknown_keys)}",
        }), 400

    invalid_keys = [
        key for key, value in settings.items()
        if value is not None and not isinstance(value, (str, int, float, bool))
    ]
    if invalid_keys:
        return jsonify({
            "ok": False,
            "error": f"Ungültige Werte für: {', '.join(sorted(invalid_keys))}",
        }), 400

    try:
        for key, value in settings.items():
            setting = db.session.get(ApplicationSetting, key)
            if setting is None:
                setting = ApplicationSetting(key=key)
                db.session.add(setting)
            setting.value = None if value is None else str(value)
        db.session.commit()
    except Exception:
        db.session.rollback()
        logger.exception("Settings backup import failed")
        return jsonify({"ok": False, "error": "Das Backup konnte nicht eingespielt werden."}), 500

    logger.info(
        "Settings backup with %d values imported by user: %s from IP: %s",
        len(settings),
        current_user.username,
        request.remote_addr,
    )
    return jsonify({"ok": True, "settings": get_settings()})
