import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORTS_DIR = os.path.join(BASE_DIR, "exports")

class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production-supersecretkey")
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "users.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    APP_DATA_DB = os.path.join(BASE_DIR, "pflanzenschutz.db")
    EXPORTS_DIR = os.path.join(BASE_DIR, "exports")
    PSM_API = "https://psm-api.bvl.bund.de/ords/psm/api-v1/"