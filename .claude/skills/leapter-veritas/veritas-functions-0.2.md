# Veritas Built-in Functions & Operations v0.2

Reference for all built-in operations available in Veritas blueprints.

## Array / List Operations

| Operation                  | Example                              | Notes                                                                                                                                     |
| -------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `arr.push(value)`          | `results.push(score)`                | Append to end                                                                                                                             |
| `arr.pop()`                | `lastItem = items.pop()`             | Remove and return last                                                                                                                    |
| `arr.length`               | `count = items.length`               | Element count                                                                                                                             |
| `arr[index]` read          | `first = items[0]`                   | Access by index                                                                                                                           |
| `arr[index] = value`       | `items[0] = 99`                      | Write by index                                                                                                                            |
| `arr.indexOf(value)`       | `position = items.indexOf(3)`        | First index of value, -1 if not found                                                                                                     |
| `arr.slice(start, end)`    | `subset = items.slice(1, 3)`         | Copy a portion (non-destructive)                                                                                                          |
| `arr.splice(start, count)` | `removed = items.splice(1, 2)`       | Remove and return elements                                                                                                                |
| `arr.reverse()`            | `reversed = items.slice().reverse()` | Reverse in-place                                                                                                                          |
| `arr.join(separator)`      | `text = items.join(", ")`            | Join into string                                                                                                                          |
| `arr.concat(other)`        | `combined = items.concat([10, 20])`  | Merge arrays                                                                                                                              |
| `sort(list, order?)`       | `ranked = sort(scores, "descending")` | **Built-in.** Returns a NEW list in natural order — numbers numerically, strings lexicographically. `order` is `"ascending"` (default) or `"descending"`. Input list unchanged. |
| `sum(list)`                | `total = sum(amounts)`               | **Built-in.** Total of a list of numbers, skipping absent (null) entries; `sum([])` is `0`. Do not hand-roll an accumulator loop. |
| `max(list, fallback?)`     | `highest = max(scores, 0)`           | **Built-in.** Largest number in a list; absent (null) entries are skipped. Empty list returns `fallback`, or **errors** if none is given (never null). Do not hand-roll an `if (x > cur)` loop. (Scalar two-value max stays `Math.max(a, b)`.) |
| `min(list, fallback?)`     | `lowest = min(scores, 0)`            | **Built-in.** Smallest number in a list; absent (null) entries are skipped. Empty list returns `fallback`, or **errors** if none is given (never null). Do not hand-roll an `if (x < cur)` loop. (Scalar two-value min stays `Math.min(a, b)`.) |

### Not Supported

| Operation          | Use Instead                           |
| ------------------ | ------------------------------------- |
| `.map(fn)`         | Index-based `for` loop                |
| `.filter(fn)`      | `for` loop with conditional `.push()` |
| `.reduce(fn)`      | Accumulator variable with `for` loop  |
| `.forEach(fn)`     | `for...in` or index-based `for` loop  |
| `.find(fn)`        | `for` loop with `break`               |
| `.includes(value)` | `.indexOf(value) >= 0`                |

### Sorting

Use the **`sort`** built-in — never hand-roll a bubble sort. It returns a new list in natural order (numbers numerically, strings lexicographically) and leaves the input unchanged:

```veritas
//* Order scores, highest first
rankedScores = sort(scores, "descending");
```

`order` is optional and defaults to `"ascending"`:

```veritas
//* Order scores, lowest first
rankedScores = sort(scores);
```

The built-in transpiles to the correct idiom on every runtime (`sorted(...)` in Python, a numeric-comparator sort in JavaScript), so `[10, 2, 3]` orders as `[2, 3, 10]`, not lexicographically.

### Building Result Objects

Pre-compute each field into a labeled variable before pushing — inline object literals with many fields are unreadable in the blueprint viewer and untraceable in execution logs.

```veritas
// BAD — wall of text, no traceability
//* Store employee result
results.push({ "name": employeeNames[index], "salary": employeeSalaries[index], "bonus": bonusAmount, "total": employeeSalaries[index] + bonusAmount })
```

```veritas
// GOOD — each field is a labeled step
//* Prepare result fields
var
//* Name of employee being processed
currentName: _text = employeeNames[index],
//* Current base salary
currentSalary: number = employeeSalaries[index],
//* Total compensation including bonus
totalCompensation: number = currentSalary + bonusAmount;

//* Store employee result
results.push({
    "name": currentName,
    "salary": currentSalary,
    "bonus": bonusAmount,
    "total": totalCompensation
})
```

**Rule of thumb:** More than 2-3 fields? Break it up. Each field computation is a separate labeled step.

### Structured Inputs (worked example)

Pass structured data by declaring a type in `data/types.data.vts` and referencing it from the logic file:

```veritas
// data/types.data.vts
define Employee "Someone on the payroll" {
  name: _text "Legal name"
  salary: number "Annual salary in USD"
  rating: number "Performance rating, 1-5"
}
```

```veritas
// logic/calculate-bonuses/calculate-bonuses.logic.vts
//* Calculate Bonuses
"""Distributes a bonus pool proportionally to employee performance."""
function calculateBonuses(
    //* Employees to pay
    employees: list of Employee,
    //* Company-wide bonus pool
    bonusPool: number
) ->
    //* Bonus per employee, same index as input
    bonuses: list of number
{
    section "Calculate Bonuses" {
        """Weight each employee's share of the pool by their performance rating."""
        //* Declare loop index
        var
        //* Current position
        index: number = 0;

        //* Process each employee
        for (index = 0; index < employees.length; index += 1) {
            //* Current employee (for trace readability)
            var
            //* Employee being processed
            currentEmployee: Employee = employees[index];
            //* Weighted bonus for this employee
            var
            //* Proportional bonus
            bonus: number = bonusPool * currentEmployee.rating / 5;
            //* Store bonus
            bonuses.push(bonus);
        }
    }

    //* Return
    return;
}
```

**Why this is idiomatic:**

- One input parameter per logical entity instead of one per field.
- Field access reads as domain language (`currentEmployee.rating`) rather than indexed lookup.
- The CLI validates field references — a typo like `employee.ratng` fails `leapter validate` with a cross-reference error.

### Linear Search Pattern (lookup by key)

```veritas
//* Declare search result
var
//* Found matching rule
matchingRule: any single = null;

//* Search rules for matching role
for (var rule in rules) {
    //* Check if role matches
    choose {
        //* Role matches current member
        if (rule.role is member.role) {
            //* Store matching rule
            matchingRule = rule;
        }
    }
}
```

## String Operations

| Operation                   | Example                              | Notes                               |
| --------------------------- | ------------------------------------ | ----------------------------------- |
| `str.length`                | `charCount = name.length`            | Character count                     |
| `str.indexOf(sub)`          | `position = text.indexOf("@")`       | First occurrence, -1 if not found   |
| `str.slice(start, end)`     | `part = text.slice(0, 5)`            | Extract portion                     |
| `str.substring(start, end)` | `part = text.substring(0, 5)`        | Same as slice (no negative indices) |
| `str.charAt(index)`         | `firstChar = name.charAt(0)`         | Character at position               |
| `str.toLowerCase()`         | `lower = name.toLowerCase()`         | Convert to lowercase                |
| `str.toUpperCase()`         | `upper = name.toUpperCase()`         | Convert to uppercase                |
| `str.trim()`                | `cleaned = input.trim()`             | Remove leading/trailing whitespace  |
| `str.split(sep)`            | `parts = csv.split(",")`             | Split into array                    |
| `str.replace(old, new)`     | `fixed = text.replace("old", "new")` | Replace first occurrence            |
| `+` (concatenation)         | `full = first + " " + last`          | Join strings                        |

> **Caution:** Do not use inline arithmetic inside string concatenation (`"Total: " + (a + b)`). Pre-compute into a variable first.

## Math Functions

| Function              | Description              | Example                 |
| --------------------- | ------------------------ | ----------------------- |
| `round(n, decimals?)` | **Built-in.** Round half away from zero; `decimals` defaults to `0`. Prefer over `Math.round` (half-up, wrong for negatives). | `round(3.7)` → `4` |
| `Math.floor(n)`       | Round down               | `Math.floor(3.7)` → `3` |
| `Math.ceil(n)`        | Round up                 | `Math.ceil(3.2)` → `4`  |
| `Math.abs(n)`         | Absolute value           | `Math.abs(-5)` → `5`    |
| `Math.min(a, b)`      | Smaller of two           | `Math.min(3, 7)` → `3`  |
| `Math.max(a, b)`      | Larger of two            | `Math.max(3, 7)` → `7`  |
| `Math.pow(base, exp)` | Exponentiation           | `Math.pow(2, 3)` → `8`  |
| `Math.sqrt(n)`        | Square root              | `Math.sqrt(16)` → `4`   |

## Number Formatting

| Operation           | Example            | Result                    |
| ------------------- | ------------------ | ------------------------- |
| `n.toFixed(digits)` | `price.toFixed(2)` | `"123.40"` (returns text) |

> Number-to-string via `+ ""` drops trailing zeros: `60000 + ""` → `"60000"`. Use `.toFixed(N)` when precision matters.

## Blueprint Calls

A Leapter project is a set of blueprints that can call each other. This is the primary unit of reuse — decompose complex logic into a main blueprint plus helper blueprints and have main **call the helpers like ordinary functions**.

### Syntax

A blueprint call is a normal function call with **named arguments**:

```
var resultVar: any single = callIdentifier(paramName: expression, ...);
```

It composes inside expressions too: `total = base + calculateTax(amount: subtotal).tax;`.

**Rules:**

- **Named arguments only.** Each argument is `paramName: value`, where `paramName` is an input parameter of the called blueprint. (Positional arguments are only for built-ins like `Math.round(x)`.)
- **The call name is the blueprint's `callIdentifier`, NOT its label.** A stored blueprint doesn't keep its function name, so the call name is the **label lowercased with every run of non-alphanumeric characters replaced by `_`**: `"Zone Rate Lookup"` → `zone_rate_lookup`, `"Calculate Tax"` → `calculate_tax`.
  - In the **chat agent**, read it from `list_blueprints` — each blueprint's `callIdentifier` field is the exact string to use.
  - When **authoring files directly**, derive it from the helper's `//*` label with the rule above.
- The result receives the **full output object** of the called blueprint, not a single field. Access fields via `resultVar.fieldName`. Declare the result variable as `any single`.

### Worked example — cross-file helper in a project

Project layout:

```
logic/
  calculate-shipping-fee/
    calculate-shipping-fee.logic.vts      # main
  lookup-zone-rate/
    lookup-zone-rate.logic.vts            # helper called by main
```

`lookup-zone-rate.logic.vts` — helper blueprint, one function, one file:

```veritas
//* Zone Rate Lookup
"""Return the per-kg shipping rate for a destination zone."""
function lookupZoneRate(
    //* Destination zone code (A-E)
    zone: _text
) ->
    //* Shipping rate per kilogram, in euros
    ratePerKg: number
{
    //* Resolve zone rate
    choose {
        //* Zone A (domestic)
        if (zone is "A") {
            //* Set rate
            ratePerKg = 2.50;
        }
        //* Zone B (regional)
        if (zone is "B") {
            //* Set rate
            ratePerKg = 4.00;
        }
        //* Default zone (international)
        else {
            //* Set rate
            ratePerKg = 9.50;
        }
    }
    //* Return
    return;
}
```

`calculate-shipping-fee.logic.vts` — main blueprint, calls the helper by its label:

```veritas
//* Calculate Shipping Fee
"""Total shipping fee = zone rate × weight, with optional expedited surcharge."""
function calculateShippingFee(
    //* Destination zone code (A-E)
    zone: _text,
    //* Package weight in kilograms
    weightKg: number,
    //* Whether expedited shipping is requested
    expedited: boolean
) ->
    //* Total shipping fee in euros
    totalFee: number
{
    //* Look up the zone's base rate via the helper blueprint
    var
    //* Zone lookup result
    zoneResult: any single = zone_rate_lookup(zone: zone);

    //* Compute base fee
    totalFee = zoneResult.ratePerKg * weightKg;

    //* Apply expedited surcharge
    choose {
        //* Expedited shipment
        if (expedited is true) {
            //* Add 50% surcharge
            totalFee = totalFee * 1.5;
        }
    }

    //* Return
    return;
}
```

Key points:

- `zone_rate_lookup(...)` — the call name is the helper's **`callIdentifier`**, derived from its `//* Zone Rate Lookup` label (lowercase, non-alphanumeric runs → `_`). It is **not** the helper's function-declaration name (`lookupZoneRate`). In the chat agent, take the exact string from `list_blueprints`; when authoring files, apply the rule to the label.
- `zone: zone` — a **named argument**: the left side is the helper's input parameter `zone`, the right side is the caller's expression. Every argument must be named.
- Declare the result variable as `any single`. It receives the helper's **full output object**; read fields off it: `zoneResult.ratePerKg`. The object's shape matches the helper's output parameters.
- The helper is a complete, self-contained blueprint — it could be run standalone via `leapter runtime run --model lookup-zone-rate`, or called from any other blueprint in the project.
