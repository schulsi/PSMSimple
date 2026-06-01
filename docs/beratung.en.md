# Advisory

## At a Glance

**Advisory** searches for approved plant protection products for a combination of crop and harmful organism. Optionally, an AI recommendation can be added if the feature is configured and enabled.

You select:

- crop
- harmful organism
- optionally a site for weather context

PSMSimple then shows approved products and, if enabled, a recommendation.

## How the Function Works

## Prerequisite

Crops must exist for advisory. Harmful organism search uses BVL data. The optional AI recommendation only works if an LLM provider is configured.

## Select crop

First select a crop from your database. The crop is shown with name and EPPO code if an EPPO code has been maintained.

## Search harmful organism

Enter at least two characters in **Harmful organism**. PSMSimple shows matching results.

Select the correct harmful organism from the list. Only then can the search for approved products be started.

## Optionally select site

A site is optional. It can be used for weather-related context in the recommendation.

## Search products or start advisory

Depending on configuration, the button is named:

- **Search products**, if only approved products are shown
- **Start advisory**, if AI advisory is enabled

PSMSimple then shows approved products for the selected combination.

## Understand results

The product view may include information such as:

- product name
- active substances
- low risk
- waiting period
- application information
- approval end date

Always verify the information against current approval and product information before application.

## AI recommendation

If AI advisory is active and correctly configured, PSMSimple also creates a text recommendation.

The recommendation is only support. It does not replace technical review, legal review, or checking the current approval.

## Common Issues

## No crop can be selected

Create crops in **Crops** first.

## Harmful organism cannot be found

Check the spelling or search for a more general term.

## AI advisory is not available

The feature is either disabled or the LLM provider is not configured. Check **Settings** or contact an administrator.
