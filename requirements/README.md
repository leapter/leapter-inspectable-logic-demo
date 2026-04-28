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
# Acme Corp — Insurance Premium Calculator

## Business Rules
- Base premium depends on vehicle type, age, and mileage
- Discount for multi-year contracts (5% per year, max 20%)
- Surcharge for high-risk zip codes

## UI Requirements
- Professional look (brand colors: #1B365D, #F5A623)
- Tabbed form: Vehicle Info → Driver Profile → Coverage Options
- Results: summary card with monthly/annual premium + breakdown chart
- Mobile-friendly
```
