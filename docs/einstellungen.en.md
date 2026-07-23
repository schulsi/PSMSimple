# Settings

## At a Glance

In **Settings**, you configure personal defaults and, as an administrator, global system values. Personal settings affect export behavior and defaults for documentation. Admin settings affect registration, advisory, forecast, and inventory.

Important areas:

- general
- admin and users
- advisory
- forecast
- inventory

## How the Function Works

## General settings

**General** is available to all users.

Here you define:

- whether exports are downloaded in the browser
- whether files are saved on the server
- default applicator
- default responsible person

The defaults are entered automatically into new applications and can be overwritten there if needed.

## Export behavior

There are two export modes:

- **Browser download**: files are downloaded directly in the browser.
- **Local save**: files are stored in the server export folder.

Which mode is best depends on your workflow. Server-side storage is useful for central archiving. Browser download is useful for direct sharing.

## Admin and users

This area is visible to all users. Every user can change their own username and, when OIDC is enabled, link their own account to SSO.

Administrators can additionally:

- allow or block registration
- change user roles
- delete users

For more information about account linking, see [OIDC and SSO](oidc-sso.md).

## Advisory

In **Advisory**, AI advisory can be enabled. Warmup search terms for harmful organisms can also be maintained.

Changes to warmup search terms become active after the next restart.

## Forecast

In **Forecast**, administrators define default values for spray window forecasts.

These include:

- maximum wind
- maximum precipitation
- minimum and maximum temperature
- minimum humidity
- drying time after application
- earliest and latest hour
- default time range

## Inventory

In **Inventory**, default values for warning and minimum stock levels can be configured. These values help when creating new plant protection products and inventory warnings.

## Save settings

After making changes, click **Save settings**. Unsaved changes are not applied permanently.

## Common Issues

## Admin areas are not visible

You probably do not have admin permissions.

## Default applicator is not applied

Save the settings and reopen the documentation page.

## Forecast uses unexpected thresholds

Check the values in **Forecast** and save the settings again.
