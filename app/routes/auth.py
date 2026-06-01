from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import re

from ..extensions import db, limiter, logger
from ..models.user import User
from ..repositories.settings_repo import get_setting, set_setting
from ..repositories.role_repo import get_role_id

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{2,50}$")
bp = Blueprint("auth", __name__)


def login_bucket():
    username = (request.form.get("username") or "").strip().lower()
    if username:
        return f"{request.remote_addr}:{username}"
    return request.remote_addr or "unknown"


@bp.route("/login", methods=["GET", "POST"])
@limiter.limit("10 per minute")
@limiter.limit("5 per 10 minute", key_func=login_bucket, methods=["POST"])
def login():
    """
    Anmeldepage und Login-Verarbeitung
    ---
    tags:
      - Authentifizierung
    responses:
      200:
        description: Login-Seite (GET) oder Weiterleitung nach erfolgreicher Anmeldung (302)
      400:
        description: Ungültige Kredenziale
    """
    setting = get_setting("registration_allowed")

    if current_user.is_authenticated:
        return redirect(url_for("pages.index"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            logger.info(
                f"User '{username}' logged in successfully from IP: {request.remote_addr}")
            return redirect(url_for("pages.index"))

        flash("Ungültiger Benutzername oder Passwort.", "error")
        logger.warning(
            f"Failed login attempt for username: {username} from IP: {request.remote_addr}")

    return render_template("login.html", registration_allowed=setting)


@bp.route("/register", methods=["POST"])
@limiter.limit("3 per hour", methods=["POST"])
def register():
    """
    Benutzerregistrierung
    ---
    tags:
      - Authentifizierung
    parameters:
      - in: formData
        name: username
        type: string
        required: true
        description: Benutzername (2-50 Zeichen, alphanumerisch, Punkt, Bindestrich, Unterstrich)
      - in: formData
        name: password
        type: password
        required: true
        description: Passwort (6+ Zeichen, mindestens Großbuchstabe, Kleinbuchstabe, Zahl)
      - in: formData
        name: password2
        type: password
        required: true
        description: Passwortbestätigung
    responses:
      302:
        description: Weiterleitung nach erfolgreicher Registrierung
      400:
        description: Validierungsfehler
      403:
        description: Registrierung deaktiviert
    """
    registration_allowed = get_setting("registration_allowed") == "1"
    is_first_user = User.query.count() == 0
    if not registration_allowed and not is_first_user:
        flash("Registrierung ist derzeit nicht erlaubt.", "error")
        return redirect(url_for("auth.login") + "?tab=register")

    username = request.form.get("username", "").strip()
    password = request.form.get("password", "")
    password2 = request.form.get("password2", "")

    if not username or not password:
        flash("Bitte alle Felder ausfüllen.", "error")
        return redirect(url_for("auth.login") + "?tab=register")

    if password != password2:
        flash("Die Passwörter stimmen nicht überein.", "error")
        return redirect(url_for("auth.login") + "?tab=register")

    if len(password) < 6:
        flash("Das Passwort muss mindestens 6 Zeichen lang sein.", "error")
        return redirect(url_for("auth.login") + "?tab=register")

    if User.query.filter_by(username=username).first():
        flash("Dieser Benutzername ist bereits vergeben.", "error")
        return redirect(url_for("auth.login") + "?tab=register")

    if re.match(USERNAME_RE, username) is None:
        flash("Ungültige Zeichen im Benutzernamen. Erlaubt sind Buchstaben, Zahlen, Unterstrich, Bindestrich und Punkt.", "error")
        return redirect(url_for("auth.login") + "?tab=register")

    if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password) or not re.search(r"[0-9]", password):
        flash("Das Passwort muss mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten.", "error")
        return redirect(url_for("auth.login") + "?tab=register")

    
    if is_first_user:
        role = int(get_role_id("admin"))
    else:
        role = int(get_role_id("user"))

    new_user = User(
        username=username,
        password=generate_password_hash(password),
        role_id=role
    )
    db.session.add(new_user)
    db.session.commit()
    logger.info(
        f"New user '{username}' registered with role '{'admin' if is_first_user else 'user'}' from IP: {request.remote_addr}")
    flash(
        f"Konto für {username} erfolgreich erstellt. Bitte jetzt anmelden.", "success")
    if is_first_user:
        set_setting("registration_allowed", "0")  
    return redirect(url_for("auth.login"))


@bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """
    Benutzer abmelden
    ---
    tags:
      - Authentifizierung
    responses:
      302:
        description: Weiterleitung zum Login nach erfolgreichem Logout
      401:
        description: Nicht authentifiziert
    """
    logger.info(
        f"User '{current_user.username}' logged out from IP: {request.remote_addr}")

    logout_user()
    flash("Sie wurden abgemeldet.", "success")
    return redirect(url_for("auth.login"))
