from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user

from ..repositories.settings_repo import get_setting, set_setting, get_settings
from ..services.permissions import require_admin
from ..extensions import logger

settings_bp = Blueprint("settings", __name__)

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
    Lager-Standardwerte für normale Formularnutzung abrufen.
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
