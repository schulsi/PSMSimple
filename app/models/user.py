from flask_login import UserMixin

from ..extensions import db


class User(UserMixin, db.Model):
    __bind_key__ = "user_db"
    __tablename__ = "users"
    __table_args__ = (
        db.Index("uq_users_oidc_identity", "oidc_issuer", "oidc_subject", unique=True),
    )

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(255), nullable=True)
    oidc_issuer = db.Column(db.String(500), nullable=True)
    oidc_subject = db.Column(db.String(255), nullable=True)
    role = db.relationship("UserRole", backref="users")
    role_id = db.Column(db.Integer, db.ForeignKey("user_roles.id"), nullable=False)

    def is_admin(self):
        return self.role and self.role.name == "admin"
    
    def can_write(self):
        return self.role and self.role.name in {"admin", "user"}
    
    def is_read_only(self):
        return self.role and self.role.name == "read-only"

    def uses_oidc(self):
        return bool(self.oidc_issuer and self.oidc_subject)

    def auth_method(self):
        return "oidc" if self.uses_oidc() else "local"
    
    def to_public_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role.name if self.role else None,
            "auth_method": self.auth_method(),
        }
