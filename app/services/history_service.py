from ..repositories.history_repo import create_history_entry


def save_history_snapshot(output: dict) -> dict:
    if not isinstance(output, dict):
        raise ValueError("Ungültige Applikationsdaten.")

    if "anwendung" not in output:
        raise ValueError("Applikationsdaten unvollständig: 'anwendung' fehlt.")

    return create_history_entry(output)