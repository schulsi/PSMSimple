from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash

from ..extensions import db
from ..models.user import User

bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("pages.index"))

    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for("pages.index"))

        flash("Ungültiger Benutzername oder Passwort.", "error")

    return render_template("login.html")


@bp.route("/register", methods=["POST"])
def register():
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

    new_user = User(
        username=username,
        password=generate_password_hash(password)
    )
    db.session.add(new_user)
    db.session.commit()

    flash(f"Konto für {username} erfolgreich erstellt. Bitte jetzt anmelden.", "success")
    return redirect(url_for("auth.login"))


@bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("Sie wurden abgemeldet.", "success")
    return redirect(url_for("auth.login"))