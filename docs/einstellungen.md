# Einstellungen

## Auf einen Blick

In den **Einstellungen** legen Sie persönliche Vorgaben und, als Administrator, globale Systemwerte fest. Persönliche Einstellungen betreffen Exportverhalten und Standardwerte für die Dokumentation. Admin-Einstellungen betreffen Registrierung, Beratung, Prognose und Lager.

Wichtige Bereiche:

- Allgemein
- Admin & Benutzer
- Beratung
- Vorhersage
- Lager

## So funktioniert die Funktion

## Allgemeine Einstellungen

Der Bereich **Allgemein** steht allen Benutzern zur Verfügung.

Hier legen Sie fest:

- ob Exporte im Browser heruntergeladen werden
- ob Dateien serverseitig gespeichert werden
- Standard-Anwender
- Standard-Verantwortliche/r

Die Standardwerte werden automatisch in neue Anwendungen eingetragen und können dort bei Bedarf überschrieben werden.

## Export-Verhalten

Beim Export-Verhalten gibt es zwei Modi:

- **Browser-Download**: Die Dateien werden direkt im Browser heruntergeladen.
- **Lokal speichern**: Die Dateien werden im Exportordner des Servers abgelegt.

Welcher Modus sinnvoll ist, hängt von Ihrer Arbeitsweise ab. Für zentrale Ablage ist serverseitiges Speichern oft praktischer. Für direkte Weitergabe ist Browser-Download hilfreich.

## Admin & Benutzer

Dieser Bereich ist für alle Benutzer sichtbar. Jeder Benutzer kann dort den eigenen Benutzernamen ändern und, falls OIDC aktiviert ist, das eigene Konto mit SSO verknüpfen.

Zusätzlich können Administratoren:

- Registrierung erlauben oder sperren
- Benutzerrollen ändern
- Benutzer löschen

Weitere Informationen zur Kontoverknüpfung finden Sie unter [OIDC und SSO](oidc-sso.md).

## Beratung

Im Bereich **Beratung** kann die AI-Beratung aktiviert werden. Außerdem können Suchwörter für den Warmup der Schadorganismen gepflegt werden.

Änderungen an den Warmup-Suchwörtern werden beim nächsten Neustart aktiv.

## Vorhersage

Im Bereich **Vorhersage** legen Administratoren Standardwerte für die Spritzfenster-Prognose fest.

Dazu gehören:

- maximaler Wind
- maximaler Niederschlag
- minimale und maximale Temperatur
- minimale Luftfeuchte
- Trockenzeit nach der Anwendung
- früheste und späteste Uhrzeit
- Standard-Zeitraum

## Lager

Im Bereich **Lager** können Standardwerte für Warn- und Mindestbestand festgelegt werden. Diese Werte helfen beim Anlegen neuer Pflanzenschutzmittel und bei Lagerwarnungen.

## Einstellungen speichern

Klicken Sie nach Änderungen auf **Einstellungen speichern**. Nicht gespeicherte Änderungen werden nicht dauerhaft übernommen.

## Häufige Probleme

## Admin-Bereiche sind nicht sichtbar

Sie haben wahrscheinlich keine Admin-Rechte.

## Standard-Anwender wird nicht übernommen

Speichern Sie die Einstellungen und öffnen Sie die Dokumentation erneut.

## Prognose nutzt unerwartete Grenzwerte

Prüfen Sie die Werte im Bereich **Vorhersage** und speichern Sie die Einstellungen erneut.
