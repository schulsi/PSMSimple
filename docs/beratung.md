# Beratung

## Auf einen Blick

Die **Beratung** sucht zugelassene Pflanzenschutzmittel für eine Kombination aus Kultur und Schadorganismus. Optional kann eine KI-Empfehlung ergänzt werden, wenn die Funktion eingerichtet und aktiviert ist.

Sie wählen:

- Kultur
- Schadorganismus
- optional einen Ort für Wetterbezug

Danach zeigt PSMSimple zugelassene Mittel und, falls aktiviert, eine Empfehlung.

## So funktioniert die Funktion

## Voraussetzung

Für die Beratung müssen Kulturen vorhanden sein. Die Suche nach Schadorganismen nutzt die BVL-Daten. Die optionale KI-Empfehlung funktioniert nur, wenn ein LLM-Anbieter eingerichtet ist.

## Kultur auswählen

Wählen Sie zuerst eine Kultur aus Ihrer Datenbank. Die Kultur wird mit Name und EPPO-Code angezeigt, sofern ein EPPO-Code gepflegt wurde.

## Schadorganismus suchen

Geben Sie mindestens zwei Zeichen in das Feld **Schadorganismus** ein. PSMSimple zeigt passende Treffer an.

Wählen Sie den richtigen Schadorganismus aus der Liste. Erst danach kann die Suche nach zugelassenen Mitteln gestartet werden.

## Ort optional auswählen

Ein Ort ist optional. Er kann für wetterbezogene Hinweise in der Empfehlung verwendet werden.

## Mittel suchen oder Beratung starten

Je nach Konfiguration heißt der Button:

- **Mittel suchen**, wenn nur zugelassene Mittel angezeigt werden
- **Beratung starten**, wenn die KI-Beratung aktiviert ist

PSMSimple zeigt anschließend die zugelassenen Mittel für die gewählte Kombination.

## Ergebnis verstehen

Die Mittelansicht kann Informationen enthalten wie:

- Mittelname
- Wirkstoffe
- geringes Risiko
- Wartezeit
- Aufwandinformationen
- Zulassungsende

Prüfen Sie die Angaben vor der Anwendung immer anhand der aktuellen Zulassung und Produktinformationen.

## KI-Empfehlung

Wenn die KI-Beratung aktiv und korrekt konfiguriert ist, erstellt PSMSimple zusätzlich eine textliche Empfehlung.

Die Empfehlung ist eine Unterstützung. Sie ersetzt keine fachliche Prüfung, keine rechtliche Prüfung und keine Kontrolle der aktuellen Zulassung.

## Häufige Probleme

## Keine Kultur auswählbar

Legen Sie zuerst Kulturen im Bereich **Kulturen** an.

## Schadorganismus wird nicht gefunden

Prüfen Sie die Schreibweise oder suchen Sie nach einem allgemeineren Begriff.

## KI-Beratung ist nicht verfügbar

Die Funktion ist entweder deaktiviert oder der LLM-Anbieter ist nicht konfiguriert. Prüfen Sie die **Einstellungen** oder wenden Sie sich an einen Administrator.
