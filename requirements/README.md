# Requirements

Drop your customer requirements here. This can be:

- A markdown file with business rules and UI requirements
- A bullet list of features needed
- A specification document
- Notes from a customer conversation

Then open Claude Code and say:

```
Read the requirements in requirements/ and build the demo app.
```

## Example

```markdown
# Acme Pizza — Pizza Pricing Calculator

## Business Rules
- Base price depends on pizza size (small / medium / large)
- Each topping adds a flat $1.50
- Stuffed crust adds a $3 upcharge
- Day-of-week pricing: Pizza Tuesday is 20% off, weekends carry a small premium

## UI Requirements
- Friendly, food-themed look (warm orange accent)
- One-screen form: size cards, topping picker, crust cards
- Live recalculation on every input change — no submit button
- Results: total price + breakdown donut + 7-day comparison strip
- Mobile-friendly
```
