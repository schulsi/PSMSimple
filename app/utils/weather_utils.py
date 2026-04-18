from __future__ import annotations

from typing import Any
from requests import request
from datetime import datetime

from app.services.weather_service import SprayThresholds


def score_hour(
    row: dict[str, Any],
    future_rows: list[dict[str, Any]],
    thresholds: SprayThresholds,
) -> tuple[int, list[str], bool]:
    """
    Gibt zurück:
    - score
    - reasons
    - is_good
    """
    score = 0
    reasons: list[str] = []

    try:
        dt = datetime.fromisoformat(row["time"])
        hour = dt.hour
    except Exception:
        return 0, ["Ungültige Zeit"], False

    if thresholds.min_hour <= thresholds.max_hour:
        # Normaler Fall (z. B. 6–23)
        valid = thresholds.min_hour <= hour <= thresholds.max_hour
    else:
        # 🔥 Edge Case: über Mitternacht (z. B. 22–6)
        valid = hour >= thresholds.min_hour or hour <= thresholds.max_hour

    if not valid:
        return 0, ["Außerhalb erlaubter Uhrzeit"], False

    wind = row.get("wind_speed_10m")
    precip = row.get("precipitation")
    temp = row.get("temperature_2m")
    humidity = row.get("relative_humidity_2m")

    is_good = True

    if wind is None or wind > thresholds.max_wind_ms:
        is_good = False
        reasons.append("Wind zu hoch")
    else:
        score += 3 if wind <= 2.5 else 2

    if precip is None or precip > thresholds.max_precip_mm:
        is_good = False
        reasons.append("Niederschlag vorhanden")
    else:
        score += 3

    if temp is None or temp < thresholds.min_temp_c or temp > thresholds.max_temp_c:
        is_good = False
        reasons.append("Temperatur ungeeignet")
    else:
        score += 2

    if humidity is None or humidity < thresholds.min_humidity_pct:
        is_good = False
        reasons.append("Luftfeuchte zu niedrig")
    else:
        score += 1

    # Folge-Stunden trocken?
    for nxt in future_rows[:thresholds.dry_hours_after]:
        nxt_precip = nxt.get("precipitation")
        if nxt_precip is None or nxt_precip > thresholds.max_precip_mm:
            is_good = False
            reasons.append("Nicht ausreichend trocken in den Folge-Stunden")
            break

    return score, reasons, is_good


def build_windows(
    rows: list[dict[str, Any]],
    thresholds: SprayThresholds,
) -> dict[str, Any]:

    evaluated: list[dict[str, Any]] = []

    for idx, row in enumerate(rows):
        future_rows = rows[idx + 1: idx + 1 + thresholds.dry_hours_after]
        score, reasons, is_good = score_hour(row, future_rows, thresholds)
        evaluated.append({
            **row,
            "score": score,
            "reasons": reasons,
            "is_good": is_good,
        })

    windows: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None

    for item in evaluated:
        if item["is_good"]:
            if current is None:
                current = {
                    "start": item["time"],
                    "end": item["time"],
                    "hours": [item],
                }
            else:
                current["end"] = item["time"]
                current["hours"].append(item)
        else:
            if current is not None:
                duration = len(current["hours"])
                if duration >= thresholds.min_window_hours:
                    current["duration_hours"] = duration
                    current["avg_score"] = round(
                        sum(h["score"] for h in current["hours"]) / duration, 2
                    )
                    windows.append(current)
                current = None

    if current is not None:
        duration = len(current["hours"])
        if duration >= thresholds.min_window_hours:
            current["duration_hours"] = duration
            current["avg_score"] = round(
                sum(h["score"] for h in current["hours"]) / duration, 2
            )
            windows.append(current)

    windows.sort(
        key=lambda w: (w["avg_score"], w["duration_hours"]),
        reverse=True,
    )

    return {
        "best_window": windows[0] if windows else None,
        "windows": windows,
        "evaluated_hours": evaluated,
    }
