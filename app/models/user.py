from ..extensions import db
from flask_login import UserMixin
from sqlalchemy import CheckConstraint

class User(UserMixin, db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.relationship("UserRole", backref="users")
    role_id = db.Column(db.Integer, db.ForeignKey("user_roles.id"), nullable=False)

    def is_admin(self):
        return self.role and self.role.name == "admin"
    
    def can_write(self):
        return self.role and self.role.name in {"admin", "user"}
    
    def is_read_only(self):
        return self.role and self.role.name == "read-only"
    
    def to_public_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role.name if self.role else None,
        }

class UserRole(db.Model):
    __tablename__ = "user_roles"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

class UserSettings(db.Model):
    __tablename__ = "user_settings"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    browser_download = db.Column(db.Boolean, default=True, nullable=False)
    local_save = db.Column(db.Boolean, default=True, nullable=False)
    default_anwender = db.Column(db.String(200), nullable=True)
    default_verantwortlich = db.Column(db.String(200), nullable=True)

    @staticmethod
    def for_user(user_id):
        s = UserSettings.query.filter_by(user_id=user_id).first()
        if not s:
            s = UserSettings(user_id=user_id)
            db.session.add(s)
            db.session.commit()
        return s

    def to_dict(self):
        return {
            "browser_download": self.browser_download,
            "local_save": self.local_save,
            "default_anwender": self.default_anwender or "",
            "default_verantwortlich": self.default_verantwortlich or "",
        }