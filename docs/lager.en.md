# Inventory

## At a Glance

In **Inventory**, you see current stock levels for plant protection products and record incoming or outgoing movements. Warning and minimum stock levels come from product master data or inventory defaults.

Important features:

- overview of all product stock levels
- status OK, warning, critical, or negative
- movements for purchase, correction, and disposal
- movement history with date, type, quantity, and note

## How the Function Works

## Prerequisite

For a product to appear in inventory, it must exist in **Plant Protection Products**. There you can also maintain inventory unit, minimum stock level, and warning stock level.

## Open overview

Open **Inventory**. In **Overview**, you see each plant protection product with current stock and unit.

The status shows whether the stock level is normal or should be checked:

- **OK**: stock is within the normal range
- **Warning**: stock is below the warning level
- **Critical**: stock is below the minimum level
- **Negative**: stock is calculated below zero

## Create a movement

1. Open the desired product in the overview.
2. Click **+ Movement**.
3. Select the movement type.
4. Enter quantity and date.
5. Optionally add a note.
6. Click **Book**.

Available movement types:

- **Purchase** for incoming stock
- **Correction +** for later increases
- **Correction -** for later decreases
- **Disposal** for outgoing stock

Applications may also appear automatically as inventory movements when they are saved.

## Use movement history

In **Movement History**, you see recent movements. Use **Number of entries** to show 50, 200, or 500 entries.

The table shows:

- date
- product
- type
- quantity
- note
- source

## Common Issues

## A product is missing from inventory

Check whether the product is saved in **Plant Protection Products**.

## Stock is negative

Check the movement history. Often a purchase or correction is missing, or an application was documented with too high a quantity.

## Movement cannot be created

If **+ Movement** is not visible, you probably do not have write permissions.
