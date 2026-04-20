from .sqlite import get_db
from ..models.user import User
from ..models.UserRole import UserRole


def get_role_id(role_name):
    role = UserRole.query.filter_by(name=role_name).first()
    return role.id if role else None


def get_role_name(role_id):
    role = UserRole.query.get(role_id)
    return role.name if role else None
