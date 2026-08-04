# Veritas Language Specification v0.2

Veritas is a business logic DSL. Programs are called **blueprints**. Every statement requires a label. The runtime is ES5-based with specific divergences documented below.

Projects declare shared domain types in a single types document and reference them from logic blueprints — see **Structured Types** below.

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
- **Validate early, fail fast — but let the type system do the type and shape checks.** Every input is validated against its DECLARED TYPE at the run boundary, before your logic runs — not just enums. A `constrained_to` value outside its allowed set is rejected; a Structure-typed input missing a required field or carrying a wrong-typed field is rejected; a `list of <type>` whose items don't match is rejected. So type your inputs — a `constrained_to` alias for "one of a known set," a Structure for a thing-with-fields — and don't hand-write the matching membership / field-presence / field-type guards; the runtime already does them. Reserve top-of-function `throw` validation for what types can't express — numeric ranges, cross-field consistency, and other business rules.
- **Names are unique per function.** Inputs, outputs, and local declarations share one namespace; every name must be unique across all three. The studio blocks duplicate names, and a duplicate corrupts schema/execution keying.
- **Assign outputs directly.** Never re-declare output parameters with `var` — assign to them directly.
- **Initialize neutral OUTPUT state with a signature default, not a node.** When an output starts at a supported scalar default (`0`, `false`, `""`) or a structured default, declare it in the signature. For output lists of any element type, including user-defined structures, use `= []` (empty) or a populated literal like `= [{ "name": "alice" }]`; for a single (non-list) user-defined structure, use a populated object literal like `= { "name": "alice" }`. Do not create a body node just to assign `someOutput = []`. A `map of <Structure>` default is not supported in the signature — initialize it in the body. Keep a body assignment for computed, branch-specific, reset, unsupported, or domain-significant values such as `regime = "unknown"`.
- **Name the current item in loops.** At the start of each loop iteration, assign a descriptive variable like `currentInvestorName = investors[index].name`. This makes execution traces self-documenting — a reader sees _who_ is being processed, not just "iteration 2."
- **Never push large inline objects.** If an object has more than 2-3 fields, pre-compute each field into a labeled variable, then push. Inline `{ "a": x, "b": y, "c": z, ... }` renders as an unreadable wall of text in the blueprint viewer. Each field should be a separate labeled step so domain experts can trace the logic.
- **Follow project layout.** Each blueprint lives in its own subdirectory: `logic/<slug>/<slug>.logic.vts`. This is required for `leapter runtime run --model <slug>` to resolve the file.

## Quick Reference

Expressions in Veritas follow **ES5 JavaScript** compliance — same operator precedence and standard library. The tables below list Veritas-specific additions and restrictions on top of ES5.

| Category         | Supported                                                                            | Not Supported                                      |
| ---------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| **Primitives**   | `_text`, `number`, `boolean`, `date`, `time`, `datetime`, `duration`, `range`        | Classes, generics                                  |
| **User types**   | Structures + aliases via `define` in the types document                              | Inline `define` inside a logic blueprint           |
| **Collections**  | `list of <type>`, `any single`, `any multiple`                                       | `list of any`, `map of any`                        |
| **Control flow** | `choose`/`if`/`else`, `decide first`, `for` (index), `for...in` (each), `while`, `break`, `continue` | Standalone `if`, `else if`, `decide unique`, `switch`, `do...while` |
| **Operators**    | `+` `-` `*` `/` `%` `&&` `                                                           |                                                    | ` `!` `and` `or` `not` `is` `==` `===` | `++` `--`, `? :` (avoid — use choose/if/else) |
| **Null**         | `null`, `absent`                                                                     | —                                                  |
| **Functions**    | `function`, named calls `f(p: v)` (incl. blueprint calls), `throw`, `return;`        | Arrow functions, closures, callbacks, `new`        |
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

> Function inputs and outputs can be primitives (`_text`, `number`, ...), `list of <type>`, or user-defined structures and aliases declared in the project's types document. See **Structured Types** below for authoring a shared domain model.

```veritas
//* Tax Calculator
"""Adds VAT to a net price so checkout can show the gross amount the customer actually pays. The rate is supplied per call because it varies by product category and jurisdiction."""
function tax_calculator(
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

- **Name the function with its label's snake_case slug** — the same string callers use (the `callIdentifier`): `//* Tax Calculator` → `function tax_calculator`. The call name is the label lowercased with every run of non-alphanumeric characters replaced by `_`; authoring the declaration with that slug keeps the declared name and the call name identical. Do **not** emit camelCase (`calculateTotal`) — a stored blueprint is still called by the slug, so the names would drift.
  (`leapter format` rewrites the declaration to the slug anyway, rewriting same-file call sites in lockstep.)
- **Every blueprint MUST carry a `"""description"""` on the line directly under its `//*` title.** This is the blueprint's description in the project — domain experts read it to understand what the blueprint is _for_. Write 1–3 sentences on the business problem it solves and why it exists (the WHY); do not restate its code, and never omit it. (`""""""` — an empty description — is only acceptable for a throwaway stub you will fill in immediately.)
- Inputs, outputs, and local declarations share one namespace — every name must be unique across all three groups
- Assign to output parameters directly — never re-declare them with `var` (this shadows the output and produces empty results)
- Every `return;` path must have all outputs assigned
- `return` takes no expression

### Parameter Defaults

Input and output parameters can carry a default value. The caller's value takes precedence; when absent, the runtime applies the default at function entry.

```veritas
function tax_calculator(
    //* Base amount
    amount: number,
    //* Tax rate — defaults to 0.19 when the caller omits it
    taxRate: type number = 0.19
) ->
    //* Running items, starts empty
    items: type list of number = [],
    //* Running total, starts at zero
    total: type number = 0
{
    //* Apply rate
    total = amount * (1 + taxRate);
    //* Return
    return;
}
```

**Syntax:**

- Use `type` before the type name to take the default-value form: `name: type <type> = <literal>`. Without `type` (`name: number`), defaults are not allowed.
- Supported: primitives (`_text`, `number`, `boolean`, `date`, `time`, `datetime`, `duration`, `range`), `list of <primitive>` / `map of <primitive>`, `list of <Structure>` defaults — both empty (`= []`) and populated with object literals (`= [{ "age": 10, "name": "alice" }]`) — and single `<Structure>` defaults written as an object literal (`= { "age": 10, "name": "alice" }`). `map of <Structure>` defaults are not supported in the signature — initialize them in the body. Object keys may be quoted or bare identifiers; the canonical serializer emits quoted keys. Each object must match the structure's fields (required fields present, no unknown fields, primitive fields correctly typed) or validation fails.
- **Value types (named aliases) take scalar defaults.** A parameter typed with a user-defined alias — e.g. `define DecisionStatus as _text constrained_to ["NO_PROMOTION", "APPLIED"]` — carries a scalar literal default directly: `status: type DecisionStatus = "NO_PROMOTION"`, and in list form `statuses: type list of DecisionStatus = ["NO_PROMOTION"]`. The literal must match the alias's base primitive, and for a `constrained_to` alias it must be one of the allowed values — validation rejects out-of-set or wrong-kind defaults. **Never rewrite a value-typed parameter to `_text` just to give it a default** — that destroys the enum typing and its run-boundary validation; keep the named type and attach the scalar default to it.
- Not supported: `map of <Structure>` defaults, `any single`, `any multiple`, and computed (non-literal) defaults. Initialize those in the function body if needed.

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

**Invalid:** `list of any`, `map of any`. Prefer a named structure over `any single` / `any multiple` whenever the shape is known — structures give the reader a name, and validation checks cross-references against the types document.

**Maps:** `map of <type>` parses but the runtime does not support dynamic property assignment on `{}` objects. Model the shape as a structure when the keys are fixed.

### Standard library types

One formatted alias is built in — reference it directly, no `define` needed:

| Type      | Base     | Stored value (canonical) | Displayed as    |
| --------- | -------- | ------------------------ | --------------- |
| `percent` | `number` | a fraction (`0.5`)       | localized `50%` |

Use it for any value read with a `%` sign (`rate: percent`). A `percent` is **stored as a fraction** — write `0.2` for 20% and compute it as `part / whole`, never `× 100` (storing `20` renders as `2000%`).

For other formatted values, put a `@format` annotation on your own alias — the stored value stays raw, only display and validation localize. Currency lives in a project alias because the code is app-specific:

```veritas
@format: "currency" @currency: "EUR" @fractionDigits: 2
define EuroAmount "A monetary amount in euros" as number
```

## Structured Types

A project **may** declare shared domain types in a **single types document**. One document per project. Logic blueprints reference the declared names directly in parameter, output, and variable positions.
In a project directory the types document lives at `data/types.data.vts`.

> **A type model is optional — prefer flat primitives.** For simple inputs/outputs, declare primitives (`_text`, `number`, `list of _text`, …) right in the signature and skip the types document entirely; you SHOULD do this for plain, shallow data. Reach for a Structure only when it pays off: rich object models and deeply nested graphs where a named type makes the shape easier to understand.

> **Iteration-1 constraint:** only one types document per project. Multi-file type models are a follow-up.

### The types document

Two forms of `define` are supported: structures (fields with types) and aliases (a new name for an existing type, optionally constrained to a value set).

```veritas
// The project's types document

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
- Add `constrained_to [...]` with string literals to restrict the value to a fixed set (an enum).

**A constrained alias is enforced by the runtime — prefer it over hand-written enum checks.** When an input is typed with a `constrained_to` alias, the run boundary validates the incoming value against the allowed set _before your logic executes_ and rejects an out-of-set value — it never reaches your code. You get that guard **for free**, so do NOT also hand-write an `if … else { throw "Unknown …" }` to police a value against that same set: the manual check is redundant and drifts from the type. Reach for a constrained alias whenever an input is "one of a known set" — a status, category, tier, system type, or unit. (`throw` is still right for rules the type can't express: numeric ranges, cross-field consistency, and other business rules — see _Validate early, fail fast_.)

**Defining the alias is only half the job — TYPE THE INPUT WITH IT.** The whole point is that the input parameter carries the constrained type: write `systemType: SystemType`, NOT `systemType: _text`. Defining `SystemType` but then declaring the input as bare `_text` and re-checking it by hand is the anti-pattern, not the fix — the alias sits unused while the manual guard does the work the type should. And if the requirements brief carries an _"Error case"_ saying an input must be one of a set (e.g. _"if systemType is not one of …, report …"_), that is ALREADY satisfied by typing the input with the constrained alias — do NOT translate it into a `throw`.

```veritas
// The project's types document
define SystemType "A building-system category" as _text constrained_to ["hvac", "lighting", "plumbing"]
```

```veritas
// ✅ Typed input — the runtime rejects an out-of-set systemType for you.
//* Audit System
"""Scores a single building system. systemType is constrained, so an unknown value is rejected at the run boundary before this logic runs."""
function audit_system(
    //* System under audit
    systemType: SystemType
) ->
    //* Audit score
    score: number
{ ... }

// ❌ Anti-pattern — even with SystemType defined, the input is left bare _text
// and re-checked by hand. The alias is unused; the manual guard is the bug.
function audit_system(
    systemType: _text
) ->
    score: number
{
    //* Reject unknown system type
    choose {
        if (not (systemType is "hvac" or systemType is "lighting" or systemType is "plumbing")) {
            throw "Unknown system type: " + systemType;
        }
    }
    ...
}
```

**Naming conventions:**

- `PascalCase` for structure and alias names (`Employee`, `Tier`).
- `camelCase` for field names (`orderId`, `totalAmount`).
- Match the convention LLMs default to so generated code stays idiomatic.

### Using structures from logic

Reference declared names directly:

```veritas
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
- A blueprint that references an undefined type produces a `Cannot find type '<Name>'` error during validation. Fix the types document first, then re-validate the logic.

### Validation loop

Validate the types document first, then the logic; if the logic reports `Cannot find type '...'`, go back to the types document. Validating the types document in isolation (before the logic) keeps the error loop targeted.

```
1. Edit data/types.data.vts → leapter validate
2. Edit logic/<slug>/<slug>.logic.vts → leapter validate
3. If logic reports `Cannot find type '...'`, return to step 1
```

The CLI runs both passes automatically during a project-level `leapter validate`.

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

### decide (decision tables)

Use `decide first` for rule grids: the first matching row wins and all later rows are skipped. The table is GitHub-Flavored Markdown: a header row with input expressions, `->` before the output target columns, a `| --- |` delimiter row, then data rows; input cells are literal values or the `any` wildcard.

```veritas
//* Offer stackability verdict
"""BR-017 — whether two offers may stack. Precedence is the explicit
top-to-bottom order of the rows here (first match wins), not the invisible
order of `if` branches it used to be."""
decide first
| offerA.stackable | offerB.stackable | -> canStack |
| ---              | ---              | ---         |
| true             | true             | true        |
| true             | false            | false       |
| false            | any              | false       |
| any              | any              | false       |
```

> Input `{"offerA": {"stackable": true}, "offerB": {"stackable": true}}` → `{"canStack": true}`
> Input `{"offerA": {"stackable": true}, "offerB": {"stackable": false}}` → `{"canStack": false}`
> Input `{"offerA": {"stackable": false}, "offerB": {"stackable": true}}` → `{"canStack": false}`

#### When to use a decision table

- **Prefer a decision table when** the logic is a rules grid — several inputs combine to select an output, the cases are enumerable rows, precedence is "first match wins" (making precedence the explicit top-to-bottom order of the rows instead of the invisible order of `if` branches), and a domain expert would naturally read it as a table (e.g., rate cards, eligibility matrices, stackability/compatibility rules, or status transitions keyed on a few flags).
- **Prefer `choose { if/else }` when** branches are few, conditions are rich boolean/relational expressions (ranges, comparisons, computed predicates) rather than literal-value matches, or each branch does meaningful work beyond assigning outputs.

**This is a mandate, not a preference, for literal mappings.** If a `choose` block consists entirely of exact-match equality checks (`is` / `==`) against the same variable(s) to assign an output, it MUST be a `decide first` table — never a `choose` block for a 1:1 state translation or a rule grid. Use `choose` ONLY for inequalities and mixed conditions: ranges (`> 30`, `< 5`) or mixed logic require `choose`. As soon as the logic becomes a pure categorization grid (matching strings, booleans, or exact numbers), switch to `decide first`. Do not force a grid into a `choose` block just because a previous section used `choose`.

**BAD** — obscures a simple grid behind branch logic:

```veritas
//* Tier rate
choose {
    if (tier is "A") { rate = 4.5; }
    if (tier is "B") { rate = 6.0; }
}
```

**GOOD** — a domain expert can read this instantly:

```veritas
//* Tier rate
decide first
| tier | -> rate |
| ---  | ---     |
| "A"  | 4.5     |
| "B"  | 6.0     |
```

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

Works with `list of <primitive>`, `list of <NamedType>` (item fields are read directly, e.g. `item.price`), and `any multiple`. Simpler than index-based when you don't need the index.

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

Sections group related logic with a title and mandatory description. They are the literate programming layer — the description **describes exactly what the logic inside the section does**, in plain prose: the operations it performs, the conditions it branches on, and the concrete values it uses — plus the business reason where it adds insight. A reader should understand the section's behaviour precisely without reading the code.

```veritas
section "Apply Discount" {
    """Starts the discount at 0, then matches the discount code: SAVE10 subtracts 10% of the subtotal, SAVE20 subtracts 20%. Any other (or missing) code leaves the discount at 0. Codes are exclusive — only the first match applies."""
    //* Init discount
    discount = 0;
    //* Discount by code
    decide first
    | discountCode | -> discount     |
    | ---          | ---             |
    | "SAVE10"     | subtotal * 0.10 |
    | "SAVE20"     | subtotal * 0.20 |
}
```

**Rules:**

- `"""description"""` inside braces is mandatory (use `""""""` for empty)
- **Describe exactly what the section's logic does, completely — 2–3 full sentences, not a single clause.** Walk the actual steps in order: every operation, every branch or decision-table row and the value it produces, and the concrete numbers (thresholds, rates, formulas, codes). Then add the business reason where it gives insight. The reader should be able to predict the section's output without reading the statements (see _What Makes a Good Section Description_ below).
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

The description must let a reader predict the section's behaviour without reading the statements. Aim for an account that is **faithful, complete, and specific**, then layer the business reason on top.

| Aspect        | Bad                                          | Good                                                                                                          |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Faithful**  | Vague gloss — "Calculates the tax"           | States what the logic actually does — "Multiplies engine size by the 9.50 EUR/100ccm Diesel rate"            |
| **Complete**  | Omits a step, branch, or table row           | Walks every step, branch, and decision-table row in order, with the value each one produces                  |
| **Specific**  | Generic — "applies a discount"               | Names the concrete numbers — "subtracts 10% of the subtotal for SAVE10, 20% for SAVE20"                       |
| **Why**       | (none)                                       | Adds the business reason where it gives insight — the regulation, policy, or design choice                    |
| **Scope**     | Covers the entire function                   | Covers exactly the logic within this section                                                                  |
| **Depth**     | A single short clause                        | 2–3 full sentences                                                                                            |

Worked example — for the `"Apply Discount"` section above:

> Bad (vague): "Applies a discount to the order."
> Good (exact): "Starts the discount at 0, then matches the discount code: SAVE10 subtracts 10% of the subtotal, SAVE20 subtracts 20%, and any other code leaves it at 0. The matches are exclusive, so only the first applies."

### Common Section Mistakes

- **Vague or incomplete description.** `section "Apply fees" { """Applies the fees""" }` — say exactly which fees, in what order, and how each is computed: "Adds the flat 2.50 EUR handling fee, then a 1% surcharge on the order subtotal."
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

### Writing good labels

Labels are the scannable outline a domain expert reads to verify the logic. The code expression sits right next to the label, so the label must add the **business context the code can't convey — the WHY, not the WHAT.**

- **Short headlines: 2–6 words.** Think newspaper headline, not a sentence. No trailing period.
- **Never restate or paraphrase the expression.** The reader already sees the code beside the label.
- **No bare `Set x` / `Return` / `Throw` labels** — say what is being set, returned, or thrown and why.
- **Make every label distinct.** Don't reuse one label across different nodes; if two nodes would read the same, the labels aren't specific enough.
- **Branches (`choose` / `if` / `else`) get specific labels too** — name the decision and each branch by the case it handles. Never generic `Condition`, `Else if`, or `Else`.

| Code                                            | Good label                          | Bad label                                                       |
| ----------------------------------------------- | ----------------------------------- | -------------------------------------------------------------- |
| `overtimeHours = hoursWorked - 40`              | `//* Overtime hours`                | `//* Subtract 40 from hours worked`                            |
| `overtimePay = overtimeHours * rate * 1.5`      | `//* Overtime pay (1.5x rate)`      | `//* Multiply overtime hours by rate and 1.5`                  |
| `deliveryFee = 0`                               | `//* Free delivery (order ≥ 50 EUR)`| `//* Set delivery fee to zero`                                  |
| `if (driverAge < 25)`                           | `//* Young driver (under 25)`       | `//* Condition`                                                |
| `throw "Amount must be positive"`               | `//* Reject non-positive amount`    | `//* Throw`                                                    |

**Node IDs** are auto-generated by post-processing. Do not generate them for new nodes. When editing — or fully rewriting — existing code, preserve the existing markers on every node you keep: a relabeled or changed node is still the same node and keeps its id — never invent a marker yourself. Dropping the markers severs node identity (comments, mentions, and diffs then treat the node as removed + re-added). The marker formats:

| Format        | Used for              | Example              |
| ------------- | --------------------- | -------------------- |
| `//#id UUID`  | Function declarations | `//#id a0000001-...` |
| `@T-aabbccdd` | All other nodes       | `@S-b0000001`        |

Type prefixes: `S`=Section, `T`=Step, `D`=Decision, `G`=DecisionTable, `C`=Condition, `E`=Else, `L`=Loop, `V`=Variable, `R`=Return, `X`=Error.

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

**Fix:** If the keys are known in advance, define a structure in the types document and construct an instance up front rather than assigning keys at runtime. Reading properties on input objects works fine.

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
