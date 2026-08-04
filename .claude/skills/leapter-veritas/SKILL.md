---
name: leapter-veritas
description: Write and modify valid Veritas blueprints — the DSL for Leapter business logic.
version: '0.2.0'
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

Author against [veritas-spec-0.2.md](veritas-spec-0.2.md) (syntax) and [veritas-functions-0.2.md](veritas-functions-0.2.md) (built-in functions and the cross-blueprint call syntax).

## Keep the interface simple: primitives first, structures only when they earn it

The function signature is the contract a domain expert reads first. Keep it as plain as the problem allows.

- **Default to primitive inputs and outputs** — `_text`, `number`, `boolean`, dates, and lists of those. A handful of primitive parameters needs **no data model**: do not create a types document, do not define a Structure, just declare the params inline.
- **Introduce a structured type only when it earns its place:**
  - **Nesting** — a field is itself an object, or a list of objects (e.g. an order with line items). Primitives can't express that cleanly.
  - **Understandability** — a named Structure / constrained alias makes the contract clearer than a long flat parameter list, or a value comes from a known set (`define Tier as _text constrained_to ["bronze", "silver", "gold"]`) so the runtime validates it for you.
- **Don't reach for a data model by reflex.** "A bunch of primitives" is the common, correct shape. Structures are the deliberate exception, not the starting point. When in doubt, stay flat.

## Creation Protocol

Creation follows **structure first, then logic**. A domain expert should be able to review and validate the narrative skeleton before any code is written.

```
1. UNDERSTAND  Read requirements, identify inputs/outputs/business rules
2. STRUCTURE   Create the .logic.vts with the function signature + sections
               - Prefer primitive inputs/outputs; only model structured types
                 when nesting or understandability calls for it (see above)
               - A blueprint description ("""...""") under the //* title
               - Section descriptions explaining the rationale
2.5. MODEL     Only if inputs/outputs are genuinely structured:
               - Create or extend data/types.data.vts with the needed structures
                 (one types document per project — extend the existing file)
               - leapter validate → fix any errors in the types file
               - Only then reference the types from the logic signature
3. IMPLEMENT   Write logic per veritas-spec-0.2.md
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
  types.data.vts              # shared structures/aliases (only when structured types are needed)
leapter.project               # project manifest
```

One function per file. Slugs are hyphenated lowercase. Required for `leapter runtime run --model <slug>` to find the file. The project manifest declares the `main` entry-point blueprint.

When the project needs structured types, they live in a single `data/types.data.vts` file. Multi-file type models are a follow-up — do not split into `data/customer.data.vts`, `data/order.data.vts`, etc. in this iteration.

## Decomposition

Structure a Leapter project the way you'd structure any well-written program: small, named, single-purpose functions that call each other. Main orchestrates; each helper does one thing. Apply the same decomposition instincts you'd use in JavaScript, Python, or any other language — lookups become functions, validators become functions, per-item computations called in a loop become functions, distinct pipeline phases become functions.

**The one Leapter constraint: each function lives in its own file.** A helper is not a nested function — it's a standalone blueprint at `logic/<slug>/<slug>.logic.vts`, invoked from main as a **named function call** `result = helperCallIdentifier(param: value)`. See `veritas-functions-0.2.md` for the call syntax and a worked cross-blueprint example.

**Create helpers before their callers.** A blueprint can only call another that already EXISTS or that you created/proposed earlier in this same turn. So when extracting or adding a helper, finish the helper FIRST, THEN write the caller. If you validate or write the caller while the helper is still just an idea, validation will say the blueprint "does not exist yet" — that is NOT a syntax error, so do not change the call form; the named-call syntax is correct. Just create the helper first, then the call resolves.

**Choose the right construct.** A `choose` block made entirely of exact-match equality checks (`is` / `==`) to assign an output MUST be a `decide first` decision table, not a `choose` / `if-else` chain — reserve `choose` for inequalities and mixed conditions (ranges, computed predicates). See the `decide` section in `veritas-spec-0.2.md` for the BAD-vs-GOOD example.

A 500-line monolithic function would be bad code in JavaScript. It's bad code here too.

## Critical Rules

- **Every statement needs a `//* label`** — a 2–6 word business headline, mandatory. Add context the adjacent code can't (the WHY); never restate the expression, never reuse a label across nodes, no trailing period. Sections use their title as the label. See _Labels and Node IDs → Writing good labels_ in the spec.
- **No standalone `if`** — all conditionals inside `choose { }`.
- **No `else if`** — use sequential `if` branches inside `choose`.
- **`return;` takes no expression** — assign output params first, then `return;`.
- **One name per function** — inputs, outputs, and local declarations share a single namespace; every name must be unique across all three. Never reuse a name (including for a `var` that shadows an output — assign directly to outputs instead).
- **Do not generate node IDs for new nodes** — auto-assigned by post-processing. When modifying an existing blueprint — string edits or a full rewrite — preserve the existing `//#id` / `@T-…` markers on every node you keep and never invent one; dropping them severs node identity (see _Labels and Node IDs_ in the spec).
- **Use human-readable names** — `monthlyPremium` not `mp`, `discountRate` not `dr`.
- **Name the current item in loops** — assign `currentInvestorName = investors[index].name` at loop start so execution traces identify _who_ is being processed.
- **When you do define types, they live in `data/`, logic lives in `logic/`.** Never inline a `define` inside a `.logic.vts` file. **Types-first:** before adding or referencing a shared shape, read the existing types document and reuse a canonical type rather than duplicating it inline — an inline copy drifts from the shared definition.
- **One types document per project.** When the project needs structured types, use a single `data/types.data.vts` for all structures and aliases. Splitting by concept is a planned follow-up.
- **Describe every blueprint and every section.** Put a `"""description"""` under the function's `//* title` (1–3 sentences on the business purpose — this is the blueprint's description) and a substantive multi-sentence `"""description"""` in every section (the rule/rationale, not a restatement of the code). Don't omit them and don't reduce them to a single clause.
- **When a value is structured or comes from a known set, type it and let the runtime validate it.** Give a value from a known set a constrained alias (`define Tier as _text constrained_to ["bronze", "silver", "gold"]`) and a thing-with-fields a Structure — then TYPE the input with it (`tier: Tier`); never leave it bare `_text`/`any` and re-check by hand. The run boundary validates **every declared type** before your logic runs — an out-of-set enum value, or a Structure missing a required field or with a wrong-typed field, is rejected for free — so don't hand-write membership / field-presence / type guards (a brief's "Error case" for a value set is already covered). Keep `throw` only for what types can't express: numeric ranges, cross-field checks. (This is the flip side of "primitives first": once a value *is* structured or constrained, type it — don't fake it with raw primitives plus manual checks.)
