# Veritas Language Specification v0.2

Veritas is a business logic DSL. Programs are called **blueprints**. Every statement requires a label. The runtime is ES5-based with specific divergences documented below.

Projects declare shared domain types in a single `data/types.data.vts` file and reference them from `.logic.vts` blueprints — see **Structured Types** below.

## Design Philosophy

Veritas blueprints are **living documentation** of business rules. They are meant to be validated by **domain experts who are not programmers**. Every naming choice should prioritize human readability:

- Use descriptive variable names: `monthlyPremium`, not `mp` or `premium`
- Use full words in labels: `//* Calculate monthly insurance premium`, not `//* Calc premium`
- Section descriptions explain the **business rationale** — reference regulations, policies, or domain context
- Avoid abbreviations: `discountRate`, not `discRate`; `customerAge`, not `age` (when ambiguous)
- Loop variables are the one exception where short names (`index`, `itemIndex`) are acceptable

## Best Practices

- **Structure blueprints as narratives.** A reader should understand the business logic by reading section titles and descriptions alone, without looking at the code.
- **One business concept per section.** Split when the narrative shifts — "determine rates" and "apply rates" are two sections.
- **Nest subsections for complex steps.** A parent section introduces the concept, child sections handle the sub-steps.
- **Keep sections to ~15-20 statements.** Beyond that, look for natural split points.
- **Labels describe the action in domain language.** `//* Apply no-claims discount for clean driving records` not `//* Multiply by 0.9`.
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
| **Primitives**   | `_text`, `number`, `boolean`, `date`, `time`, `datetime`, `duration`, `range`        | Classes, generics                                  |
| **User types**   | Structures + aliases via `define` in `data/types.data.vts`                           | Inline `define` inside `.logic.vts`                |
| **Collections**  | `list of <type>`, `any single`, `any multiple`                                       | `list of any`, `map of any`                        |
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

> Function inputs and outputs can be primitives (`_text`, `number`, ...), `list of <type>`, or user-defined structures and aliases declared in `data/types.data.vts`. See **Structured Types** below for authoring a shared domain model.

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

### Parameter Defaults

Input and output parameters can carry a default value. The caller's value takes precedence; when absent, the runtime applies the default at function entry.

```veritas
function calculateTotal(
    //* Base amount
    amount: number,
    //* Tax rate — defaults to 0.19 when the caller omits it
    taxRate: type number = 0.19;
) ->
    //* Running items, starts empty
    items: type list of number = [];,
    //* Running total, starts at zero
    total: type number = 0;
{
    //* Apply rate
    total = amount * (1 + taxRate);
    //* Return
    return;
}
```

**Syntax:**

- Use `type` before the type name to take the default-value form: `name: type <primitive> = <literal>;`. Without `type` (`name: number`), defaults are not allowed.
- Between parameters the inline-type form terminates with `;,` — the `;` closes the inline type, `,` separates the params. The last parameter in the list uses `;` alone.
- Supported: primitives (`_text`, `number`, `boolean`, `date`, `time`, `datetime`, `duration`, `range`) and `list of <primitive>` / `map of <primitive>`.
- Not supported: user-defined structures, `any single`, `any multiple`. Initialize those in the function body if needed.

**Why this matters:** declare the starting state of an output in its signature instead of writing an `"Initialize outputs"` section at the top of the body that assigns `[]`, `0`, `false` to every output. Fewer statements, the contract is visible to the caller, and the reader sees the defaults without scanning the body.

## Types

### Primitives

The canonical spelling in v0.2 is `_text` for strings. The legacy `string` keyword is still accepted but prefer `_text` in new code.

| Type       | Description        | Example      |
| ---------- | ------------------ | ------------ |
| `_text`    | Unicode string     | `"hello"`    |
| `number`   | Integer or decimal | `42`, `3.14` |
| `boolean`  | `true` or `false`  | `true`       |
| `date`     | Calendar date      | —            |
| `time`     | Time of day        | —            |
| `datetime` | Date and time      | —            |
| `duration` | Time span          | —            |
| `range`    | Numeric interval   | —            |

> Do **not** write bare `text` in v0.2 — the linker treats an unknown identifier as a reference to a missing user-defined type and produces a `Cannot find type 'text'` error. Use `_text`.

### Collections and Dynamic Types

| Type             | Use for                        | Example                  | Input supported? |
| ---------------- | ------------------------------ | ------------------------ | ---------------- |
| `list of <type>` | Array of primitives or structs | `[1, 2, 3]` / `[order]`  | yes              |
| `any single`     | Opaque single object           | `{"name": "Alice"}`      | yes              |
| `any multiple`   | Opaque array of objects        | `[{"id": 1}, {"id": 2}]` | yes              |
| `any`            | Unknown/flexible               | —                        | no               |

**Invalid:** `list of any`, `map of any`. Prefer a named structure over `any single` / `any multiple` whenever the shape is known — structures give the reader a name, and the CLI validates cross-references against the types document.

**Maps:** `map of <type>` parses but the runtime does not support dynamic property assignment on `{}` objects. Model the shape as a structure when the keys are fixed.

## Structured Types

In v0.2 a project may declare shared domain types in a **single types document** at `data/types.data.vts`. One document per project. Logic files reference the declared names directly in parameter, output, and variable positions.

> **Iteration-1 constraint:** only one `.data.vts` file per project. Multi-file type models are a follow-up.

### `data/types.data.vts`

Two forms of `define` are supported: structures (fields with types) and aliases (a new name for an existing type, optionally constrained to a value set).

```veritas
// data/types.data.vts

define Employee "Someone on the payroll" {
  name: _text "Legal name"
  salary: number "Annual salary in USD"
  rating: number "Performance rating, 1-5"
}

define Order "A customer order" {
  orderId: _text "External order identifier"
  total: number "Order total in USD"
  tier: Tier "Loyalty band the customer is in"
}

define Tier "Customer loyalty band" as _text constrained_to ["bronze", "silver", "gold"]
```

**Structure rules:**

- `define Name "description" { ... }` — the description string is recommended. The `as Structure` suffix is accepted but redundant; omit it.
- Each field: `fieldName: Type "description"?`, optionally followed by `?` to mark the field optional.
- Field types can be primitives, other structures, `list of <type>`, or aliases.
- Fields may reference structures defined later in the same file — order is not significant.

**Alias rules:**

- `define Name "description" as <type>` creates a semantic alias for an existing type.
- Add `constrained_to [...]` with string literals to produce an enum-like restriction (today validated by the runtime, not by the grammar).

**Naming conventions:**

- `PascalCase` for structure and alias names (`Employee`, `Tier`).
- `camelCase` for field names (`orderId`, `totalAmount`).
- Match the convention LLMs default to so generated code stays idiomatic.

### Using structures from `.logic.vts`

Reference declared names directly:

```veritas
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
    //* Declare loop index
    var
    //* Current position
    index: number = 0;

    //* Pay each employee
    for (index = 0; index < employees.length; index += 1) {
        //* Current employee (for trace readability)
        var
        //* Employee being processed
        currentEmployee: Employee = employees[index];
        //* Bonus for this employee
        var
        //* Weighted bonus
        bonus: number = bonusPool * currentEmployee.rating / 5;
        //* Store bonus
        bonuses.push(bonus);
    }
    //* Return
    return;
}
```

**Rules:**

- Field access uses dot notation: `currentEmployee.name`, `order.tier`. Nested access works: `order.customer.email`.
- Bracket notation is required for reserved-word field names: `item["type"]`.
- A logic file that references an undefined type produces a `Cannot find type '<Name>'` error during `leapter validate`. Fix the types file first, then re-validate the logic.

### Validation loop

```
1. Edit data/types.data.vts → leapter validate
2. Edit logic/<slug>/<slug>.logic.vts → leapter validate
3. If logic reports `Cannot find type '...'`, return to step 1
```

Validating the types document in isolation (before the logic) keeps the error loop targeted. The CLI runs both passes automatically during a project-level `leapter validate`.

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

| Operator                          | Description                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `+` `-` `*` `/` `%`               | Arithmetic                                                                                                                         |
| `+=` `-=` `*=` `/=` `%=`          | Compound assignment                                                                                                                |
| `<` `<=` `>` `>=`                 | Comparison                                                                                                                         |
| `==` `===` `!=` `!==` `is` `isnt` | Equality (`is` → `===`, `isnt` → `!==`). **Never write `is not`** — that parses as `x === (not y)`, not as inequality. Use `isnt`. |

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
itemCategory: _text = items[index]["type"];
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

**Fix:** If the keys are known in advance, define a structure in `data/types.data.vts` and construct an instance up front rather than assigning keys at runtime. Reading properties on input objects works fine.

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