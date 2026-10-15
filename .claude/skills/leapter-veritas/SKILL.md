---
name: leapter-veritas
description: Write and modify valid Veritas blueprints — the DSL for Leapter business logic.
version: '0.5.0'
globs:
  - '**/*.vts'
  - '**/*.data.vts'
triggers:
  - veritas
  - blueprint
  - create blueprint
  - modify blueprint
  - business logic
  - decision rules
  - .vts
  - .data.vts
priority: high
categories:
  - dsl
  - blueprint
---

# Veritas Blueprint Authoring

Veritas is a business logic DSL built on the **literate programming** philosophy. Blueprints serve as living documentation of business rules and algorithms, readable by domain experts who are not programmers. Sections and nested sections structure the narrative in domain language — each section explains **why** the logic exists, not just what it does. We combine documentation, intent and code in one artifact and produce human-first artifacts. We write for domain experts and humans.

## Reference

Author against [veritas-spec-0.5.md](veritas-spec-0.5.md) (syntax) and [veritas-functions-0.5.md](veritas-functions-0.5.md) (built-in functions and the cross-blueprint call syntax).

For an older local project containing allowed-value lists written as
`constrained_to` before a value list, run `leapter format`: it normalizes supported named and
inline declarations to `choice [...]`. It leaves unrepairable files unchanged
and exits nonzero; read the diagnostics and edit unsupported forms manually.
Review the diff and run `leapter validate` afterward. Formatting preserves
existing type/field ID markers and leaves missing ones absent; pull the server's
markers before renaming markerless types or fields. After a CLI update,
`leapter init claude` refreshes this project's bundled skill files.

## Shape the interface to fit the domain

The function signature is the contract a domain expert reads first. Model it in the shape that expresses the domain most clearly — a types document is optional, not a requirement.

- **Primitive inputs and outputs** (`_text`, `number`, `boolean`, dates, and lists of those) are a complete, valid contract on their own. A handful of independent primitive parameters needs **no data model**: declare the params inline and skip the types document.
- **Structured types are equally first-class.** Reach for a Structure or a Choice whenever it expresses the domain better:
  - **Nesting** — a field is itself an object, or a list of objects (e.g. an order with line items). Primitives can't express that cleanly.
  - **Understandability** — a named Structure or Choice makes the contract clearer than a long parameter list, or a value comes from a known set (`define Tier as _text choice ["bronze", "silver", "gold"]`) so the runtime validates it for you.
  - **Cohesion** — several values always travel together and name one domain concept (a customer, an order); grouping them keeps signatures and call sites readable.
- **Failures are part of the contract too.** When the brief names a distinct way the blueprint can fail — "if income is missing, report which field" — declare the type with `define … as Error { … }` and `throw` it with its fields set (`throw MissingData { message: "No income on file", field: "income" }`). The run result then names the type and carries the payload, so a test or an API client branches on the type instead of matching message text. Keep the plain `throw "…"` string form for a one-off complaint nobody needs to tell apart. A thrown failure ends the run unless a section on the way out catches it: when the brief also names what to do INSTEAD, put the risky steps in a section and give it a `catch` for that error type. See _Error types_, _Return and Throw_ and _Sections → Catching a failure_ in the spec.
- **Let the domain decide, not a default.** Model the data the way a domain expert would describe it: independent, shallow values stay primitives; a thing with fields becomes a Structure.

## Creation Protocol

Creation follows **structure first, then logic**. A domain expert should be able to review and validate the narrative skeleton before any code is written.

```
1. UNDERSTAND  Read requirements, identify inputs/outputs/business rules
2. STRUCTURE   Create the .logic.vts with the function signature + sections
               - Shape inputs/outputs to fit the domain — primitives or
                 structured types, whichever expresses it best (see above)
               - A blueprint description ("""...""") under the //* title
               - Section descriptions explaining the rationale
2.5. MODEL     If inputs/outputs use structured types:
               - Create or extend data/types.data.vts with the needed structures
                 (one types document per project — extend the existing file)
               - leapter validate → fix any errors in the types file
               - Only then reference the types from the logic signature
3. IMPLEMENT   Write logic per veritas-spec-0.5.md
4. VALIDATE    leapter validate
5. FIX         On errors, fix and re-validate (max 3 attempts)
6. REPORT      If still failing, report to user with error details
```

## Modification Protocol

```
1. READ        Read the existing .vts file (and data/types.data.vts if present)
2. UNDERSTAND  Understand current logic + the requested change
3. EDIT        Modify using the Edit tool — or rewrite the file when the
               change is sweeping; either way preserve existing node IDs
4. VALIDATE    leapter validate
5. FIX         On errors, fix and re-validate (max 3 attempts)
6. REPORT      If still failing, report to user
```

## Project Layout

A Leapter **project** is a set of blueprints that work together. Each blueprint file lives in its own subdirectory under `logic/`:

```
logic/
  calculate-discount/
    calculate-discount.logic.vts
  validate-order/
    validate-order.logic.vts
data/
  types.data.vts              # shared structures, value types and Choices (only when structured types are needed)
leapter.project               # project manifest
```

One function per file. Slugs are hyphenated lowercase. Required for `leapter runtime run --model <slug>` to find the file. Visibility lives in the source, not in the manifest — see _Visibility_ under **Functions** in `veritas-spec-0.5.md`. Legacy: `public: string[]` and `main` in `leapter.project` are still read when no file declares `public`. They are never written.

When the project needs structured types, they live in a single `data/types.data.vts` file. Multi-file type models are a follow-up — do not split into `data/customer.data.vts`, `data/order.data.vts`, etc. in this iteration.

## Decomposition

Structure a Leapter project the way you'd structure any well-written program: small, named, single-purpose functions that call each other. A public blueprint orchestrates; each private helper does one thing. Apply the same decomposition instincts you'd use in JavaScript, Python, or any other language — lookups become functions, validators become functions, per-item computations called in a loop become functions, distinct pipeline phases become functions.

**The one Leapter constraint: each function lives in its own file.** A helper is not a nested function — it's a standalone blueprint at `logic/<slug>/<slug>.logic.vts`, invoked from its caller as a **named function call** `result = helperCallIdentifier(param: value)`. See `veritas-functions-0.5.md` for the call syntax and a worked cross-blueprint example.

**Create helpers before their callers.** A blueprint can only call another that already EXISTS or that you created/proposed earlier in this same turn. So when extracting or adding a helper, finish the helper FIRST, THEN write the caller. If you validate or write the caller while the helper is still just an idea, validation will say the blueprint "does not exist yet" — that is NOT a syntax error, so do not change the call form; the named-call syntax is correct. Just create the helper first, then the call resolves.

**Choose the right construct.** A `choose` block made entirely of exact-match equality checks (`is` / `==`) to assign an output MUST be a `decide first` decision table, not a `choose` / `if-else` chain — reserve `choose` for inequalities and mixed conditions (ranges, computed predicates). See the `decide` section in `veritas-spec-0.5.md` for the BAD-vs-GOOD example.

**A brief that says "if X fails, do Y" asks for a `catch`.** The caller decides what to do when a helper cannot deliver — "if the rating blueprint has no data on file, rate 1 and say why". Put the call that can fail in a **section** and attach a `catch` clause for the error type that helper raises. Read the types document FIRST and catch that type BY NAME; `catch (e: any)` also swallows the failures you have no fallback for, and those belong to the caller above you. The clause body sets the fallback outputs, and the run then carries on after the section as a normal run. See _Sections → Catching a failure_ in the spec.

A 500-line monolithic function would be bad code in JavaScript. It's bad code here too.

## Critical Rules

- **Every statement needs a `//* label`** — a 2–6 word business headline, mandatory. Add context the adjacent code can't (the WHY); never restate the expression, never reuse a label across nodes, no trailing period. Sections use their title as the label. See _Labels and Node IDs → Writing good labels_ in the spec.
- **No standalone `if`** — all conditionals inside `choose { }`.
- **No `else if`** — use sequential `if` branches inside `choose`.
- **`return;` takes no expression** — assign output params first, then `return;`.
- **One name per function** — inputs, outputs, and local declarations share a single namespace; every name must be unique across all three. Never reuse a name (including a local that shadows an output — assign directly to outputs instead).
- **Do not generate node IDs for new nodes** — auto-assigned by post-processing. When modifying an existing blueprint — string edits or a full rewrite — preserve the existing `//#id` / `@T-…` markers on every node you keep and never invent one; dropping them severs node identity (see _Labels and Node IDs_ in the spec).
- **Use human-readable names** — `monthlyPremium` not `mp`, `discountRate` not `dr`.
- **Name the current item in loops** — assign `currentInvestorName = investors[index].name` at loop start so execution traces identify _who_ is being processed.
- **When you do define types, they live in `data/`, logic lives in `logic/`.** Never inline a `define` inside a `.logic.vts` file. **Types-first:** before adding or referencing a shared shape, read the existing types document and reuse a canonical type rather than duplicating it inline — an inline copy drifts from the shared definition.
- **One types document per project.** When the project needs structured types, use a single `data/types.data.vts` for all structures, value types and Choices. Splitting by concept is a planned follow-up.
- **Describe every blueprint and every section.** Put a `"""description"""` under the function's `//* title` (1–3 sentences on the business purpose — this is the blueprint's description) and a substantive multi-sentence `"""description"""` in every section (the rule/rationale, not a restatement of the code). Don't omit them and don't reduce them to a single clause.
- **When a value is structured or comes from a known set, type it and let the runtime validate it.** Give a value from a known set a **Choice** in the project's types document — the base first, then the values: `define Tier as _text choice ["bronze", "silver", "gold"]`, `define Rating as number choice [1, 2, 3]`, `define Tags as list of _text choice ["a", "b"]` element-wise, (an empty `choice []` parses but validates nothing, so always list the values) — and give a thing-with-fields a Structure; then TYPE the input with it (`tier: Tier`, or `tier: Tier = "bronze"` when it needs a default); never leave it bare `_text`/`any` and re-check by hand. A one-off set can be declared inline, directly after the type, on a parameter (`priority: _text choice ["low", "high"] = "low"`) or on a structure field, where the rules come BEFORE the description (`channel: _text choice ["web", "phone"] "How the order arrived"`) — but keep a value set as a separate named Choice rather than an inline one, even when only one input uses it. The run boundary validates **every declared type** before your logic runs — an out-of-set Choice value, or a Structure missing a required field or with a wrong-typed field, is rejected for free — so don't hand-write membership / field-presence / type guards (a brief's "Error case" for a value set is already covered). Numeric ranges and text lengths are types too, and `constrained_to` is the keyword for those bounds ONLY — never for a value set: `define Score as number constrained_to min 1 max 5` on a named type, or inline on a structure field (`rating: number constrained_to min 1 max 5 "Performance rating"`). (Once a value *is* structured or constrained, type it — don't fake it with raw primitives plus manual checks.)
- **Declare numeric and text-length bounds on first generation.** For a bound local to one input, write an inline bound directly after the type in the signature: `score: number constrained_to min 0 max 100` or `name: _text constrained_to length min 1 max 120`. These need no types document. Reuse a named bounded type when it expresses the domain rule; define one for shared bounds. The runtime enforces these bounds too, so omit matching range / length guards and redundant "Validate inputs" sections. Keep `throw` for strict bounds such as `> 0` (the supported min/max bounds are inclusive), cross-field checks, and other rules the type cannot express. See _Parameter Constraints_ in the spec for a complete example.
