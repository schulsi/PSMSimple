from functools import wraps

from flask import jsonify
from flask_login import current_user, login_required

from ..models.user import User


def build_permissions(user) -> dict:
    is_admin = user.role == "admin"
    can_write = user.role in {"admin", "user"}

    return {
        "role": user.role,
        "is_admin": is_admin,
        "can_write": can_write,
        "can_manage_users": is_admin,
        "can_manage_global_settings": is_admin,
        "can_export": can_write,
        "can_edit_master_data": can_write,
        "read_only": user.role == "read-only",
    }


def require_admin(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if current_user.role != "admin":
            return jsonify({"ok": False, "error": "Keine Berechtigung."}), 403
        return fn(*args, **kwargs)
    return wrapper


def require_write_access(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if current_user.role == "read-only":
            return jsonify({"ok": False, "error": "Nur lesender Zugriff."}), 403
        return fn(*args, **kwargs)
    return wrapper