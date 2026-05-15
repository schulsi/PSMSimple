from flask import Blueprint, jsonify
from flask_login import login_required
from packaging.version import parse as parse_version
import requests

from ..services.permissions import build_permissions
from ..version import APP_NAME, APP_VERSION, GITHUB_OWNER, GITHUB_REPO

bp = Blueprint("version", __name__)

@bp.route("/version", methods=["GET"])
@login_required
def version():
    return {"name": APP_NAME, "version": APP_VERSION}

@bp.route("/version/check", methods=["GET"])
@login_required
def check_updates():
    url = f"https://api.github.com/repos/{GITHUB_OWNER}/{GITHUB_REPO}/releases/latest"

    try:
        response = requests.get(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2026-03-10",
                "User-Agent": APP_NAME,
                "Authorization": "Bearer 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"
            },
            timeout=5,
        )
        response.raise_for_status()

        release = response.json()

        latest_tag = release.get("tag_name", "")
        latest_version = latest_tag.lstrip("v")

        update_available = parse_version(latest_version) > parse_version(APP_VERSION)

        return jsonify({
            "app_name": APP_NAME,
            "current_version": APP_VERSION,
            "latest_version": latest_version,
            "latest_tag": latest_tag,
            "update_available": update_available,
            "release_name": release.get("name"),
            "release_url": release.get("html_url"),
            "published_at": release.get("published_at"),
            "changelog": release.get("body"),
        })

    except Exception as e:
        print(f"Error occurred while checking for updates: {e}")
        return jsonify({
            "app_name": APP_NAME,
            "current_version": APP_VERSION,
            "update_available": False,
            "error": "Updatepruefung fehlgeschlagen"
        }), 200