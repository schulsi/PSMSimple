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

## Docker
```bash
# 1. Image bauen
docker build -t psmsimple .

# 2. Container starten
docker run --name PSMSimple -p 80:80 0 -v PATH_TO_VOLUME:/data psmsimple

# 3. Browser öffnen
http://localhost:5000
```

## Funktionen

- **Betrieb**: Einmalige Stammdaten (werden in jede JSON eingebettet)
- **Pflanzenschutzmittel**: Stammdaten-Bibliothek, mehrfach verwendbar
- **Einsatzorte**: GPS-Koordinaten, Flächen – wiederverwendbar
- **Kulturen**: BBCH-Codes verwalten
- **JSON-Export**: Beliebige Kombination auswählen → JSON herunterladen

## Datenbank

SQLite-Datei `pflanzenschutz.db` wird automatisch beim ersten Start erstellt.

