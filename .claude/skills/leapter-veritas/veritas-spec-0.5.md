# Veritas Language Specification v0.5

Veritas is a business logic DSL. Programs are called **blueprints**. Every statement requires a label. This document is the whole language: what is written here is what Veritas has.

Projects declare shared domain types in a single types document and reference them from logic blueprints — see **Structured Types** below.

## Design Philosophy

Veritas blueprints are **living documentation** of business rules. They are meant to be validated by **domain experts who are not programmers**. Every naming choice should prioritize human readability:

- Use descriptive variable names: `monthlyPremium`, not `mp` or `premium`
- Use full words in labels: `//* Calculate monthly insurance premium`, not `//* Calc premium`
- Section descriptions explain the **business rationale** — reference regulations, policies, or domain context
- Avoid abbreviations: `discountRate`, not `discRate`; `customerAge`, not `age` (when ambiguous)
- Loop variables are the one case where short names (`index`, `itemIndex`) are acceptable

## Best Practices

- **Structure blueprints as narratives.** A reader should understand the business logic by reading section titles and descriptions alone, without looking at the code.
- **One business concept per section.** Split when the narrative shifts — "determine rates" and "apply rates" are two sections.
- **Nest subsections for complex steps.** A parent section introduces the concept, child sections handle the sub-steps.
- **Keep sections to ~15-20 statements.** Beyond that, look for natural split points.
- **Labels describe the action in domain language.** `//* Apply no-claims discount for clean driving records` not `//* Multiply by 0.9`.
- **Prefer `and`/`or`/`not`/`is` over symbolic operators.** Natural language operators make conditions readable by non-programmers.
- **Use `for...in` when you don't need the index.** `for (var item in items)` is more readable than index-based loops.
- **Never re-implement what the language provides.** Calendar arithmetic and date parsing: declare the input `date` and use `days_between`, `add_duration`, `year_of`, …; rounding: `round`; text search: `contains`, `position_of`. The built-ins are exact and give the same answer in every engine.
- **Validate early, fail fast — but let the type system do the type, shape, and bound checks.** Every input is validated against its DECLARED TYPE at the run boundary, before your logic runs — not just enums. A Choice value outside its allowed set is rejected; a bounded number outside `min`/`max` is rejected; bounded `_text` whose length is outside `length min`/`max` is rejected; a Structure-typed input missing a required field or carrying a wrong-typed field is rejected; a `list of <type>` whose items don't match is rejected. So type your inputs — a Choice (`_text choice […]`) for "one of a known set," a `constrained_to`-bounded value type for numeric ranges or text length, a Structure for a thing-with-fields — and don't hand-write the matching membership / range / length / field-presence / field-type guards; the runtime already does them. Reserve top-of-function `throw` validation for what types can't express — cross-field consistency and other business rules.
- **Throw a TYPED error whenever a reader of the run result could react to the failure.** `throw MissingData { message: "No income on file", field: "income" }` names the failure and carries its payload, so a test or an API client branches on the type instead of matching message text. Declare the type once in the types document with `define … as Error { … }` (see _Error types_), then throw it wherever that situation arises. Keep the plain string form (`throw "Amount must be positive"`) for a one-off validation message nothing downstream needs to tell apart. A thrown failure ends the run unless a section catches it (see the next rule). This does not loosen the rule above: a check the type system already performs stays out of the blueprint in either form.
- **Catch a failure only where a business fallback exists.** Write a `catch` clause when the brief names what to do instead — a default value, an alternative path, a documented degraded result ("if the rating service has no data, rate 1 and say why"). Never catch to make a failure go away: a clause with an empty body, or one that leaves the outputs at whatever they happened to be, hides a real problem from the caller and is worse than the failed run it replaces. **Prefer a typed clause over `catch (e: any)`** — name the error type you know how to recover from, and let every other failure reach the caller. Reach for `any` only when the fallback is genuinely the same for every failure. See _Sections → Catching a failure_.
- **Names are unique per function.** Inputs, outputs, and local declarations share one namespace; every name must be unique across all three. The studio blocks duplicate names, and a duplicate corrupts schema/execution keying.
- **Assign outputs directly.** Never declare a local with an output's name — assign to the output directly.
- **Initialize neutral OUTPUT state with a signature default, not a node.** When an output starts at a supported scalar default (`0`, `false`, `""`) or a structured default, declare it in the signature. For output lists of any element type, including user-defined structures, use `= []` (empty) or a populated literal like `= [{ name: "alice" }]`; for a single (non-list) user-defined structure, use a populated record literal like `= { name: "alice" }`. Do not create a body node just to assign `someOutput = []`. Keep a body assignment for computed, branch-specific, reset, unsupported, or domain-significant values such as `regime = "unknown"`.
- **Name the current item in loops.** At the start of each loop iteration, assign a descriptive variable like `currentInvestorName = investors[index].name`. This makes execution traces self-documenting — a reader sees _who_ is being processed, not just "iteration 2."
- **Never append large inline objects.** If an object has more than 2-3 fields, pre-compute each field into a labeled variable, then append. Inline `{ a: x, b: y, c: z, ... }` renders as an unreadable wall of text in the blueprint viewer. Each field should be a separate labeled step so domain experts can trace the logic.
- **Grow a list with the `append` built-in, assigning the result back** — `items = append(items, item);`, never `items.push(item)`. `append` returns a new list and leaves the original alone, so the value a step produces is the value its expression names.
- **Follow project layout.** Each blueprint lives in its own subdirectory: `logic/<slug>/<slug>.logic.vts`. This is required for `leapter runtime run --model <slug>` to resolve the file.

## Quick Reference

Every value is one of nine kinds: `absent`, boolean, number, text, date, datetime, duration, list and record. Nothing converts one kind into another behind your back: an operator or a built-in given the wrong kind faults instead of guessing.

| Category         | Supported | Not Supported |
| ---------------- | --------- | ------------- |
| **Primitives**   | `_text`, `number`, `boolean`, `date`, `datetime`, `duration` | Classes, generics |
| **User types**   | Structures, value types and Choices via `define` in the types document | Inline `define` inside a logic blueprint |
| **Collections**  | `list of <type>`, `any single`, `any multiple` | `list of any`, `list of list of …` |
| **Control flow** | `choose`/`if`/`else`, `decide first`, `for` (index), `for...in` (each), `while`, `break`, `continue`, `catch` on a section | Standalone `if`, `else if`, `decide unique`, `switch`, `do...while`, `try` blocks, `catch` on anything but a section |
| **Operators**    | `+` `-` `*` `/`, `<` `<=` `>` `>=`, `is` `isnt`, `and` `or` `not` (also spelled `==` `!=` `&&` `\|\|` `!`) | `%` and `%=` (use `modulo`), `? :` (use `choose`), `++` `--` |
| **Absence**      | `absent`, `x is absent`, `if_absent(x, fallback)`, `?` on a declaration | `null` as a value of its own |
| **Functions**    | `function`, `public function`, named calls `f(p: v)` (incl. blueprint calls) as whole statements, `throw`, `return;` | Arrow functions, closures, callbacks, `new`, method calls such as `x.push(…)` or `s.toFixed(…)` |
| **Literals**     | Numbers, texts (`""`/`''`), booleans, `absent`, lists `[]`, records `{}`, constructions `Type { … }` | Template literals, regex, date literals (write `date("2026-03-09")`) |
| **Comments**     | `//*` labels and `"""…"""` descriptions | `//` and `/* */` — the language has no comment form |

## Document Structure

A document contains exactly one top-level function declaration — one blueprint, one function. Nothing else at the top level. A project-level `leapter validate` rejects a second one (ENG-2532 tracks the single-file validate and `convert` paths, which are more permissive).

A helper is not a nested function: it is its own blueprint in its own directory, invoked from its caller as a named call (see veritas-functions-0.5.md).

```
logic/
  per-diem-rate/
    per-diem-rate.logic.vts              //* Per Diem Rate
  travel-expense-claim/
    travel-expense-claim.logic.vts       //* Travel Expense Claim   ← calls the helper
```

The directory name and the file name must both equal the function's label, slugified — `//* Per Diem Rate` → `per-diem-rate`. Renaming the label means renaming the directory and the file.

## Functions

Every function declares its contract in blocks at the top of its body, then the steps. `inputs { }` is what it takes, `outputs { }` is what it answers with, `locals { }` is what it holds while it runs. Each block is optional, the order is fixed, and every entry carries a `//*` label on the line above it, as a step does. There is no comma between entries: the next label is where the next declaration starts. The function ends with `return;` (no expression).

> Function inputs and outputs can be primitives (`_text`, `number`, ...), `list of <type>`, or user-defined structures, value types and Choices declared in the project's types document. See **Structured Types** below for authoring a shared domain model.

```veritas
//* Tax Calculator
"""Adds VAT to a net price so checkout can show the gross amount the customer actually pays. The rate is supplied per call because it varies by product category and jurisdiction."""
public function tax_calculator {

  inputs {
    //* Base price
    price: number
    //* Tax rate as decimal
    taxRate: number
  }

  outputs {
    //* Total with tax
    total: number
  }

  //* Calculate total
  total = price * (1 + taxRate);
  //* Return
  return;
}
```

> Input `{"price": 100, "taxRate": 0.19}` → Output `{"total": 119}`

**Visibility:** `public` directly before `function` makes a blueprint callable through the API. Without it a blueprint is private: runnable in the app, callable by other blueprints, not an endpoint. A project needs at least one public blueprint. `public` is a reserved word and is valid only in that one position, on the top-level declaration; a helper carries no modifier.

**Rules:**

- **Name the function with its label's snake_case slug** — the same string callers use (the `callIdentifier`): `//* Tax Calculator` → `function tax_calculator`. The call name is the label lowercased with every run of non-alphanumeric characters replaced by `_`; authoring the declaration with that slug keeps the declared name and the call name identical. Do **not** emit camelCase (`calculateTotal`) — a stored blueprint is still called by the slug, so the names would drift.
  (`leapter format` rewrites the declaration to the slug anyway, rewriting same-file call sites in lockstep.)
- **Every blueprint MUST carry a `"""description"""` on the line directly under its `//*` title.** This is the blueprint's description in the project — domain experts read it to understand what the blueprint is _for_. Write 1–3 sentences on the business problem it solves and why it exists (the WHY); do not restate its code, and never omit it. (`""""""` — an empty description — is only acceptable for a throwaway stub you will fill in immediately.)
- Inputs, outputs, and local declarations share one namespace — every name must be unique across all three groups
- Assign to output parameters directly — never declare a local with the same name (this shadows the output and produces empty results)
- Every `return;` path must have all outputs assigned. An output a run does not assign is missing from the result — it is never filled with a stand-in `0` or `""` — and an output that no step assigns and no default covers is a validation error
- `return` takes no expression

### Parameter Defaults

Input and output parameters can carry a default value. The caller's value takes precedence; when the caller leaves the input out, the default applies at function entry. An output's default is the value it holds before the first step runs.

```veritas
//* Gross Price With Standard VAT
"""Adds VAT to a net amount. Most products carry the standard 19% rate, so the caller may leave the rate out and the standard rate applies."""
public function gross_price_with_standard_vat {

  inputs {
    //* Net amount
    amount: number
    //* VAT rate — the standard 0.19 when the caller omits it
    taxRate: number = 0.19
  }

  outputs {
    //* Notes on the calculation, start empty
    notes: list of _text = []
    //* Gross amount, starts at zero
    total: number = 0
  }

  //* Add VAT
  total = amount * (1 + taxRate);
  //* Return
  return;
}
```

> Input `{"amount": 100}` → Output `{"notes": [], "total": 119}`
> Input `{"amount": 100, "taxRate": 0.07}` → Output `{"notes": [], "total": 107}`

**Syntax:**

- Write the default after the type: `name: <type> = <literal>`. A declaration's clauses stand in one fixed order — cardinality, type, constraints, default, description: `amount: number constrained_to min 1 = 1 "The amount"`. An optional input or local writes `?` directly after its NAME, before the colon: `graceDays?: number = 30 "Grace period"`. The marker belongs to the slot, not to the type — there is no nullable type — so never write it after the type or at the end of the line.
- A default is always a value: a quoted text, a number, `true`/`false`, or a `[...]` list or `{ ... }` record of those. `= absent` (or its legacy spelling `= null`) is not a default and is refused — a declaration that may be left out is marked `?` after its name.
- **What `?` means.** An optional input the caller leaves out is `absent` inside the blueprint — never a stand-in `0`, `""` or `[]` — so test it with `x is absent` or replace it with `if_absent(x, fallback)` (see _Absence_). An input with a default takes the default when the caller leaves it out, so it is never `absent`.
- **An output takes no `?`.** Every output may be left `absent`: write `total: number`, never `total?: number`.
- Supported: primitives (`_text`, `number`, `boolean`, `date`, `datetime`), `list of <primitive>` and `list of <Structure>` defaults — both empty (`= []`) and populated with record literals (`= [{ age: 10, name: "alice" }]`) — and single `<Structure>` defaults written as a record literal (`= { age: 10, name: "alice" }`). A bare key is a field name and a quoted key is a map key: write a structure's fields bare. A quoted key on a structure is still accepted and is reported. Each record must match the structure's fields (required fields present, no unknown fields, primitive fields correctly typed) or validation fails.
- **Named types (Choices and value types) take scalar defaults.** A parameter typed with a user-defined name — e.g. `define DecisionStatus as _text choice ["NO_PROMOTION", "APPLIED"]` — carries a scalar literal default directly: `status: DecisionStatus = "NO_PROMOTION"`, and in list form `statuses: list of DecisionStatus = ["NO_PROMOTION"]`. A parameter typed with a **Choice** is a *use* of the type, not a new type built on it, so it carries the cardinality, annotations and default and nothing else: `status: DecisionStatus choice […]` is a parse error and `status: DecisionStatus constrained_to …` is rejected, because the Choice already fixes every accepted value. (On a plain value type an inline bound is fine — `amount: Money constrained_to max 10000`.) The literal must match the named type's base primitive, and for a Choice it must be one of the allowed values — validation rejects out-of-set or wrong-kind defaults. **Never rewrite a typed parameter to `_text` just to give it a default** — that destroys the Choice typing and its run-boundary validation; keep the named type and attach the scalar default to it.
- **A parameter can declare its allowed values inline** — `priority: _text choice ["low", "high"] = "low"` — when the set belongs to that one parameter. Name the Choice in the types document instead as soon as a second parameter, output or field needs the same set.
- Not supported: `any single`, `any multiple`, and computed (non-literal) defaults. A computed default is a validator error ("a default is a value"). Assign those in the function body if needed.

### Parameter Constraints

On first generation, put each input's known numeric bounds or text-length bounds directly in the signature. For a bound local to one parameter, write an **inline bound** directly after the type: `name: <primitive> constrained_to ...`. It needs no types document, named alias, or default value; a default, when there is one, follows the bound. Reuse a named bounded type when it already expresses the domain rule, or define one when the bound is shared across inputs or blueprints.

```veritas
//* Charging Request
"""Describes a customer's charging request within the supported input limits."""
public function charging_request {

  inputs {
    //* Battery level percentage
    batteryLevelPercent: number constrained_to min 0 max 100
    //* Customer name
    customerName: _text constrained_to length min 1 max 120
  }

  outputs {
    //* Request description
    requestDescription: _text
  }

  //* Customer battery status
  requestDescription = customerName + ": battery at " + to_text(batteryLevelPercent) + "%";
  //* Request ready
  return;
}
```

> Input `{"batteryLevelPercent": 40, "customerName": "Meyer AG"}` → Output `{"requestDescription": "Meyer AG: battery at 40%"}`

`+` joins two texts or adds two numbers, never one of each: `"battery at " + 40` fails the run. Convert the number where the text is built, with `to_text` (see _Operators_).

Keep value sets as separate named **Choices** in the project's types document, and type the input with that name: `define ChargingMode as _text choice ["solar", "grid"]`, then `chargingMode: ChargingMode`. Do not inline their value lists or leave the input as bare `_text`/`number` with manual membership checks. Reuse an existing suitable Choice. Structured inputs likewise use their declared Structure, not `any` plus manual shape checks.

Inline bounds, named Choices, and Structures are enforced at the run boundary before the blueprint executes. Do not add a `Validate inputs` section or defensive `choose`/`throw` nodes to repeat those same rules, even if the brief describes them as error cases. On structure fields, use field bounds for local numeric or text-length rules (see Structure rules below).

Bounds are **inclusive**: `min 0` means `>= 0`, not `> 0`. Keep a manual check for strict positivity (`value <= 0` → `throw`), cross-field consistency, or other rules the constraints cannot express. Do not invent an epsilon such as `min 0.000001`, or change the requirement to `min 1`, to approximate `> 0`. Set only bounds justified by the requirements. Text length counts characters; `length min 1` does not reject whitespace-only text, and bounds on `list of <primitive>` apply to each element, not the number of items.

## Types

### Primitives

The canonical spelling is `_text` for text. The legacy `string` keyword is still accepted but prefer `_text` in new code.

| Type       | Description                                                                     | Example                          |
| ---------- | ------------------------------------------------------------------------------- | -------------------------------- |
| `_text`    | Unicode text                                                                    | `"hello"`                        |
| `number`   | Exact decimal — `0.1 + 0.2` is `0.3`                                            | `42`, `3.14`                     |
| `boolean`  | `true` or `false`                                                               | `true`                           |
| `date`     | Calendar day — ISO `YYYY-MM-DD`, no time, no zone                               | `date("2026-08-13")`             |
| `datetime` | Instant, with the offset it was written in — RFC 3339, seconds and offset required | input `"2026-08-13T14:30:00+02:00"` |
| `duration` | Calendar span — ISO 8601 period: years, months, weeks, days, and a time part    | `duration("P30D")`, `duration("PT2H")` |

> Do **not** write bare `text` — the validator treats an unknown identifier as a reference to a missing user-defined type and produces a `Cannot find type 'text'` error. Use `_text`.

> **Date vs datetime — pick by whether the time of day matters.**
>
> - **`date` is the default for calendar logic** (deadlines, effective dates, anniversaries). The run boundary validates it as `YYYY-MM-DD`, the run form renders a date picker, and every date built-in (`is_before`, `add_duration`, `days_between`, `year_of`, …) operates on it.
> - **Write a date value with `date(...)`**, never a bare `"2026-08-13"`. There is no date literal: `2026-08-13` without quotes is the subtraction `2026 - 8 - 13`.
> - **`datetime` is an instant, not a day.** Declare it only when the time of day is part of the business rule (departures, appointment slots, cut-off times). It arrives as an input: the run boundary accepts RFC 3339 text with seconds and an offset — `"2026-08-13T14:30:00Z"` or `"2026-08-13T16:30:00+02:00"` — and refuses text without an offset (`"2026-08-13T14:30"` names a different instant in every zone). An offset is a fixed number of hours, not a time zone. The value keeps the offset it was written in: `is` and `<` compare the instants, so `14:30:00Z` and `16:30:00+02:00` are equal, and printing gives back the offset as written.
> - **A datetime's offset is spelling, like a number's scale.** It is kept and printed as written, and two datetimes naming the same instant are equal whatever their offsets. Read the parts on the value's own clock, or read UTC with `utc_of`.
> - **Which built-ins take a datetime.** `add_duration` and `subtract_duration` shift a datetime and keep its offset; `is_before` and `is_after` compare two datetimes by instant; `to_text` prints one as written; `sort` orders a list of them; `year_of`, `month_of`, `day_of` and `weekday_of` read one on its own clock, the offset it was written in. `is_same_date` on two datetimes asks whether they are the same instant, not the same day. `days_between` is date-only, and a date is never equal to a datetime.
> - **Spans are durations, written with `duration(...)`.** A duration for a datetime may carry a time part (`duration("PT90M")`); a time part against a date fails the run. When a caller must supply a span, declare the input `duration`: the run boundary reads period text such as `"P30D"` and binds a duration.
> - **There is no clock.** No built-in returns today or now. A rule about the current day takes it as an input, named `asOf` by convention, so the same inputs give the same answer when the run is replayed.

```veritas
//* Boarding Gate Status
"""Tells the gate whether boarding is open for a departure. Boarding opens 45 minutes before departure; the moment the question is asked about is an input, so a replay of this run gives the same answer."""
public function boarding_gate_status {

  inputs {
    //* Scheduled departure, with the airport's offset
    departsAt: datetime
    //* The moment the gate asks about
    asOf: datetime
    //* How long before departure boarding opens
    boardingWindow: duration = "PT45M"
  }

  outputs {
    //* Whether boarding is open
    boardingOpen: boolean
    //* When boarding opens, on the airport's clock
    opensAt: datetime
  }

  //* Boarding opening time
  opensAt = subtract_duration(departsAt, boardingWindow);
  //* Open once boarding has started and before departure
  boardingOpen = not is_before(asOf, opensAt) and is_before(asOf, departsAt);
  //* Return
  return;
}
```

> Input `{"departsAt": "2026-03-09T10:00:00+01:00", "asOf": "2026-03-09T08:30:00Z"}` → Output `{"boardingOpen": true, "opensAt": "2026-03-09T09:15:00+01:00"}`
> Input `{"departsAt": "2026-03-09T10:00:00+01:00", "asOf": "2026-03-09T08:00:00Z"}` → Output `{"boardingOpen": false, "opensAt": "2026-03-09T09:15:00+01:00"}`

`asOf` is written at `Z` and the departure at `+01:00`; the comparison reads the instants, so 08:30Z is 09:30 on the airport's clock and boarding is open.

### Collections and Dynamic Types

| Type             | Use for                        | Example                  |
| ---------------- | ------------------------------ | ------------------------ |
| `list of <type>` | Array of primitives or structs | `[1, 2, 3]` / `[order]`  |
| `any single`     | Opaque single record           | `{"name": "Alice"}`      |
| `any multiple`   | Opaque list of records         | `[{"id": 1}, {"id": 2}]` |
| `any`            | Unknown/flexible               | —                        |

The run boundary checks nothing inside an `any` position — every value passes — so an `any` input gives up the checks every other type earns.

**Invalid:** `list of any`, and a list of lists (`list of list of number`) — name the inner type instead. Prefer a named structure over `any single` / `any multiple` whenever the shape is known — structures give the reader a name, and validation checks cross-references against the types document. For keyed data, model a structure when the keys are fixed, or a `list of <Structure>` with a key field.

### Standard library types

Two types are built in — reference them directly, no `define` needed. A project must not define its own type under either name.

| Type      | Kind                                       | Stored value (canonical) | Displayed as    |
| --------- | ------------------------------------------ | ------------------------ | --------------- |
| `percent` | alias of `number`                          | a fraction (`0.5`)       | localized `50%` |
| `Error`   | error structure `{ message: _text }`   | —                        | —               |

Use `percent` for any value read with a `%` sign (`rate: percent`). A `percent` is **stored as a fraction** — write `0.2` for 20% and compute it as `part / whole`, never `× 100` (storing `20` renders as `2000%`).

`Error` is the general error type: one `message` field, nothing else. See _Error types_ below.

For other formatted values, put a `@format` annotation on your own alias — the stored value stays raw, only display and validation localize. Currency lives in a project alias because the code is app-specific:

```veritas
@format: "currency" @currency: "EUR" @fractionDigits: 2
define EuroAmount "A monetary amount in euros" as number
```

## Structured Types

A project **may** declare shared domain types in a **single types document**. One document per project. Logic blueprints reference the declared names directly in parameter, output, and variable positions.
In a project directory the types document lives at `data/types.data.vts`.

> **A type model is optional.** For simple inputs/outputs you can declare primitives (`_text`, `number`, `list of _text`, …) right in the signature and skip the types document entirely. Declare a Structure whenever a named type expresses the domain better — object models, nested data — and a **Choice** (`as <base> choice [...]`, below) whenever a value comes from a known set. A value type (a plain alias) names an existing type and may carry a bound; it never carries a value set.

> **Iteration-1 constraint:** only one types document per project. Multi-file type models are a follow-up.

### The types document

Three forms of `define` are supported: **structures** (fields with types), **value types** (a new name for an existing type, optionally bounded), and **Choices** (a value from a fixed set of allowed values). A project's types document:

```veritas
define Tier "Customer loyalty band" as _text choice ["bronze", "silver", "gold"]

define Rating "A 1-to-5 star rating" as number choice [1, 2, 3, 4, 5]

define Headline "A short marketing headline" as _text constrained_to length min 1 max 120

define Employee "Someone on the payroll" {
  name: _text "Legal name"
  salary: number "Annual salary in USD"
  rating: number constrained_to min 1 max 5 "Performance rating"
}

define Order "A customer order" {
  orderId: _text "External order identifier"
  total: number "Order total in USD"
  tier: Tier "Loyalty band the customer is in"
  channel: _text choice ["web", "phone", "store"] = "web" "How the order arrived"
}
```

**Structure rules:**

- `define Name "description" { ... }` — the description string is recommended. The `as Structure` suffix is accepted but redundant; omit it. Write `as Error` instead when the structure names a failure (see _Error types_).
- Each field: `fieldName: Type "description"`; an optional field writes `?` after its name: `fieldName?: Type "description"`. The clauses stand in the same fixed order as on a parameter — cardinality, type, constraints, default, description: `via?: _text = "none" "Which route"`.
- Field types can be primitives, other structures, `list of <type>`, value types, or Choices.
- A field may reference a structure defined later in the same file. **Define a value type or a Choice above the first structure that uses it**: the engine does not yet resolve a field whose value type or Choice is defined further down, and refuses the project with "this project has no type of that name".
- A field may declare its own rules inline, exactly as a parameter does — directly after the type, BEFORE the description: `rating: number constrained_to min 1 max 5 "Performance rating"` for a bound, `channel: _text choice ["web", "phone"] "How the order arrived"` for an allowed-values set. The rules and the combination rules are the same as for named types (see below). On a `list of <primitive>` field the rule applies to each element. `any` fields cannot carry rules — give the field a typed base instead.
- A field may carry a default, as a parameter does: a literal value after the type and its rules, before the description — `channel: _text choice ["web", "phone"] = "web" "How the order arrived"`. It is the value the field takes when a construction, or a payload at the run boundary, leaves the field out. The default must fit the field's type; a computed default is a validator error.
- **Inline rule vs. named type:** use an inline rule for a rule that belongs to that one field. Define a named Choice or bounded value type instead when several fields or blueprints share the same value set or bound — one definition, referenced by name everywhere.

**Choice rules — a value from a fixed set:**

- `define Name "description" as <base> choice [values]` declares a Choice. The base comes FIRST and is `_text` or `number` (`text` / `string` are accepted and normalised to `_text`); no other base is allowed, and a Choice may not be based on another named type.
- Each listed value's kind must match the base: string literals require a `_text` base (`as _text choice ["bronze", "gold"]`), number literals require a `number` base (`as number choice [1, 2, 3]` — negatives and decimals allowed). Mixed lists are rejected.
- The `choice [...]` clause is what makes a Choice, so it is ALWAYS written. The list may be empty: `define Draft as _text choice []` parses, warns, and accepts any value of its base. **Always list the values when you author one** — an empty Choice validates nothing, so an input typed with it gets none of the run-boundary guard below. The empty form exists so a document an author left half-finished still loads.
- A Choice takes a cardinality like any other type: `define Tags as list of _text choice ["a", "b"]`, and `map of <base> choice [...]`, apply the set element-wise.
- The same form is written inline on a parameter and on a field — `priority: _text choice ["low", "high"] = "low"`, `stars: number choice [1, 2, 3] = 3`, `tags: list of _text choice ["a", "b"] = ["a"]`, `channel: _text choice ["web", "phone"] "How the order arrived"`. A default, on a parameter or on a field, is checked against the allowed values.
- A Choice carries allowed values only — never a bound. `constrained_to` on a Choice is rejected: a set already fixes every accepted value.
- **A Choice cannot be the base of another named type.** `define Statuses as list of Status` and `define LiveStatus as Status` are errors — write `define Statuses as list of _text choice [...]` with the values spelled out. Referencing the Choice by name (`status: Status`, `tags: list of Status`, `status: Status = "OPEN"`) is a *use*, not a base, and is always fine.

**Value type rules — a new name, optionally bounded:**

- `define Name "description" as <type>` creates a semantic alias for an existing type.
- Add `constrained_to min <number> max <number>` to restrict a `number` value to an inclusive range. Either side may be omitted: `constrained_to min 0` or `constrained_to max 100`.
- Add `constrained_to length min <integer> max <integer>` to restrict `_text` length. Length bounds are inclusive, non-negative integers, and either side may be omitted.
- `constrained_to` is the BOUNDS keyword and nothing else: it is always followed by `min` / `max` / `length`, never by a bracketed list of allowed values, on a named type or inline. A value set is spelled `<base> choice [...]` and nothing else.
- Several `constrained_to` clauses may be written on one value type, and **all of them must hold** — they are ANDed, never ORed. Combinations that nothing can satisfy are rejected when you validate: two clauses of the same kind, for instance (write one clause carrying both `min` and `max` instead). To accept a value matching *either* of two bounds — 1–5 or 90–100 — use two separate types; bounds are ANDed and cannot express the alternative, and a Choice cannot either unless every acceptable value can be listed one by one.

**A Choice and a `constrained_to` bound are enforced by the runtime — prefer it over hand-written enum, range, and length checks.** This holds for named types and for inline rules on a field or parameter alike. When an input is typed with a Choice or a bounded value type, the run boundary validates the incoming value _before your logic executes_ and rejects a value outside the declared set or bound — it never reaches your code. You get that guard **for free**, so do NOT also hand-write an `if ... else { throw "Unknown ..." }` or `if score < 0 { throw ... }` to police the same rule: the manual check is redundant and drifts from the type. Reach for a Choice whenever an input is "one of a known set" — a status, category, tier, system type, or unit — and for a bound whenever a number/text input has a known range or length. (`throw` is still right for rules the type can't express: cross-field consistency and other business rules — see _Validate early, fail fast_.)

**Defining the Choice is only half the job — TYPE THE INPUT WITH IT.** The whole point is that the input parameter carries the constrained type: write `systemType: SystemType`, NOT `systemType: _text`. Defining `SystemType` but then declaring the input as bare `_text` and re-checking it by hand is the anti-pattern, not the fix — the Choice sits unused while the manual guard does the work the type should. And if the requirements brief carries an _"Error case"_ saying an input must be one of a set (e.g. _"if systemType is not one of …, report …"_), that is ALREADY satisfied by typing the input with the Choice — do NOT translate it into a `throw`.

The types document declares the Choice:

```veritas
define SystemType "A building-system category" as _text choice ["hvac", "lighting", "plumbing"]
```

✅ The input is typed with it, so the run boundary rejects an out-of-set `systemType` before the logic runs:

```veritas
//* Audit System
"""Scores a single building system. systemType is constrained, so an unknown value is rejected at the run boundary before this logic runs."""
function audit_system {

  inputs {
    //* System under audit
    systemType: SystemType
  }

  outputs {
    //* Audit score
    score: number
  }

  ...
}
```

❌ The anti-pattern: `SystemType` is defined, but the input is left bare `_text` and re-checked by hand. The Choice is unused; the manual guard is the bug.

```veritas
function audit_system {

  inputs {
    systemType: _text
  }

  outputs {
    score: number
  }

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

- `PascalCase` for structure, value-type and Choice names (`Employee`, `Tier`).
- `camelCase` for field names (`orderId`, `totalAmount`).
- Match the convention LLMs default to so generated code stays idiomatic.

### Error types

An error type is a structure that names a modeled failure — "this failed, and here is why". Write `as Error` where a plain structure writes `as Structure`. It is still an ordinary structure. It has fields, it can reference other types, and it lives in the same types document.

```veritas
define MissingData "A required value is not on file" as Error {
  message: _text "What is missing, in plain words"
  field: _text "Name of the missing field"
}

define RatingUnavailable "The rating provider gave no result" as Error {
  message: _text
  provider?: _text
}
```

**Error type rules:**

- `Error` is the keyword in the slot after `as`, like `Structure`, and it applies to structures only. Unlike `Structure`, the word is NOT reserved: `Error` is also the name of the built-in error type, so `field: Error`, `throw Error { ... }` and `catch (e: Error)` all stay valid. `Exception` is not a keyword and not reserved — it is an ordinary name.
- Every error type **must** carry a required `message: _text` field (validation `veritas.exception.missing-message`). A run result, an API error, and a test report all show the message. So it must explain the failure in plain words. Other fields are free: add what a caller needs to react (`field`, `provider`, a code, …).
- The built-in `Error` is the error type with only a `message`. Do not redefine it; reference it by name.
- Error types do not form a hierarchy. Each name is matched exactly.
- Name an error type after the situation, not after the word "error": `MissingData`, `RatingUnavailable`, `LimitExceeded`.

The built-in `Error` ships with every project. It is already declared — never write this block yourself:

```veritas
define Error "Something went wrong" as Error {
  message: _text "What went wrong, in plain words"
}
```

**When to declare your own error type.** Declare one when something outside the blueprint could react to that specific failure — a test that asserts which failure happened, or an API client that branches on the kind of failure. A named type with fields is the only form that carries that information; a sentence is not. A caller that knows how to carry on without the value catches the type by name and runs a fallback instead (see _Sections → Catching a failure_).

- The requirements name a distinct failure situation ("income is missing", "the provider returned nothing") → declare a type per situation.
- The failure carries a value a caller would use (which field is missing, which limit was exceeded, which provider failed) → put that value in a field.
- The failure is a one-off input complaint nobody branches on → `throw "…"` is enough; no type needed.
- The failure is a type, range, set, or required-field violation → do not throw at all. Type the input and let the run boundary reject it (see _Best Practices_).

**Worked example.** Declare the type once in the types document — `RatingUnavailable` above is one; here is a second:

```veritas
define LimitExceeded "A request is larger than the limit that applies to it" as Error {
  message: _text "What was exceeded, in plain words"
  limit: number "The limit that applied"
  requested: number "What was asked for"
}
```

Then throw it from the blueprint that detects the situation:

```veritas
//* Reject a payout above the remaining budget
choose {
  //* Over the remaining budget
  if (request.amount > remainingBudget) {
    //* Report the exceeded budget
    throw LimitExceeded { message: "The payout is larger than the remaining budget", limit: remainingBudget, requested: request.amount };
  }
}
```

The run result then names the type and carries the field values, so a caller reads `LimitExceeded` with `limit` and `requested` instead of parsing a sentence.

> To detect a value that is **not on file**, declare the input optional — `income?: number` — and test it where it is used: `income is absent`, or `if_absent(income, 0)` where a stated fallback exists. An optional input the caller leaves out is `absent`; nothing replaces it with `0` or `""` (see _Absence_). A required input the caller leaves out never reaches the logic: the run fails at the boundary.

A thrown error ends the run unless a section on the way out catches it by name (see _Sections → Catching a failure_). The type is what selects the clause, and it is also what the run result, the API error, and the test report show — so declare one whenever something outside the throwing blueprint has to tell this failure apart.

### Using structures from logic

Reference declared names directly:

```veritas
//* Calculate Bonuses
"""Distributes a bonus pool proportionally to employee performance."""
public function calculate_bonuses {

  inputs {
    //* Employees to pay
    employees: list of Employee
    //* Company-wide bonus pool
    bonusPool: number
  }

  outputs {
    //* Bonus per employee, same index as input
    bonuses: list of number = []
  }

  locals {
    //* Current position
    index: number = 0
    //* Employee being processed
    currentEmployee: Employee
    //* Weighted bonus
    bonus: number
  }

  //* Pay each employee
  for (index = 0; index < length(employees); index += 1) {
    //* Current employee (for trace readability)
    currentEmployee = employees[index];
    //* Bonus for this employee
    bonus = bonusPool * currentEmployee.rating / 5;
    //* Store bonus
    bonuses = append(bonuses, bonus);
  }
  //* Return
  return;
}
```

> Input `{"employees": [{"name": "Ada Lovelace", "salary": 60000, "rating": 5}, {"name": "Ben Okafor", "salary": 52000, "rating": 3}], "bonusPool": 1000}` → Output `{"bonuses": [1000, 600]}`

`bonuses` starts from its signature default `[]`: `append` reads the list before the first step assigns it, and a name nothing has assigned yet cannot be read.

**Rules:**

- Field access uses dot notation: `currentEmployee.name`, `order.tier`. Nested access works: `order.customer.email`.
- Dot notation works for **every** field name, keywords included — write `item.type`, `order.date` and `policy.section`, not `item["type"]`.
- Reading a field the record does not carry gives `absent`; reading a field of `absent` fails the run. Read an optional field (`provider?: _text`) with `if_absent(rating.provider, "unknown")`.
- A blueprint that references an undefined type produces a `Cannot find type '<Name>'` error during validation. Fix the types document first, then re-validate the logic.

### Building a structure value

A value of a declared structure is written `TypeName { field: value, … }`, with the fields as bare names. Where the position already declares the type — an output, a typed local, a call argument, a `list of Employee` element, a field of another construction — the type name may be left off.

```veritas
//* Employee Record From Form
"""Turns an onboarding form into the payroll's employee record. New hires start at the middle rating until their first review."""
public function employee_record_from_form {

  inputs {
    //* Legal name from the form
    legalName: _text
    //* Agreed annual salary in USD
    agreedSalary: number
  }

  outputs {
    //* The payroll record
    employee: Employee
  }

  //* Payroll record with the starting rating
  employee = Employee { name: legalName, salary: agreedSalary, rating: 3 };
  //* Return
  return;
}
```

> Input `{"legalName": "Ada Lovelace", "agreedSalary": 60000}` → Output `{"employee": {"name": "Ada Lovelace", "salary": 60000, "rating": 3}}`

The fields are checked when the blueprint is validated: a required field the construction does not set, a field the structure does not declare, and a value of the wrong kind are errors before anything runs. A bare key is a field name; a quoted key (`{ "name": … }`) is a map key, still accepted on a structure and reported.

**Writing one field.** `order.total = 100` writes the field and keeps the rest: it is shorthand for `order = put(order, "total", 100)`. `items[2] = x` is `items = replace_at(items, 2, x)`, and `scores[region] = 5` on a record writes the key that `region` holds. Nothing is created on the way: `a.b.c = 1` fails when `a.b` is absent. A value has no identity: after `copy = order` and `order.total = 100`, `copy` is unchanged. Where the keys are known in advance, declare a structure rather than building an untyped record, so a misspelled field is reported when the blueprint is validated.

### Validation loop

Validate the types document first, then the logic; if the logic reports `Cannot find type '...'`, go back to the types document. Validating the types document in isolation (before the logic) keeps the error loop targeted.

```
1. Edit data/types.data.vts → leapter validate
2. Edit logic/<slug>/<slug>.logic.vts → leapter validate
3. If logic reports `Cannot find type '...'`, return to step 1
```

The CLI runs both passes automatically during a project-level `leapter validate`.

## Variables

A local is an entry of `locals { }`. It declares through the same rule as an input: `name: <type> = <literal>`.

```veritas
locals {
  //* Tax rate
  rate: number = 0.08
  //* Discount
  discount: number = 0
}
```

**Rules for locals:**

1. One entry declares ONE local. There is no `var`, no `;` and no comma.
2. `name: T = <literal>` declares a local with a written default. The default is assigned before the first step runs: the local holds it everywhere in the function, and it is not a node in the flow.
3. A local carries no constraint and no value list. `amount: number constrained_to min 0` and `tier: _text choice ["gold", "silver"]` are validator errors — define a named type in the types document (`define Tier as _text choice ["gold", "silver"]`) and declare the local with it (`tier: Tier`). A local may be optional (`note?: _text`), but not optional and given a default at once: `count?: number = 0` is an error — drop the `?` or the default. An optional local holds `absent` until a step assigns it, which is the honest form of "no match yet": `bestOffer?: Offer`, then `bestOffer is absent`, instead of a stand-in `0` or `-1` a real value could equal.
4. `locals { }` is the only place a local is declared.
5. A local's default is a VALUE. A computed right side is a declaration plus an assignment node where the value is worked out: write `grossAmount: number` in `locals { }`, and `grossAmount = subtotal + shipping;` as the step that computes it.
6. An UNTYPED local with a computed value needs no entry at all: it names no type and no written default, so write the labelled assignment alone. `//* Moves needed first` then `firstSub = helper(n: price);` — nothing in `locals { }`.
7. `leapter format` rewrites a blueprint written in the 0.5 form — the `( … ) -> …` signature and the `var` statement — into the blocks. The validator reports the old form as a legacy contract form until then, and the next release stops reading it.
   `leapter format` writes the split form for you, and drops the declaration of an untyped computed local entirely.

```veritas
//* Order Total
"""Adds shipping and the express surcharge to the goods subtotal, so checkout shows the amount the customer pays."""
public function order_total {

  inputs {
    //* Net price of the goods
    subtotal: number
    //* Shipping charge
    shipping: number
  }

  outputs {
    //* Amount the customer pays
    total: number
  }

  locals {
    //* Express surcharge rate
    surchargeRate: number = 0.05
    //* Amount before the surcharge
    grossAmount: number
  }

  //* Goods plus shipping
  grossAmount = subtotal + shipping;
  //* Add the express surcharge
  total = grossAmount * (1 + surchargeRate);
  //* Return
  return;
}
```

> Input `{"subtotal": 100, "shipping": 10}` → Output `{"total": 115.5}`

Compound assignment operators: `=`, `+=`, `-=`, `*=`, `/=`

### A default is set once, not per pass

A local's written default (`sum: number = 0` in `locals { }`) is part of its declaration, not a step: it holds before the first step runs and is not re-applied on the second pass of a loop. To start a running value afresh for each item, assign it with a labelled step at the start of the loop body: `//* Start this order's total at zero`, then `orderTotal = 0;`.

## Operators

### Arithmetic

| Operator             | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `+` `-` `*` `/`      | Arithmetic on two numbers; `+` also joins two texts  |
| `+=` `-=` `*=` `/=`  | Compound assignment                                  |

- **Numbers are exact decimals.** `0.1 + 0.2` is `0.3` and `1.1 * 1.1` is `1.21`. Division rounds only where the quotient has no finite decimal form, to at least 28 significant digits. Division by zero fails the run: there is no infinity and no `NaN`.
- **`+` works within one kind.** Two numbers add; two texts join. Put a number into text by converting it: `"Missing " + to_text(shortfall) + " items"`, and `to_text(amount, 2)` for a fixed number of decimals (`"60000.00"`).
- **The remainder is `modulo(total, 3)`**, and it takes the sign of the divisor: `modulo(-5, 3)` is `1`.
- **Step a number with `+= 1` and `-= 1`.**

### Comparison and equality

| Operator          | Description                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| `<` `<=` `>` `>=` | Ordering, between two numbers, two texts, two dates or two datetimes                 |
| `is` `isnt`       | Equality and inequality; `==`/`===` and `!=`/`!==` are other spellings of the same two |

- **Equality is total and typed.** Any two values can be compared, and values of different kinds are never equal: `1 is "1"` and `0 is false` are `false`. `==` and `===` are other spellings of `is`. Lists compare element by element, records field by field, and `1.50 is 1.5` is `true`. `x is absent` is the test for a missing value.
- **Ordering stays within one kind.** `absent < 10`, `true < false` and a number against a text fail the run. Text orders by character code, not dictionary order.
- **A text Choice has no order.** `tier < "gold"` on a Choice-typed `tier` is a validation error: it would compare spellings, not ranks. State a ranking explicitly, for example with a decision table that maps each tier to a number.
- `a < b < c` fails the run; write `a < b and b < c`.
- **Inequality is `isnt`** — `is not` reads as `is (not …)`.

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

`and`, `or` and `not` take booleans and give booleans. `and` and `or` stop early — the right side is not evaluated when the left side already decides — which makes a guard one line: `quantity is absent or quantity > 0`.

### A value that depends on a condition

A choice between two values is a decision a reader must see, so it is written as a `choose`:

```veritas
//* Average only when there is something to average
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

### Absence

`absent` is the one value that means "there is no value here". Write `absent`; `null` is read as an older spelling of it.

- **Where it comes from:** an optional input the caller left out, a field the record does not carry, `find` with no match, `first` or `last` of an empty list, and a local marked `?` before its first assignment.
- **Test it and carry it, never compute with it.** `x is absent`, `x isnt absent` and `if_absent(x, fallback)` are always safe, and so is assigning or passing it. `absent + 1`, `absent < 10`, `absent and ready`, `absent.total` and a date built-in given `absent` fail the run. Nothing turns `absent` into `0` or `""` for you.
- **Guard where it is used.** `quantity is absent or quantity > 0` is safe because `or` stops early.
- **Required or optional.** A required input the caller leaves out never reaches the logic: the run fails at the boundary. Declare an input that may be missing with `?` after its name, and handle `absent` where it is used.

```veritas
//* Shipping Line On Confirmation
"""Builds the shipping line of the order confirmation. A voucher code is optional: a customer without one sees the standard line, a customer with one sees it named."""
public function shipping_line_on_confirmation {

  inputs {
    //* Voucher code, when the customer entered one
    voucherCode?: _text
    //* Shipping cost in EUR
    shippingCost: number
  }

  outputs {
    //* Line shown on the confirmation
    shippingLine: _text
  }

  //* Which shipping line applies
  choose {
    //* No voucher entered
    if (voucherCode is absent) {
      //* Standard shipping line
      shippingLine = "Shipping: " + to_text(shippingCost, 2) + " EUR";
    }
    //* Voucher entered
    else {
      //* Shipping line naming the voucher
      shippingLine = "Shipping: " + to_text(shippingCost, 2) + " EUR, voucher " + upper(voucherCode) + " applied";
    }
  }
  //* Return
  return;
}
```

> Input `{"shippingCost": 4.9}` → Output `{"shippingLine": "Shipping: 4.90 EUR"}`
> Input `{"voucherCode": "spring", "shippingCost": 4.9}` → Output `{"shippingLine": "Shipping: 4.90 EUR, voucher SPRING applied"}`

### Member Access

- Dot notation: `obj.field` — works for **any** field name, including keywords (`item.type`, `order.date`, `policy.section`, `rule.if`)
- Bracket notation: `obj["field"]` — only for a computed key or a name that is not a single word (`row[columnName]`, `row["total amount"]`)
- A field the record does not carry reads as `absent`. A list position the list does not have — past the end, negative or fractional — fails the run: `items[0]` on an empty list fails, where `first(items)` answers `absent`.

`itemCategory` below is a `_text` local declared at the top of the function body:

```veritas
//* Read item type (a keyword field name — dot notation is fine)
itemCategory = items[index].type;
```

## Control Flow

### choose / if / else

All conditionals must be inside `choose { }`. No standalone `if`. No `else if`.

`choose` is **exclusive** — its branches are tried in the order written, the first `if` whose condition is `true` runs, and all later branches are skipped. `else` is the last branch of the `choose` and runs when no `if` before it matched. When nothing matches and there is no `else`, the `choose` does nothing and the run continues. A condition must be a boolean: a number, a text or `absent` there fails the run.

```veritas
//* Age Verification
"""Decides whether a customer may open an account. Customers must be 18 or older and show a valid ID; the reason tells the branch clerk which rule decided."""
public function age_verification {

  inputs {
    //* Customer age in years
    age: number
    //* Whether the customer showed a valid ID
    hasId: boolean
  }

  outputs {
    //* Whether the customer may open an account
    eligible: boolean
    //* The rule that decided
    reason: _text
  }

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
  //* Return
  return;
}
```

> Input `{"age": 25, "hasId": true}` → Output `{"eligible": true, "reason": "Meets all requirements"}`
> Input `{"age": 16, "hasId": true}` → Output `{"eligible": false, "reason": "Must be 18 or older"}`
> Input `{"age": 25, "hasId": false}` → Output `{"eligible": false, "reason": "Valid ID required"}`

### decide (decision tables)

Use `decide first` for rule grids: the first matching row wins and all later rows are skipped. The table is GitHub-Flavored Markdown: a header row with input expressions, `->` before the output target columns, a `| --- |` delimiter row, then data rows.

```veritas
//* Offer Stackability
"""BR-017 — whether two offers may stack. Precedence is the explicit top-to-bottom order of the rows (first match wins), not the invisible order of `if` branches."""
public function offer_stackability {

  inputs {
    //* Whether the first offer allows stacking
    firstOfferStackable: boolean
    //* Whether the second offer allows stacking
    secondOfferStackable: boolean
  }

  outputs {
    //* Whether the two offers may be combined
    canStack: boolean
  }

  //* Stackability verdict
  decide first

  | firstOfferStackable | secondOfferStackable | -> canStack |
  | ---                 | ---                  | ---         |
  | true                | true                 | true        |
  | true                | false                | false       |
  | false               | any                  | false       |
  //* Return
  return;
}
```

> Input `{"firstOfferStackable": true, "secondOfferStackable": true}` → Output `{"canStack": true}`
> Input `{"firstOfferStackable": true, "secondOfferStackable": false}` → Output `{"canStack": false}`
> Input `{"firstOfferStackable": false, "secondOfferStackable": true}` → Output `{"canStack": false}`

**Table rules:**

- An input cell is a literal or the wildcard `any`; a computed input cell is an error. A cell matches when the column's value **is** the literal — typed, so `1` does not match `"1"`.
- The literal cells of one column are all of one kind. An output cell is an expression (`subtotal * 0.10` is fine) and never `any`.
- A header's output column names what it writes, exactly as an assignment does: `-> rate`, `-> order.band`.
- **A table that matches no row assigns nothing**, and the targets keep the values they had. Write the default as a last row of `any` cells, or give the output a signature default.
- `first` is the only policy.

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

The header may declare its counter, labelled before `var` like any local. The label comment runs to the end of its line, so `var` starts the next one:

```veritas
//* Sum all values
for (//* Current position in the list
    var index: number = 0; index < length(values); index += 1) {
    //* Add current value to running total
    total += values[index];
}
```

Use `length(...)` for the bound, not `.length`. (To total a list, call `sum` — this
example only shows the loop form.)

For nested loops, use descriptive index names (`index`, `innerIndex`, `ruleIndex`). A counter declared in `locals { }` (`index: number = 0`, then `for (index = 0; …)`) is that local and keeps its value after the loop; a counter the loop introduces exists inside the loop only.

### for...in (for-each)

Iterates over list elements directly. Works with `list of <primitive>`, `list of <NamedType>` (item fields are read directly, e.g. `line.price`), and `any multiple`. Simpler than index-based when you don't need the index.

**A write through the item writes the list.** Inside `for (var line in lines)`, `line.net = …` writes `lines` at the current position, so after the loop the list holds the written elements. The list the loop walks is fixed before the first pass: writing to it changes elements, never how many passes run. Over a computed list — `for (var line in sort(prices))` — there is no list to write back to, and a write to the item is an error.

The types document declares the order line:

```veritas
define OrderLine "One line of a customer order" {
  product: _text "Product name"
  price: number "List price in EUR"
  net: number = 0 "Price after the loyalty discount"
}
```

```veritas
//* Loyalty Prices For Order Lines
"""Applies the loyalty discount to every line of an order. Members pay 90% of the list price; the lines keep their order so the confirmation lists them as the customer entered them."""
public function loyalty_prices_for_order_lines {

  inputs {
    //* The order's lines
    lines: list of OrderLine
  }

  outputs {
    //* The lines with their net prices
    pricedLines: list of OrderLine
  }

  //* Start from the entered lines
  pricedLines = lines;
  //* Price each line
  for (var line in pricedLines) {
    //* Member price, 90% of list
    line.net = line.price * 0.9;
  }
  //* Return
  return;
}
```

> Input `{"lines": [{"product": "Desk lamp", "price": 40}, {"product": "Bulb", "price": 5}]}` → Output `{"pricedLines": [{"product": "Desk lamp", "price": 40, "net": 36}, {"product": "Bulb", "price": 5, "net": 4.5}]}`

**Loop rules:**

- The item and a counter the loop introduces exist inside the loop only; reading one after the loop is an error, not a stale value. A loop variable may not reuse a name the function already uses.
- A `for...in` always ends. A `for` or `while` ends only when its condition turns `false`, and a run that loops too long is stopped by the step budget.
- `continue` inside a `for` still runs the step (`index += 1`) before the next test.
- A `for` or `while` condition must be a boolean.

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

`break` leaves the nearest loop and `continue` starts its next pass. Both are errors outside a loop. Neither leaves the function — `return;` does, even from inside a loop.

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

#### Catching a failure (`catch`)

A section may be followed by one or more `catch` clauses. Each names an error type — or `any` for every failure — and binds the caught failure to a name for its own body. A clause holds the **fallback**: what the blueprint does instead when the guarded steps could not finish.

The types document declares the applicant and the failure:

```veritas
define Applicant "A person applying for credit" {
  name: _text "Legal name"
  monthlyIncome?: number "Net monthly income in EUR, when on file"
}
```

The helper blueprint raises `MissingData` when the income is not on file:

```veritas
//* Credit Score
"""Scores an applicant from 1 to 5 by net monthly income. The score cannot be computed without the income, so a missing income is reported as MissingData rather than scored as zero."""
function credit_score {

  inputs {
    //* The applicant to score
    applicant: Applicant
  }

  outputs {
    //* Score from 1 (weakest) to 5 (strongest)
    score: number
  }

  //* Income must be on file
  choose {
    //* No income on file
    if (applicant.monthlyIncome is absent) {
      //* Report the missing income
      throw MissingData { message: "No income on file", field: "monthlyIncome" };
    }
  }
  //* One point per 1000 EUR, at most 5
  score = min([5, floor(applicant.monthlyIncome / 1000) + 1]);
  //* Return
  return;
}
```

> Input `{"applicant": {"name": "Ada Lovelace", "monthlyIncome": 2500}}` → Output `{"score": 3}`

The caller guards the call and names the fallback:

```veritas
//* Applicant Rating
"""Rates a credit applicant for the loan officer. The rating is the credit score; when the score cannot be computed because data is missing, the applicant is rated 1 and the rating says why, so the officer receives a rated applicant instead of a failed request."""
public function applicant_rating {

  inputs {
    //* The applicant to rate
    applicant: Applicant
  }

  outputs {
    //* Rating from 1 to 5
    rating: number
    //* What the rating rests on
    ratingBasis: _text
  }

  locals {
    //* The credit-scoring result
    scoreResult: any single
  }

  section "Rate the applicant" {
    """Asks the credit-scoring blueprint for a score and takes it as the rating, based on the applicant's verified income."""
    //* Ask the credit-scoring blueprint
    scoreResult = credit_score(applicant: applicant);
    //* Take the score as the rating
    rating = scoreResult.score;
    //* Rated from the applicant's own figures
    ratingBasis = "verified income";
  }
  catch (problem: MissingData) {
    //* Fall back when data is missing
    """Rates the applicant 1 and names the missing value, so the caller receives a rated applicant instead of a failed run."""
    //* Lowest rating
    rating = 1;
    //* Say why the rating is lowest
    ratingBasis = "no data on file: " + problem.field;
  }
  //* Return
  return;
}
```

> Input `{"applicant": {"name": "Ada Lovelace", "monthlyIncome": 2500}}` → Output `{"rating": 3, "ratingBasis": "verified income"}`
> Input `{"applicant": {"name": "Ben Okafor"}}` → Output `{"rating": 1, "ratingBasis": "no data on file: monthlyIncome"}`

**Syntax**

- `catch` comes FIRST, then the bound name and the type in parentheses, then the braces.
- The clause's metadata sits INSIDE its braces: the `//*` label first, then the mandatory `"""description"""`, then the steps.
- Do not write a node id. Post-processing assigns it, between `catch` and `(` — `catch @H-a1b2c3d4 (problem: MissingData)`. Preserve an existing one when you edit (see _Labels and Node IDs_).
- Only a **section** carries clauses. The blueprint body, a loop, a `choose`, an `if`, and a clause itself cannot. To guard steps that are not in a section yet, put them in one.
- The named type must be a structure defined `as Error` (see _Error types_). The bound name exists inside that clause and nowhere else.
- `catch (e: any)` binds whatever was thrown — a typed error's own fields, or `{ message }` for a plain-text throw. The clause names no type, so nothing checks a field you read off it. Name the type whenever the handler reads the payload.
- The bound name must be FREE. A clause that binds a name the blueprint already uses — an input, an output, or a local — is a model error, not a shadow. Pick a name nothing else in the function uses (`problem` is the usual one).

**What happens at run time**

1. A failure raised anywhere inside the guarded section — including inside a blueprint the section calls, at any depth — unwinds to the nearest enclosing section that has a matching clause. A section with no clauses is not a stopping point, and no other construct is one.
2. Clauses are tested in written order and the first match wins. A type matches by EXACT name; error types form no hierarchy. `catch (e: any)` matches every failure, so it goes LAST if you write one at all — the validator flags a clause an earlier one already covers as unreachable. It also flags an empty clause body, and a guarded section nothing inside can fail.
3. Values assigned before the failure keep their values. The failure is bound to the clause name for that clause body only, so `problem.message` and the type's other fields are readable there.
4. After the clause, the run continues with the step AFTER the section. Nothing is recorded in the run's errors — a handled failure is a normal run. Inside a loop the current iteration carries on after the section; the loop is not left.
5. A clause may `throw` again. That throw leaves the section outward; it is never offered to the same section's other clauses. `throw problem;` re-raises the bound value with the type the clause names: inside `catch (problem: MissingData)` it raises `MissingData` with its fields, so an outer clause or the caller still tells the failure apart. Inside `catch (problem: any)` it raises the built-in `Error`.
6. A failure no clause matches ends the run exactly as before: it lands in the run result with its type and fields.
7. `return;`, `break` and `continue` are not failures and pass through a guarded section untouched. A runtime **fault** — a defect such as reading a field of `absent`, dividing by zero, or `+` on a text and a number — is not a failure either: no clause catches it, not even `catch (e: any)`, and it still ends the run.

Catch only where the blueprint has a real business fallback — see _Best Practices_.

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

### Sizing a section

- **The description says which, in what order, and how.** "Adds the flat 2.50 EUR handling fee, then a 1% surcharge on the order subtotal" — not "Applies the fees".
- **A section holds one business step**, several statements long. One section per function reads like uncommented code; one per assignment is noise.
- **Past 15–20 statements, add subsections** at the phase boundaries, so a reader keeps the thread.

## Labels and Node IDs

Every statement requires a `//*` label on the line before it. Sections are the only statement without one (the title is the label).

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

Type prefixes: `S`=Section, `T`=Step, `D`=Decision, `G`=DecisionTable, `C`=Condition, `E`=Else, `L`=Loop, `V`=Variable, `R`=Return, `X`=Error, `H`=Catch clause.

## Return and Throw

```veritas
//* Return results
return;

//* Reject invalid input
throw "Amount must be positive";

//* Report the missing income
throw MissingData { message: "No income on file", field: "income" };

//* Rethrow a problem held in a variable
throw problem;
```

`return` takes no expression. Assign output parameters before returning.

`throw` raises a failure in one of three forms:

- A text expression. `throw "Amount must be positive"` means `Error { message: "Amount must be positive" }`.
- A typed literal, `throw <TypeName> { field: value, ... }`. The type must be a structure defined `as Error` (see _Error types_), and the literal must set every required field of it.
- A variable whose declared type is a structure defined `as Error` — a local, an input, or the name a `catch` clause binds. It raises that declared type with the variable's fields.

Only an error type or a text message can be thrown; anything else is a model error, and so is a variable declared as a plain structure. The message of the text form may be computed: `throw "Missing: " + fieldName;`.

**Choosing the form:**

| Situation | Form | Reported type |
| --- | --- | --- |
| A caller, a test, or an API client could react to this specific failure | `throw MissingData { message: "…", field: "income" }` | `MissingData`, with the fields |
| A one-off validation complaint nobody branches on | `throw "Amount must be positive"` | `Error`, message only |
| Re-raising a failure already held in an error-typed variable | `throw problem` | the variable's declared type, e.g. `MissingData`, with its fields |

A **typed literal** is the form that makes a failure machine-readable: the run result names its type and carries its field values, so whoever reads that result — a test, an API client — branches on the type instead of matching the message text. Use it whenever a reader could react to the failure. The text form reports the built-in `Error` and carries only its message.

Rules for the typed literal:

- The type must be declared `as Error` in the types document (see _Error types_). Throwing a plain structure, a number, or an undeclared name is a model error.
- The literal must set every required field of the type, `message` included. Optional fields (`provider?: _text`) may be left out. A field the type does not declare is an error.
- A field value is any expression — a literal, a variable, or a computed value: `throw LimitExceeded { message: "Over the daily cap", limit: dailyCap, requested: requestedAmount };`.
- Do not put a node id or a label in the payload. The fields are business data a caller reads.
