# Users and Roles

## At a Glance

PSMSimple uses roles to protect functionality. The first registered user becomes administrator. Administrators can allow registration, change user roles, and delete users.

Roles:

- **admin**: full administration
- **user**: normal use with write permissions
- **read-only**: read-only access

## How the Function Works

## First user

On the first start, the first user can usually be registered. This user automatically receives admin permissions.

After initial setup, registration can be disabled so no further users can be created without approval.

## Control registration

Administrators can define in **Settings** whether registration is allowed.

- Enabled: new users can register
- Disabled: new users must be managed by an existing admin

## Understand roles

## admin

Administrators can manage master data, users, roles, and global settings. They have access to admin areas in settings.

## user

Normal users can use the application in daily work and edit data where the function allows write access.

## read-only

Read-only users can view data but cannot perform write actions.

## Change role

1. Open **Settings**.
2. Switch to **Admin and Users**.
3. Select the new role for the user.
4. Click **Save**.

Your own admin role cannot be removed accidentally.

## Delete user

Administrators can delete users. The currently signed-in user cannot be deleted.

Only delete users when access should be removed permanently.

## Change username

In **Admin and Users**, the own username can be changed. The new name must be unique and may only contain allowed characters.

## Link an Account to OIDC

When OIDC is enabled, every user can link their own account to SSO under **Settings > Admin and Users**. Admin permissions are not required. For more information, see [OIDC and SSO](oidc-sso.md).

## Common Issues

## A user cannot register

Check whether registration is allowed in settings.

## Role cannot be changed

Check whether you have admin permissions. Your own admin role cannot be removed.

## User cannot be deleted

The currently signed-in user cannot be deleted. Sign in with another admin account.
