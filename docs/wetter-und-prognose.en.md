# Weather and Forecast

## At a Glance

**Forecast** calculates suitable spray windows for selected sites. PSMSimple evaluates weather data using configured thresholds such as wind, precipitation, temperature, humidity, and drying time.

You select:

- sites
- time range
- minimum window duration

PSMSimple then shows the best time window and alternatives.

## How the Function Works

## Prerequisite

For a forecast, sites with coordinates must exist. Without sites or coordinates, PSMSimple cannot retrieve weather data for the correct location.

## Open forecast

Open **Forecast**. You will see the settings and the result area.

## Select sites

Select one or more sites. Use **All** to select all sites and **None** to clear the selection.

If no sites are shown, create sites or fields with coordinates first.

## Set time range

Select the time range for the calculation:

- today
- until tomorrow
- next 2 days
- next 3 days
- next 4 days
- next 5 days

The default range can be changed in **Settings**.

## Set minimum duration

**Minimum window duration** defines how long a suitable time window must be. For example, a value of 2 hours means shorter windows are not accepted as results.

## Calculate forecast

Click **Calculate forecast**. PSMSimple loads weather data and evaluates time windows using the configured thresholds.

The result shows:

- best time window across all selected sites
- site
- duration
- score
- start time
- additional windows and alternatives

## Understand thresholds

Thresholds are maintained in **Settings**. They include:

- maximum wind
- maximum precipitation
- minimum and maximum temperature
- minimum humidity
- drying time after application
- earliest and latest hour

The forecast is a decision aid. Always check technical and legal requirements before the actual application.

## Common Issues

## No suitable time window found

The current weather conditions do not meet the thresholds. Check alternatives, extend the time range, or review the defaults in settings.

## Sites cannot be loaded

Check whether sites exist and whether the server connection works.

## Result looks unexpected

Check the site coordinates and the thresholds in settings.
