# Troubleshooting

## Compact

If PSMSimple does not behave as expected, start with the simple checks: reload the page, check sign-in, reset filters, review master data, and verify permissions. Many issues are caused by missing assignments or unsaved settings.

First steps:

- reload the browser
- sign in again
- reset filters
- check master data
- check role and permissions
- for export issues, check browser downloads

## Detailed

## Sign-in does not work

Check username and password. Pay attention to upper and lower case.

If you cannot use your account, contact an administrator. Administrators can manage users, but password resets should follow the process defined for the installation.

## Registration is not possible

Registration may be disabled after initial setup. An administrator can allow it again in **Settings**.

## Master data is missing

If lists are empty, create the required master data first.

Check:

- farm
- plant protection products
- crops
- BBCH codes
- fields
- sites

## Field is not shown

If a field is missing in the documentation workflow, check:

- Is a crop selected?
- Is the field assigned to that crop?
- Was the field saved?
- Was the page reloaded after creating it?

## BBCH code is missing

If no BBCH code is found, check:

- Is the correct crop selected?
- Are BBCH codes maintained for this crop?
- Was the BBCH code saved?

## Export does not work

If **Save** or **Download** does not work:

1. Check whether all required values in the documentation are filled.
2. Create a **Preview** first.
3. Check the export behavior setting.
4. Check whether the browser blocks downloads.
5. Try again after reloading the page.

## Files are not downloaded

The browser may block downloads. Check the download bar, popup settings, and browser security messages.

If **Local save** is active, files are stored on the server and are not downloaded directly in the browser.

## History is empty

Check the date filter. History only shows entries in the selected date range.

Click **Reset** or select a larger date range.

## Inventory stock looks wrong

Open **Movement History** and review the bookings. Common causes are missing purchases, duplicate corrections, or automatically created outgoing movements from applications.

## Forecast finds no time window

If no spray window is found, the weather data does not match the thresholds.

Check:

- selected sites
- site coordinates
- time range
- minimum duration
- thresholds in settings

## Advisory finds no products

Check:

- crop selected
- harmful organism selected
- spelling of the search term
- connection to the data source

If no products are found, there may be no matching result for the selected combination.

## Photos or camera do not work

Camera and upload depend on device, browser, and permissions.

Check:

- browser permission for camera
- HTTPS or trusted local environment
- image file format
- file size

Use gallery upload as an alternative.

## Changes are not applied

Check whether you clicked **Save** or **Save settings**. Then reload the page.

## Admin functions are missing

Admin functions are only visible if your role has the required permission. Check your role in the user menu or contact an administrator.

## Problem remains

Write down:

- what you wanted to do
- which page is affected
- which error message appears
- when the problem occurred

Share this information with the responsible person or administrator.
