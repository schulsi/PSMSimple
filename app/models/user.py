from ..extensions import db
from flask_login import UserMixin

class User(UserMixin, db.Model):
    __bind_key__ = "user_db"
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
