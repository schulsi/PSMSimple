import hashlib
import re
import secrets

from authlib.integrations.base_client.errors import OAuthError
from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from flask_login import login_user, logout_user, login_required, current_user
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db, limiter, logger, oauth
from ..models.user import User
from ..repositories.settings_repo import get_setting, set_setting
from ..repositories.role_repo import get_role_id

USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{2,50}$")
bp = Blueprint("auth", __name__)


def local_auth_enabled():
    return current_app.config["AUTH_MODE"] in {"local", "hybrid"}


def oidc_auth_enabled():
    return current_app.config["OIDC_ENABLED"]


def oidc_username(userinfo):
    candidate = (
        userinfo.get("preferred_username")
        or (userinfo.get("email") or "").split("@", 1)[0]
        or userinfo.get("name")
        or "oidc-user"
    )
    candidate = re.sub(r"[^A-Za-z0-9_.-]+", "-", str(candidate)).strip("._-")
    if len(candidate) < 2:
        candidate = "oidc-user"
    candidate = candidate[:50]

    if not User.query.filter_by(username=candidate).first():
        return candidate

    suffix = hashlib.sha256(str(userinfo["sub"]).encode("utf-8")).hexdigest()[:8]
    candidate = f"{candidate[:41]}-{suffix}"
    counter = 2
    while User.query.filter_by(username=candidate).first():
        counter_suffix = f"-{counter}"
        candidate = f"{candidate[:50 - len(counter_suffix)]}{counter_suffix}"
        counter += 1
    return candidate


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
    setting = get_setting("registration_allowed") if local_auth_enabled() else "0"

    if current_user.is_authenticated:
        return redirect(url_for("pages.index"))

    if request.method == "POST":
        if not local_auth_enabled():
            flash("Die lokale Anmeldung ist deaktiviert. Bitte verwenden Sie SSO.", "error")
            return redirect(url_for("auth.login"))

        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            session.clear()
            login_user(user)
            logger.info(
                f"User '{username}' logged in successfully from IP: {request.remote_addr}")
            return redirect(url_for("pages.index"))

        flash("Ungültiger Benutzername oder Passwort.", "error")
        logger.warning(
            f"Failed login attempt for username: {username} from IP: {request.remote_addr}")

    return render_template(
        "login.html",
        registration_allowed=setting,
        local_auth_enabled=local_auth_enabled(),
        oidc_enabled=oidc_auth_enabled(),
        oidc_provider_name=current_app.config["OIDC_PROVIDER_NAME"],
    )


@bp.route("/login/oidc", methods=["GET"])
@limiter.limit("20 per minute")
def oidc_login():
    if not oidc_auth_enabled():
        flash("SSO ist nicht konfiguriert.", "error")
        return redirect(url_for("auth.login"))
    if current_user.is_authenticated:
        return redirect(url_for("pages.index"))

    session["oidc_action"] = "login"
    redirect_uri = url_for("auth.oidc_callback", _external=True)
    return oauth.oidc.authorize_redirect(redirect_uri)


@bp.route("/auth/oidc/link", methods=["GET"])
@login_required
def oidc_link():
    if not oidc_auth_enabled():
        flash("SSO ist nicht konfiguriert.", "error")
        return redirect(url_for("pages.index"))

    session["oidc_action"] = "link"
    redirect_uri = url_for("auth.oidc_callback", _external=True)
    return oauth.oidc.authorize_redirect(redirect_uri)


@bp.route("/auth/oidc/callback", methods=["GET"])
@limiter.limit("20 per minute")
def oidc_callback():
    if not oidc_auth_enabled():
        flash("SSO ist nicht konfiguriert.", "error")
        return redirect(url_for("auth.login"))

    action = session.pop("oidc_action", "login")
    try:
        token = oauth.oidc.authorize_access_token()
    except OAuthError as exc:
        logger.warning(
            "OIDC login failed (%s) from IP: %s",
            exc.error or "oauth_error",
            request.remote_addr,
        )
        flash("Die SSO-Anmeldung ist fehlgeschlagen. Bitte versuchen Sie es erneut.", "error")
        return redirect(url_for("auth.login"))

    userinfo = token.get("userinfo") or {}
    subject = str(userinfo.get("sub") or "").strip()
    issuer = current_app.config["OIDC_ISSUER"]
    if not subject or len(subject) > 255:
        logger.warning("OIDC response without subject from IP: %s", request.remote_addr)
        flash("Der SSO-Provider hat keine eindeutige Benutzer-ID geliefert.", "error")
        return redirect(url_for("auth.login"))

    linked_user = User.query.filter_by(oidc_issuer=issuer, oidc_subject=subject).first()

    if action == "link" and current_user.is_authenticated:
        if linked_user and linked_user.id != current_user.id:
            flash("Dieses SSO-Konto ist bereits mit einem anderen Benutzer verknuepft.", "error")
            return redirect(url_for("pages.index"))
        if current_user.uses_oidc() and (
            current_user.oidc_issuer != issuer or current_user.oidc_subject != subject
        ):
            flash("Dieser Benutzer ist bereits mit einem anderen SSO-Konto verknuepft.", "error")
            return redirect(url_for("pages.index"))

        current_user.oidc_issuer = issuer
        current_user.oidc_subject = subject
        current_user.email = (userinfo.get("email") or "").strip() or None
        db.session.commit()
        logger.info("SSO identity linked to user '%s'.", current_user.username)
        flash("Das SSO-Konto wurde erfolgreich verknuepft.", "success")
        return redirect(url_for("pages.index"))

    user = linked_user
    if not user:
        if not current_app.config["OIDC_AUTO_PROVISION"]:
            logger.warning("Login rejected for unknown OIDC identity from IP: %s", request.remote_addr)
            flash(
                "Dieses SSO-Konto ist noch nicht freigeschaltet. "
                "Bitte wenden Sie sich an einen Administrator.",
                "error",
            )
            return redirect(url_for("auth.login"))

        user = User(
            username=oidc_username(userinfo),
            password=generate_password_hash(secrets.token_urlsafe(48)),
            email=(userinfo.get("email") or "").strip() or None,
            oidc_issuer=issuer,
            oidc_subject=subject,
            role_id=int(get_role_id(current_app.config["OIDC_DEFAULT_ROLE"])),
        )
        db.session.add(user)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            user = User.query.filter_by(oidc_issuer=issuer, oidc_subject=subject).first()
            if not user:
                logger.error("Could not provision OIDC user")
                flash("Das SSO-Konto konnte nicht angelegt werden.", "error")
                return redirect(url_for("auth.login"))
        logger.info("New OIDC user '%s' provisioned.", user.username)

    session.clear()
    login_user(user)
    logger.info("User '%s' logged in via SSO from IP: %s", user.username, request.remote_addr)
    return redirect(url_for("pages.index"))


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
    if not local_auth_enabled():
        flash("Die lokale Registrierung ist deaktiviert.", "error")
        return redirect(url_for("auth.login"))

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
