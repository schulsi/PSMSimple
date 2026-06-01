# Crops and BBCH

## At a Glance

In **Crops**, you manage crop types and their BBCH codes. Crops are later linked to fields and applications. BBCH codes describe the crop growth stage at the time of application.

Important fields:

- crop name
- EPPO code
- BBCH code
- BBCH label
- optional BBCH description
- sorting

## How the Function Works

## What crops are used for

Crops are central master data. They are assigned to fields and selected during application documentation. This allows PSMSimple to show matching fields and store the BBCH code with the application.

## Create a new crop

1. Open **Crops**.
2. Click **+ New Crop**.
3. Enter the name.
4. Enter the EPPO code.
5. Save the crop.

The EPPO code provides a clear technical assignment. Use the official crop code whenever possible.

## Maintain BBCH codes

BBCH codes can be maintained for saved crops.

1. Open a crop with **Edit**.
2. Click **+ Add BBCH**.
3. Enter the code, label, and optionally a description.
4. Optionally add a sorting value.
5. Save the BBCH entry.

The sorting value controls the display order of BBCH codes. Often it makes sense to use the BBCH code itself as the sorting value.

## Edit or delete a crop

Use **Edit** to change the name, EPPO code, and BBCH codes. Use **Delete** to remove a crop.

Delete crops carefully. If fields or applications depend on them, first check whether the crop is still in use.

## Common Issues

## Add BBCH is disabled

Save the crop first. BBCH codes can only be assigned meaningfully to an already saved crop.

## BBCH code does not appear during documentation

Check whether the BBCH code was saved for the correct crop. Open the crop with **Edit** and review the BBCH table.

## Crop does not appear for a field

Check whether the crop was saved. Afterwards, you can assign it to a field in **Fields**.
