from __future__ import annotations

from dataclasses import dataclass
from typing import Any
import requests

from ..config import Config


class WeatherServiceError(Exception):
    pass


@dataclass
class SprayThresholds:
    max_wind_ms: float = 3.5
    max_precip_mm: float = 0.0
    min_temp_c: float = 8.0
    max_temp_c: float = 25.0
    min_humidity_pct: float = 50.0
    min_window_hours: int = 2
    dry_hours_after: int = 3


def _to_hourly_rows(hourly: dict[str, list[Any]]) -> list[dict[str, Any]]:
    times = hourly.get("time", [])
    keys = [k for k in hourly.keys() if k != "time"]

    rows: list[dict[str, Any]] = []
    for idx, ts in enumerate(times):
        row = {"time": ts}
        for key in keys:
            values = hourly.get(key, [])
            row[key] = values[idx] if idx < len(values) else None
        rows.append(row)
    return rows


def fetch_forecast(lat: float, lon: float, hours: int = 72) -> dict[str, Any]:
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "precipitation",
            "wind_speed_10m",
        ]),
        "forecast_hours": hours,
        "timezone": "auto",
        "wind_speed_unit": "ms",
        "precipitation_unit": "mm",
    }

    try:
        resp = requests.get(Config.OPEN_METEO_FORECAST_URL,
                            params=params, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise WeatherServiceError(
            f"Forecast konnte nicht geladen werden: {exc}") from exc

    data = resp.json()
    hourly = data.get("hourly")
    if not hourly or "time" not in hourly:
        raise WeatherServiceError(
            "Forecast-Antwort enthält keine hourly-Daten.")

    return {
        "meta": {
            "latitude": data.get("latitude"),
            "longitude": data.get("longitude"),
            "timezone": data.get("timezone"),
            "timezone_abbreviation": data.get("timezone_abbreviation"),
            "elevation": data.get("elevation"),
        },
        "rows": _to_hourly_rows(hourly),
    }


def geocode_location(query: str, count: int = 5) -> dict[str, Any]:
    params = {
        "name": query,
        "count": count,
        "language": "de",
        "format": "json",
    }

    try:
        resp = requests.get(Config.OPEN_METEO_GEOCODING_URL,
                            params=params, timeout=10)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise WeatherServiceError(f"Geocoding fehlgeschlagen: {exc}") from exc

    return resp.json()
