from ..models.ApplicationSetting import ApplicationSetting
from ..extensions import db

def get_db():
    return db

def init_appdata_db():
    defaults = {
        "registration_allowed": "1",
        "inventory_warn_default": "2",
        "inventory_min_default": "2",
        "forecast_default_max_wind_ms": "3.5",
        "forecast_default_max_precip_mm": "0",
        "forecast_default_min_temp_c": "8",
        "forecast_default_max_temp_c": "25",
        "forecast_default_min_humidity_pct": "50",
        "forecast_default_dry_hours_after": "3",
        "forecast_default_min_hour": "6",
        "forecast_default_max_hour": "23",
        "forecast_default_range_hours": "72",
        "aiEnabled": "0"
    }
    for key, value in defaults.items():
        existing = db.session.get(ApplicationSetting, key)
        if existing is None:
            db.session.add(ApplicationSetting(key=key, value=value))

    db.session.commit()
