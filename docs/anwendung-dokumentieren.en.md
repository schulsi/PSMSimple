# Documenting an Application

## Compact

For a complete documentation entry, select at least one plant protection product, one crop, one BBCH code, and one field. Then add the date, time, type of use, responsible person, and applicator. Use **Preview** to check the data, then use **Save** or **Download** to generate the documentation.

Required information:

- at least one plant protection product with application rate
- at least one crop with BBCH code
- at least one field
- date and time
- type of use

## Detailed

## Prerequisites

Before documenting an application, the most important master data should already exist:

- farm
- plant protection products
- crops
- BBCH codes
- application sites and fields

If a list is empty or an entry is missing, create the missing entry in the corresponding section first.

## 1. Open the documentation page

Open **Create Documentation** in PSMSimple. On the start page, you can also use **Document now**.

The page is divided into several sections. It is usually best to work through them from top to bottom.

## 2. Select plant protection products

In **Plant Protection Products & Application Rate**, select the products used in this application.

1. Activate the required plant protection product.
2. Enter the application rate.
3. Repeat the step if multiple products were used.

The application rate is required for every selected product. The unit comes from the product master data.

## 3. Select crop and BBCH code

In **Crops & BBCH Code**, select the affected crop.

1. Activate the crop.
2. Enter the BBCH code or search by code or description.
3. Select the matching BBCH code from the suggestion list.

The BBCH code describes the crop growth stage at the time of application. A BBCH code is required for every selected crop.

## 4. Select fields

In **Select Fields**, only fields matching the selected crops are shown.

1. Select one or more fields.
2. Use quick selection if needed to select all visible fields or all fields of one application site.

If no fields are shown, check whether the fields are assigned to a crop. Without a selected crop, PSMSimple cannot show matching fields.

## 5. Add application details

In **Application**, add the actual application details.

Maintain:

- date
- time
- type of use
- subcategory
- responsible person
- applicator

Date and time are usually prefilled with the current time. Still check these values, especially when documenting an application afterwards.

## 6. Check the preview

Use **Preview** to generate a preview of the documentation. Use it to check the selected products, crops, fields, and application details before saving.

If the button is inactive, at least one required value is missing. PSMSimple shows a message below the buttons indicating which information is required.

## 7. Save or download

Depending on the settings, different actions are available:

- **Save** stores the generated files on the server.
- **Download** downloads the documentation in the browser.

When saving or downloading, the application is also stored in the history. You can find and review it there later.

## Common Issues

## The Save or Download button is disabled

Check whether all required values are filled in:

- plant protection product selected
- application rate entered for every product
- crop selected
- BBCH code entered for every crop
- field selected
- date and time set
- type of use and subcategory selected

## No fields are shown

Fields are only shown after a crop has been selected. The fields must also be assigned to that crop. Check the assignment in **Application Sites**.

## The BBCH code cannot be found

Check whether BBCH codes are maintained for the selected crop. If no suggestions appear, add the BBCH data in **Crops**.

## The responsible person or applicator is missing

These fields can be filled manually. If the same people are used frequently, personal defaults can be configured in **Settings**.
