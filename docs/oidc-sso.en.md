# OIDC and SSO

## At a Glance

PSMSimple can authenticate users through an OpenID Connect (OIDC) provider. This enables centralized sign-in through an existing identity provider. Local accounts can be linked to an OIDC identity without losing roles, settings, or existing data.

Available authentication modes:

- **local**: username and password only
- **hybrid**: local and OIDC sign-in
- **oidc**: OIDC sign-in only

## How the Function Works

An administrator configures OIDC through environment variables. Once OIDC is enabled, the SSO option appears on the sign-in page. Signed-in users can link their existing account to the identity provider under **Settings > Admin and Users**. Admin permissions are not required for linking your own account.

An OIDC identity can only be linked to one local PSMSimple account.

## Configure the Identity Provider

Register PSMSimple as an OIDC client at the identity provider. Configure this exact redirect URI:

```text
https://<your-domain>/auth/oidc/callback
```

The issuer URL must point to the provider or realm root. Do not append the `/.well-known/openid-configuration` discovery path because PSMSimple adds it automatically.

## Configure PSMSimple

Example `.env` configuration:

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

The variables have the following purposes:

- `AUTH_MODE`: enables local authentication, OIDC, or both
- `OIDC_PROVIDER_NAME`: display name of the identity provider
- `OIDC_ISSUER`: issuer URL without the discovery path
- `OIDC_CLIENT_ID`: client ID for PSMSimple
- `OIDC_CLIENT_SECRET`: confidential client secret
- `OIDC_SCOPES`: requested scopes; `openid` is required
- `OIDC_DEFAULT_ROLE`: role assigned to automatically created users
- `OIDC_AUTO_PROVISION`: enables or disables automatic user creation

Restart PSMSimple after changing the configuration:

```bash
docker compose up -d
```

## Link an Existing Account

Use `hybrid` mode first for a safe migration.

1. Sign in with your existing username and password.
2. Open **Settings**.
3. Switch to **Admin and Users**.
4. Select **Link account** in the **User account** section.
5. Sign in at the identity provider and approve access.

After a successful link, PSMSimple displays the account as **Already linked**. You can now use SSO to sign in.

Link at least one admin account before switching to `oidc` mode. Local sign-in is disabled in OIDC-only mode.

## Automatic User Provisioning

With `OIDC_AUTO_PROVISION=true`, PSMSimple automatically creates a local account after the first successful OIDC sign-in. The account receives the role configured in `OIDC_DEFAULT_ROLE`:

- `admin`
- `user`
- `read-only`

Automatic provisioning is disabled by default. When it is disabled, users must link an existing local account first.

## Common Issues

## SSO option is not displayed

Check that `AUTH_MODE` is set to `hybrid` or `oidc` and that all required OIDC variables are present. Restart the application afterwards.

## Redirect URI is rejected

The redirect URI registered at the identity provider must exactly match `https://<your-domain>/auth/oidc/callback`. Check the protocol, domain, and port in particular.

## Account cannot be linked

The OIDC identity may already be linked to another PSMSimple user. Each identity can only be assigned to one local account.

## Unknown OIDC user cannot sign in

When `OIDC_AUTO_PROVISION=false`, unknown identities are not created automatically. Link a local account first or enable automatic provisioning.

## Local sign-in is no longer possible

Local sign-in is intentionally disabled in `oidc` mode. Switch back to `hybrid` if local accounts should remain available.
