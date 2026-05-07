# Pizza Pricing Calculator

## Overview

A single-page calculator that determines the price of a pizza based on four
inputs: size, toppings, crust type, and the day of the week. The price updates
live as the customer makes selections — no submit button. All amounts are in USD.

## Inputs

| Input | Options | Description |
|-------|---------|-------------|
| Pizza size | small, medium, large | Determines the base price |
| Toppings | Multi-select from a fixed list | Each adds a flat per-topping charge |
| Crust type | thin, regular, stuffed | Stuffed crust carries an upcharge |
| Day of week | monday – sunday | Determines a discount or premium multiplier |

## Pricing Rules

### Base price by size

| Size | Base Price |
|------|-----------|
| Small | $8 |
| Medium | $12 |
| Large | $16 |

### Toppings

Every topping costs a flat **$1.50**, regardless of which topping is selected.
The total topping cost is the number of selected toppings multiplied by $1.50.

### Crust upcharge

- Thin and regular crusts are **included** in the base price (no upcharge).
- Stuffed crust adds a flat **$3** upcharge.

### Day-of-week pricing

A multiplier is applied to the subtotal (base + toppings + crust) depending on
the day the pizza is ordered:

| Day | Multiplier | Effect |
|-----|-----------|--------|
| Monday | 1.00 | Regular rate |
| Tuesday | 0.80 | **20% discount** (Pizza Tuesday) |
| Wednesday | 0.90 | 10% discount |
| Thursday | 1.00 | Regular rate |
| Friday | 1.10 | 10% premium |
| Saturday | 1.15 | 15% premium |
| Sunday | 1.00 | Regular rate |

### Final price

`totalPrice = round((basePrice + toppingsCost + crustUpcharge) × dayMultiplier, 2)`

## Outputs

| Output | Description |
|--------|-------------|
| totalPrice | Final price for the chosen day (USD) |
| basePrice | Base price from the selected size |
| toppingsCost | Combined cost of all selected toppings |
| crustUpcharge | Upcharge for the selected crust (0 if thin/regular) |
| subtotal | Pre-discount subtotal (base + toppings + crust) |
| dayMultiplier | Multiplier applied for the selected day |
| weeklyPrices | Array of 7 prices (Mon–Sun) for the same pizza on each day |

## UI Requirements

- Warm orange accent color
- One-screen form: size cards, topping picker, crust cards
- Live recalculation on every input change — no submit button
- Sticky price footer always visible at the bottom, animates on change
- Results: hero total, pie-chart breakdown (with day discount/premium line),
  7-day comparison bar chart
- Mobile-friendly
- Auto-detect today's day of week for default pricing
