from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask.logging import default_handler
from flasgger import Swagger

import logging
import os

from .config import Config

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s", filename=os.path.join(Config.LOG_DIR, "psm.log"), filemode="a")
logger = logging.getLogger(__name__)
logger.addHandler(default_handler)
logging.info("Starting application...")

swagger = Swagger()

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    headers_enabled=True,
    storage_uri=Config.RATELIMIT_STORAGE_URI
)

login_manager.login_view = "auth.login"
login_manager.login_message = "Bitte melden Sie sich zuerst an."
login_manager.login_message_category = "error"