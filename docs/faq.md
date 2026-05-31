# FAQ

## Kompakt

Diese FAQ beantwortet häufige Fragen zur täglichen Arbeit mit PSMSimple. Wenn etwas nicht funktioniert, prüfen Sie zuerst Berechtigungen, fehlende Stammdaten und die aktuell gesetzten Filter.

Häufige Ursachen:

- fehlende Stammdaten
- falsche Kultur- oder Feldzuordnung
- nicht gespeicherte Einstellungen
- eingeschränkte Benutzerrolle
- Browser- oder Download-Einstellungen

## Ausführlich

## Warum sehe ich nicht alle Menüpunkte?

Die sichtbaren Menüpunkte hängen von Ihrer Rolle ab. Einige Bereiche sind nur für Benutzer mit Schreibrechten oder Admin-Rechten sichtbar.

Wenn Sie einen Bereich benötigen, wenden Sie sich an einen Administrator.

## Warum kann ich nichts bearbeiten?

Wahrscheinlich haben Sie eine Rolle ohne Schreibrechte, zum Beispiel **read-only**. In diesem Fall können Sie Daten ansehen, aber nicht ändern.

## Warum erscheint ein Feld nicht in der Dokumentation?

In der Dokumentation werden nur Felder angezeigt, die zur ausgewählten Kultur passen. Prüfen Sie im Bereich **Felder**, ob dem Feld die richtige Kultur zugeordnet ist.

## Warum ist der Speichern- oder Download-Button deaktiviert?

Es fehlt mindestens eine Pflichtangabe.

Prüfen Sie:

- Pflanzenschutzmittel ausgewählt
- Aufwandsmenge eingetragen
- Kultur ausgewählt
- BBCH-Code eingetragen
- Feld ausgewählt
- Datum und Uhrzeit gesetzt
- Art der Verwendung ausgewählt

## Warum wird kein BBCH-Code vorgeschlagen?

Für die gewählte Kultur sind möglicherweise keine BBCH-Codes gepflegt. Öffnen Sie **Kulturen**, bearbeiten Sie die Kultur und ergänzen Sie BBCH-Codes.

## Warum wird ein Pflanzenschutzmittel nicht gefunden?

Prüfen Sie die Schreibweise. Wenn die Suche keinen Treffer liefert, können Sie das Mittel manuell anlegen. Zulassungsrelevante Angaben sollten Sie immer anhand aktueller Quellen prüfen.

## Wo finde ich gespeicherte Anwendungen?

Gespeicherte Anwendungen finden Sie in der **Historie**. Dort können Sie nach Zeitraum filtern und Details öffnen.

## Werden alte Historieneinträge geändert, wenn ich Stammdaten ändere?

Nein. Historieneinträge behalten die Daten, die zum Zeitpunkt der Speicherung verwendet wurden. Neue Stammdaten gelten für neue Dokumentationen.

## Wie ändere ich den Standard-Anwender?

Öffnen Sie **Einstellungen** und tragen Sie im Bereich **Allgemein** den Standard-Anwender ein. Speichern Sie danach die Einstellungen.

## Warum startet kein Download?

Prüfen Sie, ob der Browser Downloads blockiert. Je nach Einstellung speichert PSMSimple Dateien auch auf dem Server statt sie im Browser herunterzuladen.

## Warum sehe ich keine Prognose?

Prüfen Sie, ob Orte mit Koordinaten vorhanden sind. Außerdem muss mindestens ein Ort ausgewählt sein.

## Warum ist die KI-Beratung nicht verfügbar?

Die KI-Beratung muss in den Einstellungen aktiviert und technisch konfiguriert sein. Wenn kein Anbieter oder API-Schlüssel eingerichtet ist, bleibt die Empfehlung deaktiviert.

## Welche Daten sollte ich regelmäßig sichern?

Sichern Sie das Datenverzeichnis der Installation. Dort liegen Datenbanken, Exporte und Logs. Bei Docker-Installationen ist das in der Regel das eingebundene `data/`-Verzeichnis.
