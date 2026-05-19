import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))

DB_DIR = os.path.join(DATA_DIR, "databases")
EXPORT_DIR = os.path.join(DATA_DIR, "exports")
LOG_DIR = os.path.join(DATA_DIR, "logs")

os.makedirs(DB_DIR,     exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)
os.makedirs(LOG_DIR,    exist_ok=True)

DB = os.path.join(DB_DIR, "app.db")


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
 #   SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
 #   REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = "Lax"
    RATELIMIT_STORAGE_URI = os.environ.get(
        "RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_STRATEGY = "fixed-window"
    RATELIMIT_HEADER_ENABLED = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)
    SESSION_REFRESH_EACH_REQUEST = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(DB_DIR + "/users.db")
    SQLALCHEMY_BINDS = {
        "app_db": f"sqlite:///{DB_DIR}/app.db",
        "user_db": f"sqlite:///{DB_DIR}/users.db",
    }
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    APP_DATA_DB = os.path.join(DB_DIR, "pflanzenschutz.db")
    EXPORTS_DIR = os.path.join(EXPORT_DIR)
    PSM_API = "https://psm-api.bvl.bund.de/ords/psm/api-v1/"
    BASE_DIR = BASE_DIR
    LOG_DIR = LOG_DIR
    SWAGGER = {"title": "PSM API", "uiversion": 3, "securityDefinitions": {"cookieAuth": {"type": "apiKey", "in": "cookie", "name": "session"}}
               }
    OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
    LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "anthropic")
    LLM_MODEL = os.environ.get("LLM_MODEL")
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
    OPENAI_BASE_URL = os.environ.get(
        "OPENAI_BASE_URL", "https://api.openai.com/v1")
    CACHE_REDIS_URL = os.environ.get("CACHE_REDIS_URL")
    if not CACHE_REDIS_URL and RATELIMIT_STORAGE_URI.startswith(("redis://", "rediss://")):
        CACHE_REDIS_URL = RATELIMIT_STORAGE_URI
    CACHE_TYPE = "RedisCache" if CACHE_REDIS_URL else "FileSystemCache"
    CACHE_DIR = os.path.join(DATA_DIR, "cache") if CACHE_TYPE == "FileSystemCache" else None
    CACHE_DEFAULT_TIMEOUT = 60 * 60 * 24 * 20  # 20d — BVL aktualisiert monatlich
    CACHE_THRESHOLD = 10000  # Maximal 10.000 Einträge im Cache (je nach Größe der Einträge anpassen)
    NO_COLOR = 1
    UPDATE_URL = ""
    if not SECRET_KEY:
        raise RuntimeError("SECRET_KEY environment variable is not set.")
