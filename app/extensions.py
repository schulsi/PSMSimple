from flask_login import LoginManager
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    headers_enabled=True,
)

login_manager.login_view = "auth.login"
login_manager.login_message = "Bitte melden Sie sich zuerst an."
login_manager.login_message_category = "error"