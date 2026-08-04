# Veritas Built-in Functions & Operations v0.2

Reference for all built-in operations available in Veritas blueprints.

For control-flow syntax such as `choose`, loops, and `decide` decision tables, see `veritas-spec-0.2.md`.

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
| `max(list, fallback?)`     | `highest = max(scores, 0)`           | **Built-in.** Largest number in a list; absent (null) entries are skipped. Empty list returns `fallback`, or **errors** if none is given (never null). Do not hand-roll an `if (x > cur)` loop. For the larger of two scalars, `max([a, b])`. |
| `min(list, fallback?)`     | `lowest = min(scores, 0)`            | **Built-in.** Smallest number in a list; absent (null) entries are skipped. Empty list returns `fallback`, or **errors** if none is given (never null). Do not hand-roll an `if (x < cur)` loop. For the smaller of two scalars, `min([a, b])`. |
| `find(list, field, value)` | `leg = find(flightLegs, "id", legId)` | **Built-in.** The **first** item in a list of records whose `field` equals `value`, or `null` if none matches. Look up a record by key — do not hand-roll a `for … choose { if (row.id is key) … }` search loop. `field` is the attribute name as a string; absent (null) entries are skipped; returns the **item itself** (not a one-element list). |
| `contains(list, value)`    | `ok = contains(ids, id)`             | **Built-in.** `true` when `list` holds an element equal to `value` (list of primitives). Membership test — do not hand-roll `.indexOf(value) >= 0`. Strict like `find`: case-sensitive, no coercion, empty → `false`. Records: use `find`. |

### Not Supported

| Operation          | Use Instead                           |
| ------------------ | ------------------------------------- |
| `.map(fn)`         | Index-based `for` loop                |
| `.filter(fn)`      | `for` loop with conditional `.push()` |
| `.reduce(fn)`      | Accumulator variable with `for` loop  |
| `.forEach(fn)`     | `for...in` or index-based `for` loop  |
| `.find(fn)`        | `find(list, field, value)` built-in (look up by key); `for` loop with `break` only for a computed/non-equality match |
| `.includes(value)` | `contains(list, value)` built-in (membership test) |

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

Pass structured data by declaring a type in the project's types document and referencing it from the logic:

```veritas
// The project's types document
define Employee "Someone on the payroll" {
  name: _text "Legal name"
  salary: number "Annual salary in USD"
  rating: number "Performance rating, 1-5"
}
```

```veritas
// Blueprint: Calculate Bonuses
//* Calculate Bonuses
"""Distributes a bonus pool proportionally to employee performance."""
function calculate_bonuses(
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
- Validation checks field references — a typo like `employee.ratng` fails with a cross-reference error.

### Lookup by key — use the `find` built-in

To fetch the record whose `field` equals a value, call **`find`** — never hand-roll a search loop. It returns the **first** match or `null`:

```veritas
//* Look up the rule for this member's role
var
//* Matching duty rule, or null if the role has none
matchingRule: any single = find(rules, "role", member.role);
```

`find(list, field, value)` transpiles to the right idiom on every runtime (a `next(...)` generator in Python, a first-match scan in JavaScript). It returns the item itself (or `null`), so guard before reading fields off it:

```veritas
//* Read the rule only when one was found
choose {
    //* Rule exists for this role
    if (matchingRule isnt null) {
        //* Use it
        maxHours = matchingRule.maxDutyHours;
    }
}
```

Reach for a `for` loop with `break` **only** when the match is not a simple field-equals-value (e.g. a computed key or a range comparison).

### Membership — use the `contains` built-in

Test whether a value is in a list of primitives with **`contains`** — never `.indexOf(value) >= 0`:

```veritas
present = contains(cartItemIds, parentId);
```

Strict equality like `find`: case-sensitive, no coercion, empty list → `false`. For records, use `find`.

### Handling absent values — use the `if_absent` built-in

When a value might be absent (`null`) — most often the result of a `find` — supply a fallback with **`if_absent`** instead of a `choose`/`if` null guard:

```veritas
//* The rule for this member's role, or the default when the role has none
matchingRule: any single = if_absent(find(rules, "role", member.role), defaultRule);
```

`if_absent(value, fallback)` returns `value` unless it is absent (`null`), in which case it returns `fallback`. It is **null-coalescing, not truthiness**: a present-but-empty value — `0`, `""`, `false`, an empty list — is a real value and passes straight through, so only genuine absence triggers the fallback.

```veritas
//* Keep the entered quantity; only default when it was never provided
quantity: number = if_absent(order.quantity, 0);   // an entered 0 stays 0
```

Prefer `if_absent` over the `choose { if (x isnt null) … }` guard whenever you just need a fallback value — it reads as one line and cannot forget the null case.

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

Rounding, smallest, and largest are **built-ins** — use them (not `Math.round` / `Math.min` / `Math.max`):

| Need                            | Use                      | Example                                        |
| ------------------------------- | ------------------------ | ---------------------------------------------- |
| Round (to integer or decimals)  | `round(value, decimals)` | `round(3.7)` → `4`; `round(3.14159, 2)` → `3.14` |
| Smaller of two                  | `min([a, b])`            | `min([3, 7])` → `3`                            |
| Larger of two                   | `max([a, b])`            | `max([3, 7])` → `7`                            |

`round` breaks ties away from zero (`round(2.5)` → `3`); `decimals` defaults to `0`.

Everything else uses the host `Math` object directly:

| Function              | Example                 |
| --------------------- | ----------------------- |
| `Math.floor(n)`       | `Math.floor(3.7)` → `3` |
| `Math.ceil(n)`        | `Math.ceil(3.2)` → `4`  |
| `Math.abs(n)`         | `Math.abs(-5)` → `5`    |
| `Math.pow(base, exp)` | `Math.pow(2, 3)` → `8`  |
| `Math.sqrt(n)`        | `Math.sqrt(16)` → `4`   |

## Number Formatting

| Operation           | Example            | Result                    |
| ------------------- | ------------------ | ------------------------- |
| `n.toFixed(digits)` | `price.toFixed(2)` | `"123.40"` (returns text) |

> Number-to-string via `+ ""` drops trailing zeros: `60000 + ""` → `"60000"`. Use `.toFixed(N)` when precision matters.

## Date / Time Operations

Dates are **built-ins** — use them for every comparison, difference, calendar shift, or component read. **Never** construct a host `Date` (`new Date(...)`): it parses in the runtime's local timezone, uses 0-based months, and gives different answers on different runtimes. The built-ins are pinned to FEEL/DMN semantics and compute identically everywhere.

A `date` is a plain ISO calendar day, `"YYYY-MM-DD"` (no time, no timezone). A `duration` is an ISO-8601 **date-part** string — `PnYnMnWnD` (e.g. `"P1Y"`, `"P30D"`, `"P1M15D"`, `"P2W"`); a time component (`"…T…H"`) or empty `"P"` is rejected.

| Operation                            | Example                                        | Notes                                                                                                     |
| ------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `is_before(a, b)`                    | `is_before(orderDate, startDate)`              | **Built-in.** True if date `a` is strictly before `b`. Null if either operand is absent (null).           |
| `is_after(a, b)`                     | `is_after(orderDate, endDate)`                 | **Built-in.** True if `a` is strictly after `b`. Null if either is absent.                                 |
| `is_same_date(a, b)`                 | `is_same_date(a, b)`                           | **Built-in.** True if the same calendar day. Null if either is absent.                                     |
| `days_between(a, b)`                 | `elapsed = days_between(issuedOn, today)`      | **Built-in.** Signed whole days from `a` to `b` (positive when `b` is later, negative when earlier). Null if either is absent. |
| `add_duration(d, iso)`               | `expiry = add_duration(issuedOn, "P30D")`      | **Built-in.** `d` shifted forward by an ISO duration. Years/months apply first, clamped to end-of-month, then days. Null on absent or malformed input. |
| `subtract_duration(d, iso)`          | `windowStart = subtract_duration(today, "P1Y")`| **Built-in.** `d` shifted backward by an ISO duration. Same rules as `add_duration`.                      |
| `year_of(d)`                         | `y = year_of(orderDate)`                       | **Built-in.** Calendar year as a number. Null if absent.                                                  |
| `month_of(d)`                        | `m = month_of(orderDate)`                      | **Built-in.** Month **1-12** (January is **1**, following FEEL — NOT 0-based). Null if absent.             |
| `day_of(d)`                          | `day = day_of(orderDate)`                       | **Built-in.** Day-of-month, 1-31. Null if absent.                                                         |

Key behaviors:

- **Absent propagates.** Any built-in returns `null` when a `date`/`duration` operand is absent — comparisons return `null`, not `false`. Guard with `if_absent` or a `choose` when a definite answer is required.
- **End-of-month clamps.** `add_duration("2020-01-31", "P1M")` is `"2020-02-29"` (not March 2) — a month shift never overflows into the next month.
- **Months are 1-based.** `month_of("2026-03-09")` is `3`, not `2`.

### Worked example — effective-dated pricing

A price is active only within its `[startDate, endDate]` window — the classic "is this rule in effect on the order date?" check:

```veritas
//* Sale price applies only within its active window
function is_price_active(
    //* The date the order is being priced
    orderDate: date,
    //* When this price starts applying
    startDate: date,
    //* When this price stops applying (inclusive)
    endDate: date
) ->
    //* True if orderDate falls within [startDate, endDate]
    active: boolean
{
    //* Active iff not before the start and not after the end
    active = !is_before(orderDate, startDate) and !is_after(orderDate, endDate);
    //* Return
    return;
}
```

`add_duration` computes the window itself — e.g. a quote honored for 30 days: `expiry = add_duration(issuedOn, "P30D")`, then `valid = !is_after(today, expiry)`.

## Blueprint Calls

A Leapter project is a set of blueprints that can call each other. This is the primary unit of reuse — decompose complex logic into a main blueprint plus helper blueprints and have main **call the helpers like ordinary functions**.

### Syntax

A blueprint call is a normal function call with **named arguments**:

```
var resultVar: any single = callIdentifier(paramName: expression, ...);
```

It composes inside expressions too: `total = base + calculate_tax(amount: subtotal).tax;`.

**Rules:**

- **Named arguments only.** Each argument is `paramName: value`, where `paramName` is an input parameter of the called blueprint. (Positional arguments are only for built-ins like `round(x, 2)`.)
- **The call name is the blueprint's `callIdentifier`, NOT its label.** A stored blueprint doesn't keep its function name, so the call name is the **label lowercased with every run of non-alphanumeric characters replaced by `_`**: `"Zone Rate Lookup"` → `zone_rate_lookup`, `"Calculate Tax"` → `calculate_tax`.
  - When authoring files, derive it from the helper's `//*` label with the rule above.
- **Same-file helpers** (multiple functions in one file): call by the helper function's own identifier name, and declare the helper **before** the main function.
- The result receives the **full output object** of the called blueprint, not a single field. Access fields via `resultVar.fieldName`. Declare the result variable as `any single`.

### Worked example — a helper blueprint in a project

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
function zone_rate_lookup(
    //* Destination zone code (A-E)
    zone: _text
) ->
    //* Shipping rate per kilogram, in euros
    ratePerKg: number
{
    //* Resolve zone rate
    decide first
    | zone | -> ratePerKg |
    | ---  | ---          |
    | "A"  | 2.50         |
    | "B"  | 4.00         |
    | any  | 9.50         |
    //* Return
    return;
}
```

`calculate-shipping-fee.logic.vts` — main blueprint, calls the helper:

```veritas
//* Calculate Shipping Fee
"""Total shipping fee = zone rate × weight, with optional expedited surcharge."""
function calculate_shipping_fee(
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

- `zone_rate_lookup(...)` — the call name is the helper's **`callIdentifier`**, derived from its `//* Zone Rate Lookup` label (lowercase, non-alphanumeric runs → `_`). Author the helper's declaration with that same slug (`function zone_rate_lookup`) so its name matches how it's called. The call name is derived from the **label**, never from a remembered function name — a stored sibling doesn't expose its declaration name.
  When authoring files, apply the rule to the label.
- `zone: zone` — a **named argument**: the left side is the helper's input parameter `zone`, the right side is the caller's expression. Every argument must be named.
- Declare the result variable as `any single`. It receives the helper's **full output object**; read fields off it: `zoneResult.ratePerKg`. The object's shape matches the helper's output parameters.
- The helper is a complete, self-contained blueprint — it can be run standalone or called from any other blueprint in the project.
