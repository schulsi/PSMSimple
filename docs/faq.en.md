# FAQ

## Compact

This FAQ answers common questions about daily work with PSMSimple. If something does not work, first check permissions, missing master data, and active filters.

Common causes:

- missing master data
- wrong crop or field assignment
- unsaved settings
- restricted user role
- browser or download settings

## Detailed

## Why do I not see all menu items?

Visible menu items depend on your role. Some areas are only visible to users with write or admin permissions.

If you need access to an area, contact an administrator.

## Why can I not edit anything?

You probably have a role without write permissions, such as **read-only**. In that case, you can view data but cannot change it.

## Why does a field not appear in documentation?

Only fields matching the selected crop are shown in the documentation workflow. Check in **Fields** whether the correct crop is assigned to the field.

## Why is the Save or Download button disabled?

At least one required value is missing.

Check:

- plant protection product selected
- application rate entered
- crop selected
- BBCH code entered
- field selected
- date and time set
- type of use selected

## Why is no BBCH code suggested?

The selected crop may not have BBCH codes maintained. Open **Crops**, edit the crop, and add BBCH codes.

## Why is a plant protection product not found?

Check the spelling. If the search returns no result, you can create the product manually. Always verify approval-related information against current sources.

## Where do I find saved applications?

Saved applications are available in **History**. There you can filter by date range and open details.

## Are old history entries changed when I update master data?

No. History entries keep the data that was used when they were saved. New master data applies to new documentation entries.

## How do I change the default applicator?

Open **Settings** and enter the default applicator in **General**. Then save the settings.

## Why does no download start?

Check whether the browser blocks downloads. Depending on the setting, PSMSimple may also save files on the server instead of downloading them in the browser.

## Why do I not see a forecast?

Check whether sites with coordinates exist. At least one site must also be selected.

## Why is AI advisory not available?

AI advisory must be enabled in settings and technically configured. If no provider or API key is configured, the recommendation remains disabled.

## Which data should I back up regularly?

Back up the installation's data directory. It contains databases, exports, and logs. In Docker installations, this is usually the mounted `data/` directory.
