# OIDC und SSO

## Auf einen Blick

PSMSimple kann Benutzer über einen OpenID-Connect-Anbieter (OIDC) anmelden. Dadurch ist eine zentrale Anmeldung über einen bestehenden Identity Provider möglich. Lokale Benutzerkonten können mit einer OIDC-Identität verknüpft werden, ohne Rollen, Einstellungen oder vorhandene Daten zu verlieren.

Verfügbare Anmeldemodi:

- **local**: nur Anmeldung mit Benutzername und Passwort
- **hybrid**: lokale Anmeldung und OIDC-Anmeldung
- **oidc**: nur OIDC-Anmeldung

## So funktioniert die Funktion

Ein Administrator richtet OIDC über Umgebungsvariablen ein. Sobald OIDC aktiviert ist, erscheint auf der Anmeldeseite die SSO-Anmeldung. Angemeldete Benutzer können ihr bestehendes Konto unter **Einstellungen > Admin & Benutzer** selbst mit dem Identity Provider verknüpfen. Dafür sind keine Admin-Rechte erforderlich.

Eine OIDC-Identität kann nur mit einem lokalen PSMSimple-Konto verknüpft werden.

## Identity Provider einrichten

Legen Sie PSMSimple beim Identity Provider als OIDC-Client an. Hinterlegen Sie dabei exakt diese Redirect-URI:

```text
https://<ihre-domain>/auth/oidc/callback
```

Die Issuer-URL muss auf die Basis-URL des Providers oder Realms zeigen. Der Discovery-Pfad `/.well-known/openid-configuration` darf nicht angehängt werden, da PSMSimple ihn automatisch ergänzt.

## PSMSimple konfigurieren

Beispiel für die `.env`-Datei:

```dotenv
AUTH_MODE=hybrid
OIDC_PROVIDER_NAME=Pocket ID
OIDC_ISSUER=https://id.example.com
OIDC_CLIENT_ID=psmsimple
OIDC_CLIENT_SECRET=replace-with-client-secret
OIDC_SCOPES=openid profile email
OIDC_DEFAULT_ROLE=read-only
OIDC_AUTO_PROVISION=false
```

Die Variablen haben folgende Bedeutung:

- `AUTH_MODE`: aktiviert lokale Anmeldung, OIDC oder beide Verfahren
- `OIDC_PROVIDER_NAME`: angezeigter Name des Identity Providers
- `OIDC_ISSUER`: Issuer-URL ohne Discovery-Pfad
- `OIDC_CLIENT_ID`: Client-ID von PSMSimple
- `OIDC_CLIENT_SECRET`: geheimer Schlüssel des Clients
- `OIDC_SCOPES`: angeforderte Berechtigungen; `openid` ist erforderlich
- `OIDC_DEFAULT_ROLE`: Rolle für automatisch angelegte Benutzer
- `OIDC_AUTO_PROVISION`: erlaubt oder verhindert die automatische Benutzeranlage

Starten Sie PSMSimple nach einer Änderung neu:

```bash
docker compose up -d
```

## Bestehendes Konto verknüpfen

Für eine sichere Umstellung sollte zunächst der Modus `hybrid` verwendet werden.

1. Melden Sie sich mit Ihrem bisherigen Benutzernamen und Passwort an.
2. Öffnen Sie **Einstellungen**.
3. Wechseln Sie zu **Admin & Benutzer**.
4. Klicken Sie im Bereich **Benutzerkonto** auf **Account verknüpfen**.
5. Melden Sie sich beim Identity Provider an und bestätigen Sie den Zugriff.

Nach erfolgreicher Verknüpfung zeigt PSMSimple das Konto als **Bereits verknüpft** an. Ab diesem Zeitpunkt ist die Anmeldung über SSO möglich.

Verknüpfen Sie mindestens ein Admin-Konto, bevor Sie auf den Modus `oidc` wechseln. Im reinen OIDC-Modus ist die lokale Anmeldung deaktiviert.

## Automatische Benutzeranlage

Mit `OIDC_AUTO_PROVISION=true` legt PSMSimple beim ersten erfolgreichen OIDC-Login automatisch ein lokales Benutzerkonto an. Dieses Konto erhält die in `OIDC_DEFAULT_ROLE` konfigurierte Rolle:

- `admin`
- `user`
- `read-only`

Die automatische Benutzeranlage ist standardmäßig deaktiviert. Ist sie deaktiviert, müssen Benutzer zuerst ein bestehendes lokales Konto verknüpfen.

## Häufige Probleme

## SSO-Schaltfläche wird nicht angezeigt

Prüfen Sie, ob `AUTH_MODE` auf `hybrid` oder `oidc` gesetzt ist und ob alle erforderlichen OIDC-Variablen vorhanden sind. Starten Sie die Anwendung anschließend neu.

## Redirect-URI wird abgelehnt

Die beim Identity Provider eingetragene Redirect-URI muss exakt mit `https://<ihre-domain>/auth/oidc/callback` übereinstimmen. Prüfen Sie insbesondere Protokoll, Domain und Port.

## Konto kann nicht verknüpft werden

Die OIDC-Identität ist möglicherweise bereits mit einem anderen PSMSimple-Benutzer verknüpft. Jede Identität kann nur einem lokalen Konto zugeordnet werden.

## Unbekannter OIDC-Benutzer kann sich nicht anmelden

Wenn `OIDC_AUTO_PROVISION=false` gesetzt ist, werden unbekannte Identitäten nicht automatisch angelegt. Verknüpfen Sie zuerst ein lokales Konto oder aktivieren Sie die automatische Benutzeranlage.

## Lokale Anmeldung ist nicht mehr möglich

Im Modus `oidc` ist die lokale Anmeldung absichtlich deaktiviert. Wechseln Sie zurück zu `hybrid`, falls lokale Konten weiterhin verwendet werden sollen.
