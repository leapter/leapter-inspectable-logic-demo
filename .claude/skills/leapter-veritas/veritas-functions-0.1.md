# Veritas Built-in Functions & Operations v0.1

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
| `arr.sort()`               | `sorted = items.slice().sort()`      | **Lexicographic only** — sorts `[10, 2, 3]` as `[10, 2, 3]`, not `[2, 3, 10]`. No custom comparator. Use bubble sort for numeric sorting. |

### Not Supported

| Operation          | Use Instead                           |
| ------------------ | ------------------------------------- |
| `.map(fn)`         | Index-based `for` loop                |
| `.filter(fn)`      | `for` loop with conditional `.push()` |
| `.reduce(fn)`      | Accumulator variable with `for` loop  |
| `.forEach(fn)`     | `for...in` or index-based `for` loop  |
| `.find(fn)`        | `for` loop with `break`               |
| `.includes(value)` | `.indexOf(value) >= 0`                |

### Numeric Sort Pattern

Since `.sort()` is lexicographic, use bubble sort for numeric ordering:

```veritas
//* Declare sort indices
var
//* Outer index
outerIndex: number = 0,
//* Inner index
innerIndex: number = 0,
//* Swap temporary
swapTemp: number = 0;

//* Bubble sort ascending
for (outerIndex = 0; outerIndex < values.length; outerIndex += 1) {
    //* Compare adjacent pairs
    for (innerIndex = 0; innerIndex < values.length - 1 - outerIndex; innerIndex += 1) {
        //* Swap if out of order
        choose {
            //* Current greater than next
            if (values[innerIndex] > values[innerIndex + 1]) {
                //* Store current
                swapTemp = values[innerIndex];
                //* Move next to current position
                values[innerIndex] = values[innerIndex + 1];
                //* Place stored value in next position
                values[innerIndex + 1] = swapTemp;
            }
        }
    }
}
```

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
currentName: text = employeeNames[index],
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

### Parallel Arrays Pattern (replacing maps/dictionaries)

The runtime does not support dynamic property assignment. Use parallel arrays for key-value lookups:

```veritas
//* Declare computed scores
var
//* Per-item scores
scores: any multiple = [];

//* Compute score for each item
for (var item in items) {
    //* Calculate and store score
    scores.push(item.value * multiplier);
}
// Access score for item at index: scores[index]
```

### Associative Primitive Arrays (v0.1 input workaround)

In v0.1, function inputs only support primitives and primitive arrays — no `any single` or `any multiple`. To pass structured data (e.g., a list of employees), use parallel primitive arrays matched by index:

```veritas
//* Bonus Calculator
"""Calculates performance bonuses using parallel arrays for employee data."""
function calculateBonuses(
    //* Employee names (one per employee, index-matched)
    employeeNames: list of text,
    //* Annual salaries (one per employee, index-matched)
    employeeSalaries: list of number,
    //* Performance ratings 1-5 (one per employee, index-matched)
    employeeRatings: list of number,
    //* Company-wide bonus pool
    bonusPool: number
) ->
    //* Per-employee bonus amounts
    bonuses: list of number
{
    section "Validate Input Arrays" {
        """All employee arrays must have the same length to ensure data integrity."""
        //* Check array lengths match
        choose {
            //* Mismatched array lengths
            if (employeeNames.length != employeeSalaries.length or employeeNames.length != employeeRatings.length) {
                //* Reject invalid input
                throw "All employee arrays must have the same length";
            }
        }
    }

    section "Calculate Bonuses" {
        """Distribute the bonus pool proportionally based on salary-weighted performance ratings."""
        //* Declare loop index
        var
        //* Current employee position
        index: number = 0;

        //* Process each employee
        for (index = 0; index < employeeNames.length; index += 1) {
            //* Current employee name (for trace readability)
            var
            //* Name of the employee being processed
            currentName: text = employeeNames[index];
            //* Calculate weighted bonus
            var
            //* Bonus for this employee
            bonus: number = bonusPool * employeeRatings[index] / 5;
            //* Store bonus
            bonuses.push(bonus);
        }
    }

    //* Return results
    return;
}
```

**Naming convention:** `<entity><Field>` — e.g., `employeeNames`, `employeeSalaries`, `employeeRatings`. Always validate that all arrays have matching lengths.

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
| `Math.round(n)`       | Round to nearest integer | `Math.round(3.7)` → `4` |
| `Math.floor(n)`       | Round down               | `Math.floor(3.7)` → `3` |
| `Math.ceil(n)`        | Round up                 | `Math.ceil(3.2)` → `4`  |
| `Math.abs(n)`         | Absolute value           | `Math.abs(-5)` → `5`    |
| `Math.min(a, b)`      | Smaller of two           | `Math.min(3, 7)` → `3`  |
| `Math.max(a, b)`      | Larger of two            | `Math.max(3, 7)` → `7`  |
| `Math.pow(base, exp)` | Exponentiation           | `Math.pow(2, 3)` → `8`  |
| `Math.sqrt(n)`        | Square root              | `Math.sqrt(16)` → `4`   |

> There is no bare `round()` function — always use `Math.round()`.

### Rounding to Decimal Places

```veritas
//* Round to 2 decimal places
roundedAmount = Math.round(amount * 100) / 100;
```

## Number Formatting

| Operation           | Example            | Result                    |
| ------------------- | ------------------ | ------------------------- |
| `n.toFixed(digits)` | `price.toFixed(2)` | `"123.40"` (returns text) |

> Number-to-string via `+ ""` drops trailing zeros: `60000 + ""` → `"60000"`. Use `.toFixed(N)` when precision matters.

## Blueprint Calls

Invoke another blueprint (helper function or external model):

```veritas
//* Look up tier rate
__call_blueprint__ @ref("Rate Lookup") (
    tier = customerTier
) -> rateResult;

//* Use the returned value
finalPrice = amount * rateResult.rate;
```

**Syntax:** `__call_blueprint__ @ref(modelName, appName?) (inputs) -> resultVar;`

**Rules:**

- `@ref` takes `(modelName)` or `(modelName, appName)`
- **Same file:** use the function identifier name — `@ref("lookupRate")`
- **Cross-file (same project):** use the blueprint's `//*` label — `@ref("Rate Lookup")`
- **Cross-project:** use `@ref("ModelName", "AppName")`
- `-> resultVar` receives the **full output object**, not a single field. Access fields via `resultVar.fieldName`
- The result variable should be typed as `any single`
- Helper functions are placed **before** the main function in the file
