# Veritas Language Specification v0.1

Veritas is a business logic DSL. Programs are called **blueprints**. Every statement requires a label. The runtime is ES5-based with specific divergences documented below.

> **Scope:** This spec covers the core language without custom complex types (`define`). Custom types will be covered in a future version.

## Design Philosophy

Veritas blueprints are **living documentation** of business rules. They are meant to be validated by **domain experts who are not programmers**. Every naming choice should prioritize human readability:

- Use descriptive variable names: `totalPrice`, not `tp` or `price`
- Use full words in labels: `//* Calculate total pizza price`, not `//* Calc price`
- Section descriptions explain the **business rationale** — reference regulations, policies, or domain context
- Avoid abbreviations: `discountRate`, not `discRate`; `customerAge`, not `age` (when ambiguous)
- Loop variables are the one exception where short names (`index`, `itemIndex`) are acceptable

## Best Practices

- **Structure blueprints as narratives.** A reader should understand the business logic by reading section titles and descriptions alone, without looking at the code.
- **One business concept per section.** Split when the narrative shifts — "determine rates" and "apply rates" are two sections.
- **Nest subsections for complex steps.** A parent section introduces the concept, child sections handle the sub-steps.
- **Keep sections to ~15-20 statements.** Beyond that, look for natural split points.
- **Labels describe the action in domain language.** `//* Apply Pizza Tuesday 20% discount` not `//* Multiply by 0.8`.
- **Prefer `and`/`or`/`not`/`is` over symbolic operators.** Natural language operators make conditions readable by non-programmers.
- **Use `for...in` when you don't need the index.** `for (var item in items)` is more readable than index-based loops.
- **Validate early, fail fast.** Put input validation sections at the top of the function with `throw` for hard rejections.
- **Assign outputs directly.** Never re-declare output parameters with `var` — assign to them directly.
- **Name the current item in loops.** At the start of each loop iteration, assign a descriptive variable like `currentInvestorName = investors[index].name`. This makes execution traces self-documenting — a reader sees _who_ is being processed, not just "iteration 2."
- **Never push large inline objects.** If an object has more than 2-3 fields, pre-compute each field into a labeled variable, then push. Inline `{ "a": x, "b": y, "c": z, ... }` renders as an unreadable wall of text in the blueprint viewer. Each field should be a separate labeled step so domain experts can trace the logic.
- **Follow project layout.** Each blueprint lives in its own subdirectory: `logic/<slug>/<slug>.logic.vts`. This is required for `leapter runtime run --model <slug>` to resolve the file.

## Quick Reference

Expressions in Veritas follow **ES5 JavaScript** compliance — same operator precedence and standard library. The tables below list Veritas-specific additions and restrictions on top of ES5.

| Category         | Supported                                                                            | Not Supported                                      |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| **Types**        | `number`, `text`, `boolean`, `date`, `time`, `datetime`, `duration`, `range`         | Classes, interfaces, enums, generics               |
| **Collections**  | `list of <primitive>`, `any single`, `any multiple`                                  | `list of any`, `map of any`                        |
| **Control flow** | `choose`/`if`/`else`, `for` (index), `for...in` (each), `while`, `break`, `continue` | Standalone `if`, `else if`, `switch`, `do...while` |
| **Operators**    | `+` `-` `*` `/` `%` `&&` `                                                           |                                                    | ` `!` `and` `or` `not` `is` `==` `===` | `++` `--`, `? :` (avoid — use choose/if/else) |
| **Null**         | `null`, `absent`                                                                     | —                                                  |
| **Functions**    | `function`, `__call_blueprint__`, `throw`, `return;`                                 | Arrow functions, closures, callbacks, `new`        |
| **Literals**     | Numbers, strings (`""`/`''`), booleans, `null`, arrays `[]`, objects `{}`            | Template literals, regex                           |

## Document Structure

A document contains one or more function declarations. Nothing else at the top level. Helper functions come first, main function last.

```veritas
//* Helper Function
function helper(...) -> ... { ... }

//* Main Function
function main(...) -> ... { ... }
```

## Functions

Every function has typed inputs, typed outputs (after `->`), and a body. Output parameters use bare `->` syntax. The function ends with `return;` (no expression).

> **v0.1 limitation:** Function **inputs** can only be primitives (`number`, `text`, `boolean`) and primitive arrays (`list of number`, `list of text`). Complex types (`any single`, `any multiple`) are **not supported as inputs** — the UI cannot render them. To pass structured data, use **associative primitive arrays** (parallel arrays with matching indices — see Types section). Outputs have no such restriction.

```veritas
//* Tax Calculator
"""Calculates total price including tax."""
function calculateTotal(
    //* Base price
    price: number,
    //* Tax rate as decimal
    taxRate: number
) ->
    //* Total with tax
    total: number
{
    //* Calculate total
    total = price * (1 + taxRate);
    //* Return
    return;
}
```

> Input `{"price": 100, "taxRate": 0.19}` → Output `{"total": 119}`

**Rules:**

- Assign to output parameters directly — never re-declare them with `var` (this shadows the output and produces empty results)
- Every `return;` path must have all outputs assigned
- `return` takes no expression

## Types

### Primitives

| Type       | Description        | Example      |
| ---------- | ------------------ | ------------ |
| `number`   | Integer or decimal | `42`, `3.14` |
| `text`     | Unicode string     | `"hello"`    |
| `boolean`  | `true` or `false`  | `true`       |
| `date`     | Calendar date      | —            |
| `time`     | Time of day        | —            |
| `datetime` | Date and time      | —            |
| `duration` | Time span          | —            |
| `range`    | Numeric interval   | —            |

> Both `text` and `_text` are accepted. Prefer `text`.

### Collections and Dynamic Types

| Type             | Use for             | Example                  | As input (v0.1)   |
| ---------------- | ------------------- | ------------------------ | ----------------- |
| `list of number` | Array of primitives | `[1, 2, 3]`              | supported         |
| `list of text`   | Array of strings    | `["a", "b"]`             | supported         |
| `any single`     | A single object     | `{"name": "Alice"}`      | **not supported** |
| `any multiple`   | Array of objects    | `[{"id": 1}, {"id": 2}]` | **not supported** |
| `any`            | Unknown/flexible    | —                        | **not supported** |

**Invalid:** `list of any`, `map of any`. Use `any multiple` for arrays of complex objects.

**Maps:** `map of <type>` parses but the runtime does not support dynamic property assignment on `{}` objects. Use parallel arrays instead.

### Associative Primitive Arrays (v0.1 workaround for complex inputs)

Since `any single` and `any multiple` cannot be used as function inputs in v0.1, represent structured data as **parallel primitive arrays** — one array per field, matched by index. Name them `<entity><Field>` (e.g., `employeeNames`, `employeeSalaries`), validate lengths match at the top, and document the association in labels. See `veritas-functions-0.1.md` for a complete working example.

## Variables

Variables require a `//*` label on the `var` statement AND a `//*` label on each declarator.

```veritas
//* Declare amounts
var
//* Tax rate
rate: number = 0.08,
//* Discount
discount: number = 0;
```

Compound assignment operators: `=`, `+=`, `-=`, `*=`, `/=`, `%=`

**Variable shadowing:** Never declare `var x` when `x` is an output parameter. The `var` creates a separate local variable — the output will be empty.

## Operators

### Arithmetic and Comparison

| Operator                   | Description                            |
| -------------------------- | -------------------------------------- |
| `+` `-` `*` `/` `%`        | Arithmetic                             |
| `+=` `-=` `*=` `/=` `%=`   | Compound assignment                    |
| `<` `<=` `>` `>=`          | Comparison                             |
| `==` `===` `!=` `!==` `is` | Equality (`is` is equivalent to `===`) |

**Not supported:** `++`, `--` — use `+= 1`, `-= 1`.

### Logical

Both symbolic and natural language forms are supported:

| Symbolic | Natural | Description |
| -------- | ------- | ----------- |
| `&&`     | `and`   | Logical AND |
| `\|\|`   | `or`    | Logical OR  |
| `!`      | `not`   | Logical NOT |

```veritas
//* Check both conditions
choose {
    //* Adult with ID
    if (age >= 18 and hasId) {
        //* Approve
        eligible = true;
    }
}
```

### Ternary

The ternary operator `? :` parses and works, but **avoid it** — use `choose { if/else }` instead. Business stakeholders can read a decision block; a ternary is programmer shorthand.

```veritas
// AVOID — not readable by non-programmers
average = count > 0 ? total / count : 0;

// PREFER — clear decision block
choose {
    //* Has items to average
    if (count > 0) {
        //* Calculate average
        average = total / count;
    }
    //* No items
    else {
        //* Default to zero
        average = 0;
    }
}
```

### Null and Absent

- `null` — the null literal
- `absent` — represents undefined/missing values
- `null == absent` evaluates to `true`

> **Runtime note:** Input parameter values are coerced by the runtime before reaching your code (`null` → `0` for numbers, `""` for text). So `param == absent` may be `false` even when the caller passed `null`. Use `absent` for checking internal variables, not inputs.

### Member Access

- Dot notation: `obj.field`
- Bracket notation: `obj["field"]` — **required** for reserved words (`type`, `function`, `return`, `var`, `new`, `delete`, `typeof`)

```veritas
//* Read item type (reserved word — must use bracket notation)
var
//* Category of the current item
itemCategory: text = items[index]["type"];
```

## Control Flow

### choose / if / else

All conditionals must be inside `choose { }`. No standalone `if`. No `else if`.

`choose` is **exclusive** — the first matching `if` executes and all later branches are skipped. The `else` pairs with the immediately preceding `if`.

```veritas
//* Evaluate eligibility
choose {
    //* Meets all criteria
    if (age >= 18 and hasId) {
        //* Approve
        eligible = true;
        //* Set reason
        reason = "Meets all requirements";
    }
    //* Under age
    if (age < 18) {
        //* Deny underage
        eligible = false;
        //* Set reason
        reason = "Must be 18 or older";
    }
    //* Missing ID
    else {
        //* Deny missing ID
        eligible = false;
        //* Set reason
        reason = "Valid ID required";
    }
}
```

> Input `{"age": 25, "hasId": true}` → `{"eligible": true, "reason": "Meets all requirements"}`
> Input `{"age": 16, "hasId": true}` → `{"eligible": false, "reason": "Must be 18 or older"}`
> Input `{"age": 25, "hasId": false}` → `{"eligible": false, "reason": "Valid ID required"}`

### for (index-based)

Loop variables **cannot** be declared in the header (`for (var i = 0; ...)` does not parse). Pre-declare, then use bare assignment:

```veritas
//* Declare loop index
var
//* Current position in the list
index: number = 0;

//* Sum all values
for (index = 0; index < values.length; index += 1) {
    //* Add current value to running total
    total += values[index];
}
```

For nested loops, use descriptive index names (`index`, `innerIndex`, `ruleIndex`).

### for...in (for-each)

Iterates over list elements directly:

```veritas
//* Sum items
for (var item in values) {
    //* Add item
    total += item;
}
```

Works with `list of <primitive>` and `any multiple`. Simpler than index-based when you don't need the index.

### while

```veritas
//* Retry loop
while (attempts < 3) {
    //* Increment
    attempts += 1;
}
```

### break and continue

```veritas
//* Exit loop early
break;

//* Skip iteration
continue;
```

## Sections

Sections group related logic with a title and mandatory description. They are the literate programming layer — the description explains the **business rationale**, not the code.

```veritas
section "Apply Discount" {
    """Apply discount based on code: SAVE10 = 10%, SAVE20 = 20%."""
    //* Init discount
    discount = 0;
    //* Check code
    choose {
        //* 10% discount
        if (discountCode is "SAVE10") {
            //* Apply 10%
            discount = subtotal * 0.10;
        }
        //* 20% discount
        if (discountCode is "SAVE20") {
            //* Apply 20%
            discount = subtotal * 0.20;
        }
    }
}
```

**Rules:**

- `"""description"""` inside braces is mandatory (use `""""""` for empty)
- Sections do NOT take `//*` labels — the title serves as the label
- Sections can nest as subsections
- Keep sections to ~15-20 statements max

### When to Create a Section

- **One business concept per section.** If a section does two unrelated things, split it.
- **Split when the narrative shifts.** A section that determines _rates_ and then _applies_ them is telling two stories — use a subsection or a separate section for each.
- **Use subsections for complex steps within a concept.** If a section has a clear parent concept but distinct sub-steps (e.g., "Compare old vs new method" containing "Old calculation", "New calculation", "Apply the lower amount"), nest subsections inside it.

### Section Structure Patterns

**Flat sections** — for straightforward sequential logic:

```
section "Validate Input" { ... }
section "Calculate Result" { ... }
section "Apply Adjustments" { ... }
```

**Nested subsections** — when a concept has distinct sub-steps:

```
section "Transition Period (Favorability Check)" {
    """Parent describes the overall concept..."""
    section "Tax Under Old Method" {
        """Subsection explains one approach..."""
    }
    section "Tax Under New Method" {
        """Subsection explains the other approach..."""
    }
    section "Apply the Lower Amount" {
        """Subsection explains the comparison..."""
    }
}
```

### What Makes a Good Section Description

| Aspect      | Bad                        | Good                                                                                           |
| ----------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Level**   | "Calculates the tax"       | "Since the 2009 reform, Diesel is taxed at 9.50 EUR/100ccm due to the energy tax differential" |
| **Focus**   | Restates the code          | Explains the business rule, regulation, or design decision behind the code                     |
| **Context** | Generic                    | References specific laws, policies, dates, or domain constraints                               |
| **Scope**   | Covers the entire function | Covers exactly the logic within this section                                                   |

### Common Section Mistakes

- **Description restates the code.** `section "Add components" { """Adds the components""" }` — explain _why_ they are added and what rule governs it instead.
- **One giant section for the whole function.** Defeats the purpose — the blueprint reads like uncommented code.
- **Too many tiny sections.** A section wrapping a single variable assignment is noise. Group logically related statements together.
- **Missing subsections in large blocks.** If a section has 30+ statements with distinct phases, readers lose the thread. Add subsections at the natural boundaries.

## Labels and Node IDs

Every statement requires a `//*` label on the line before it. Sections are the only exception (the title is the label).

```veritas
//* label            ← mandatory on every statement
"""description"""    ← optional (mandatory inside sections)
<statement>
```

**Node IDs** are auto-generated by post-processing. Do not generate them in new code. When editing existing code, preserve them:

| Format        | Used for              | Example              |
| ------------- | --------------------- | -------------------- |
| `//#id UUID`  | Function declarations | `//#id a0000001-...` |
| `@T-aabbccdd` | All other nodes       | `@S-b0000001`        |

Type prefixes: `S`=Section, `T`=Step, `D`=Decision, `C`=Condition, `E`=Else, `L`=Loop, `V`=Variable, `R`=Return, `X`=Error.

## Return and Throw

```veritas
//* Return results
return;

//* Reject invalid input
throw "Amount must be positive";
```

`return` takes no expression. Assign output parameters before returning. `throw` accepts a string expression.

## Runtime Behavior Notes

These are divergences from standard ES5 that affect blueprint execution:

### var initializers do not reset in loops

```veritas
// WRONG — sum accumulates across iterations
for (var item in items) {
    var sum: number = 0;     // NOT reset on iteration 2, 3, ...
}
```

**Fix:** Declare outside, reset explicitly at loop start.

### No dynamic property assignment

You cannot create properties on `{}` objects at runtime:

```veritas
// BROKEN — runtime error
var lookupTable: any single = {};
lookupTable["key"] = "value";   // fails at runtime
```

**Fix:** Use parallel arrays for lookup patterns. Reading properties on input objects works fine.

### String concatenation with inline arithmetic

Parenthesized arithmetic inside string concatenation can produce broken output:

```veritas
// BROKEN — may produce "NaN" or truncated result
violationMessage = "Missing " + (required - actual) + " items";
```

**Fix:** Pre-compute into a variable, then concatenate:

```veritas
//* Compute the shortfall
var
//* Number of missing items
shortfall: number = required - actual;
//* Build violation message
violationMessage = "Missing " + shortfall + " items";
```

### Number-to-string drops decimals

`60000 + ""` gives `"60000"`, not `"60000.00"`. Use `.toFixed(N)` for precision.
