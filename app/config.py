import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR    = os.environ.get("DATA_DIR", os.path.join(BASE_DIR, "data"))

DB_DIR      = os.path.join(DATA_DIR, "databases")
EXPORT_DIR  = os.path.join(DATA_DIR, "exports")

os.makedirs(DB_DIR,     exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)

DB = os.path.join(DB_DIR, "pflanzenschutz.db")

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
 #   SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
 #   REMEMBER_COOKIE_SECURE = True
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = "Lax"
    RATELIMIT_STORAGE_URL = os.environ.get("RATELIMIT_STORAGE_URI", "memory://")
    RATELIMIT_STRATEGY = "fixed-window"
    RATELIMIT_HEADER_ENABLED = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(DB_DIR, "users.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    APP_DATA_DB = os.path.join(DB_DIR, "pflanzenschutz.db")
    EXPORTS_DIR = os.path.join(EXPORT_DIR)
    PSM_API = "https://psm-api.bvl.bund.de/ords/psm/api-v1/"