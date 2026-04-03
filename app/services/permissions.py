from functools import wraps

from flask import jsonify
from flask_login import current_user, login_required

from ..extensions import db
from ..models.user import User, UserRole
from ..repositories.role_repo import get_role_id, get_role_name

ROLES = { "admin", "user", "read-only" }

def build_permissions(user) -> dict:
    is_admin = user.role_id == get_role_id("admin")
    can_write = user.role_id in {get_role_id("admin"), get_role_id("user")}

    return {
        "role": get_role_name(user.role_id),
        "is_admin": is_admin,
        "can_write": can_write,
        "can_manage_users": is_admin,
        "can_manage_global_settings": is_admin,
        "can_export": can_write,
        "can_edit_master_data": can_write,
        "read_only": user.role_id == get_role_id("read-only"),
    }

def seed_roles():
    for role_name in ROLES:
        exists = db.session.query(UserRole).filter_by(name=role_name).first()
        if not exists:
            db.session.add(UserRole(name=role_name))
    db.session.commit()
    
def require_admin(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if current_user.role_id != get_role_id("admin"):
            return jsonify({"ok": False, "error": "Keine Berechtigung."}), 403
        return fn(*args, **kwargs)
    return wrapper


def require_write_access(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if current_user.role_id == get_role_id("read-only"):
            return jsonify({"ok": False, "error": "Nur lesender Zugriff."}), 403
        return fn(*args, **kwargs)
    return wrapper