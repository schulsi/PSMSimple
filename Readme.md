# 🌿 Pflanzenschutz Dokumentation

Eine Web-App zur Erstellung von Pflanzenschutz-JSON-Dokumenten.

## Installation & Start

```bash
# 1. Abhängigkeiten installieren
pip install -r requirements.txt

# 2. App starten
python app.py

# 3. Browser öffnen
# http://localhost:5000
```

## Funktionen

- **Betrieb**: Einmalige Stammdaten (werden in jede JSON eingebettet)
- **Pflanzenschutzmittel**: Stammdaten-Bibliothek, mehrfach verwendbar
- **Einsatzorte**: GPS-Koordinaten, Flächen – wiederverwendbar
- **Kulturen**: BBCH-Codes verwalten
- **JSON-Export**: Beliebige Kombination auswählen → JSON herunterladen

## Datenbank

SQLite-Datei `pflanzenschutz.db` wird automatisch beim ersten Start erstellt.

## ToDos
Ausreiser beim anlegen anpassen
PDF Export
Uhrzeit hinzufügen
Aufwandmenge fixen
Favicon
PSInfo API
Wie hosten?
