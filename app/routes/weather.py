from flask import Blueprint, jsonify, request

from app.services.weather_service import (
    SprayThresholds,
    WeatherServiceError,
    fetch_forecast,
    geocode_location,
)
from ..utils.weather_utils import build_windows
from ..services.permissions import login_required
from ..repositories.einsatzorte_repo import get_einsatzort_by_id

bp = Blueprint("weather", __name__)


def _parse_float(name: str, default: float | None = None) -> float | None:
    value = request.args.get(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return None


def _parse_int(name: str, default: int) -> int:
    value = request.args.get(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


@bp.post("/api/weather/forecast")
@login_required
def weather_forecast():
    """
    Wettervorhersage (stündlich) für einen Standort abrufen
    ---
    tags:
      - Weather
    summary: Holt stündliche Wetterdaten von Open-Meteo
    description: |
      Liefert stündliche Wetterdaten (Temperatur, Luftfeuchte, Niederschlag, Wind)
      für die angegebene Position.
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - lat
            - lon
          properties:
            lat:
              type: number
              example: 48.076
            lon:
              type: number
              example: 7.708
            hours:
              type: integer
              example: 72
              description: Anzahl der Forecast-Stunden (Standard 72)
    responses:
      200:
        description: Erfolgreiche Antwort
        schema:
          type: object
          properties:
            error:
              type: boolean
              example: false
            meta:
              type: object
              properties:
                latitude:
                  type: number
                longitude:
                  type: number
                timezone:
                  type: string
            rows:
              type: array
              items:
                type: object
                properties:
                  time:
                    type: string
                    example: "2026-04-18T06:00"
                  temperature_2m:
                    type: number
                  relative_humidity_2m:
                    type: number
                  precipitation:
                    type: number
                  wind_speed_10m:
                    type: number
      400:
        description: Ungültige Anfrage
      502:
        description: Fehler bei Open-Meteo API
    """

    data = request.get_data(silent=True)
    if not data:
        return jsonify({"ok": False, "message": "No data send"}), 400

    lat = data.get("lat")
    lon = data.get("lon")
    hours = int(data.get("hours", 72))

    if lat is None or lon is None:
        return jsonify({
            "error": True,
            "message": "lat und lon sind erforderlich"
        }), 400

    try:
        result = fetch_forecast(lat=float(lat), lon=float(lon), hours=hours)
        return jsonify({"error": False, **result})
    except WeatherServiceError as exc:
        return jsonify({"error": True, "message": str(exc)}), 502


@bp.get("/api/weather/spray-window")
@login_required
def spray_window():
    """
    Bestes Spritzfenster berechnen
    ---
    tags:
      - Weather
    summary: Berechnet optimale Zeitfenster für Pflanzenschutz-Anwendungen
    description: |
      Bewertet Wetterdaten anhand agronomischer Kriterien und liefert optimale Zeitfenster
      für Pflanzenschutzmaßnahmen.

      Kriterien:
      - Windgeschwindigkeit
      - Niederschlag
      - Temperatur
      - Luftfeuchtigkeit
      - Trockenheit in den Folge-Stunden
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - lat
            - lon
          properties:
            lat:
              type: number
              example: 48.076
            lon:
              type: number
              example: 7.708
            hours:
              type: integer
              example: 72
            thresholds:
              type: object
              properties:
                max_wind_ms:
                  type: number
                  example: 3.5
                max_precip_mm:
                  type: number
                  example: 0.0
                min_temp_c:
                  type: number
                  example: 8
                max_temp_c:
                  type: number
                  example: 25
                min_humidity_pct:
                  type: number
                  example: 50
                min_window_hours:
                  type: integer
                  example: 2
                dry_hours_after:
                  type: integer
                  example: 3
    responses:
      200:
        description: Erfolgreich berechnete Spritzfenster
        schema:
          type: object
          properties:
            error:
              type: boolean
              example: false
            meta:
              type: object
            thresholds:
              type: object
            best_window:
              type: object
              nullable: true
              properties:
                start:
                  type: string
                end:
                  type: string
                duration_hours:
                  type: integer
                avg_score:
                  type: number
            windows:
              type: array
              items:
                type: object
            evaluated_hours:
              type: array
              items:
                type: object
      400:
        description: Ungültige Eingabe
      502:
        description: Fehler bei Wetterdaten
    """

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": True, "message": "No data send"}), 400

    lat = data.get("lat")
    lon = data.get("lon")

    if lat is None or lon is None:
        return jsonify({
            "error": True,
            "message": "lat und lon sind erforderlich"
        }), 400

    hours = int(data.get("hours", 72))

    t = data.get("thresholds", {}) or {}

    thresholds = SprayThresholds(
        max_wind_ms=float(t.get("max_wind_ms", 3.5)),
        max_precip_mm=float(t.get("max_precip_mm", 0.0)),
        min_temp_c=float(t.get("min_temp_c", 8.0)),
        max_temp_c=float(t.get("max_temp_c", 25.0)),
        min_humidity_pct=float(t.get("min_humidity_pct", 50.0)),
        min_window_hours=int(t.get("min_window_hours", 2)),
        dry_hours_after=int(t.get("dry_hours_after", 3)),
    )

    try:
        forecast = fetch_forecast(
            lat=float(lat),
            lon=float(lon),
            hours=hours
        )

        window_result = build_windows(
            forecast["rows"],
            thresholds
        )

        return jsonify({
            "error": False,
            "meta": forecast["meta"],
            "thresholds": thresholds.__dict__,
            **window_result,
        })

    except WeatherServiceError as exc:
        return jsonify({
            "error": True,
            "message": str(exc)
        }), 502


@bp.get("/api/weather/geocode")
@login_required
def geocode():
    """
    Standortsuche (Geocoding)
    ---
    tags:
      - Weather
    summary: Sucht Orte und liefert Koordinaten
    description: |
      Wandelt einen Ortsnamen oder eine PLZ in geografische Koordinaten um.
      Nutzt die Open-Meteo Geocoding API.
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - q
          properties:
            q:
              type: string
              example: "Bötzingen"
    responses:
      200:
        description: Erfolgreiche Standortsuche
        schema:
          type: object
          properties:
            error:
              type: boolean
              example: false
            results:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  latitude:
                    type: number
                  longitude:
                    type: number
                  country:
                    type: string
      400:
        description: Suchbegriff fehlt
      502:
        description: Fehler bei Geocoding API
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": True, "message": "No data send"}), 400

    query = (data.get("q") or "").strip()

    if not query:
        return jsonify({
            "error": True,
            "message": "q ist erforderlich"
        }), 400

    try:
        result = geocode_location(query)
        return jsonify({"error": False, **result})
    except WeatherServiceError as exc:
        return jsonify({"error": True, "message": str(exc)}), 502


@bp.post("/api/einsatzorte/<int:einsatzort_id>/spray-window")
@login_required
def spray_window_for_einsatzort(einsatzort_id: int):
    """
    Spritzfenster für einen Einsatzort berechnen
    ---
    tags:
      - Einsatzorte
      - Weather
    summary: Berechnet das beste Spritzfenster für einen gespeicherten Einsatzort
    description: |
      Nutzt die hinterlegten Koordinaten eines Einsatzortes und berechnet
      optimale Zeitfenster für Pflanzenschutz-Anwendungen.

      Kein lat/lon erforderlich – wird aus der Datenbank geladen.
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - name: einsatzort_id
        in: path
        type: integer
        required: true
        description: ID des Einsatzortes
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            hours:
              type: integer
              example: 72
            thresholds:
              type: object
              properties:
                max_wind_ms:
                  type: number
                  example: 3.5
                max_precip_mm:
                  type: number
                  example: 0.0
                min_temp_c:
                  type: number
                  example: 8
                max_temp_c:
                  type: number
                  example: 25
                min_humidity_pct:
                  type: number
                  example: 50
                min_window_hours:
                  type: integer
                  example: 2
                dry_hours_after:
                  type: integer
                  example: 3
    responses:
      200:
        description: Erfolgreiche Berechnung
        schema:
          type: object
          properties:
            error:
              type: boolean
              example: false
            einsatzort_id:
              type: integer
            best_window:
              type: object
              nullable: true
            windows:
              type: array
            evaluated_hours:
              type: array
      404:
        description: Einsatzort nicht gefunden
      502:
        description: Fehler bei Wetterdaten
    """

    data = request.get_json(silent=True)

    eo = get_einsatzort_by_id(einsatzort_id)

    if not eo:
        return jsonify({"error": True, "message": "Einsatzort nicht gefunden"}), 404

    lat = eo.get("gpsHochwert")
    lon = eo.get("gpsRechtswert")

    hours = int((data or {}).get("hours", 72))
    t = (data or {}).get("thresholds", {}) or {}

    thresholds = SprayThresholds(
        max_wind_ms=float(t.get("max_wind_ms", 3.5)),
        max_precip_mm=float(t.get("max_precip_mm", 0.0)),
        min_temp_c=float(t.get("min_temp_c", 8.0)),
        max_temp_c=float(t.get("max_temp_c", 25.0)),
        min_humidity_pct=float(t.get("min_humidity_pct", 50.0)),
        min_window_hours=int(t.get("min_window_hours", 2)),
        dry_hours_after=int(t.get("dry_hours_after", 3)),
        min_hour=int(t.get("min_hour", 6)),
        max_hour=int(t.get("max_hour", 23)),
    )

    try:
        forecast = fetch_forecast(lat=float(lat), lon=float(lon), hours=hours)
        window_result = build_windows(forecast["rows"], thresholds)

        return jsonify({
            "error": False,
            "einsatzort_id": einsatzort_id,
            "meta": forecast["meta"],
            "thresholds": thresholds.__dict__,
            **window_result,
        })

    except WeatherServiceError as exc:
        return jsonify({"error": True, "message": str(exc)}), 502
