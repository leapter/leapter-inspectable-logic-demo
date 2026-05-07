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

**Language version:** 0.2 (functions + structured types)

## References

| Document                                             | Content                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| [veritas-spec-0.2.md](veritas-spec-0.2.md)           | Core language — types, control flow, operators, sections, runtime notes |
| [veritas-functions-0.2.md](veritas-functions-0.2.md) | Built-in operations — array, string, math, blueprint calls              |

## Creation Protocol

Creation follows **structure first, then logic**. A domain expert should be able to review and validate the narrative skeleton before any code is written. 
A **modeling phase** before logic pins the domain types before any logic references them. 
A logic file that references an undefined type produces a `Cannot find type '...'` error — validating the types file first keeps the fix loop targeted.

```
1. UNDERSTAND  Read requirements, identify inputs/outputs/business rules
2. MODEL       Create or extend data/types.data.vts with the needed structures
               (one types document per project — extend the existing file)
               - leapter validate → fix any errors in the types file
3. STRUCTURE   Create the .logic.vts with the function signature + sections
               referencing the types from step 2
4. IMPLEMENT   Write logic per veritas-spec-0.2.md
5. VALIDATE    leapter validate
6. FIX         On errors, fix and re-validate (max 3 attempts)
7. REPORT      If still failing, report to user with error details
```

## Modification Protocol

```
1. READ        Read the existing .vts file (and data/types.data.vts if present)
2. UNDERSTAND  Understand current logic + the requested change
3. EDIT        Modify using the Edit tool (preserve existing node IDs)
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
  types.data.vts              # v0.2 only — shared structures/aliases
leapter.project               # project manifest
```

One function per file. Slugs are hyphenated lowercase. Required for `leapter runtime run --model <slug>` to find the file. The project manifest declares the `main` entry-point blueprint.

For v0.2, types live in a single `data/types.data.vts` file. Multi-file type models are a follow-up — do not split into `data/customer.data.vts`, `data/order.data.vts`, etc. in this iteration.

## Decomposition

Structure a Leapter project the way you'd structure any well-written program: small, named, single-purpose functions that call each other. Main orchestrates; each helper does one thing. Apply the same decomposition instincts you'd use in JavaScript, Python, or any other language — lookups become functions, validators become functions, per-item computations called in a loop become functions, distinct pipeline phases become functions.

**The one Leapter constraint: each function lives in its own file.** A helper is not a nested function — it's a standalone blueprint at `logic/<slug>/<slug>.logic.vts`, invoked from main with `__call_blueprint__ @ref("Helper Label")`. See the active `veritas-functions-*.md` for the call syntax and a worked cross-file example.

**Max nesting depth: 1.** A function may contain a top-level `choose { ... }`, but no `choose` may appear inside another `choose` branch — and no `for`/`while` body may contain a `choose` that itself contains another decision. When you need a second level of decision, extract it into a helper and invoke it with `__call_blueprint__`. This mechanically forces decomposition of branchy logic: the body of an `if` or a loop resolves at most one decision before delegating.

A 500-line monolithic function would be bad code in JavaScript. It's bad code here too.

## Critical Rules

1. **Every statement needs a `//* label`** — human-readable, mandatory. Sections use their title as the label.
2. **No standalone `if`** — all conditionals inside `choose { }`.
3. **No `else if`** — use sequential `if` branches inside `choose`.
4. **`return;` takes no expression** — assign output params first, then `return;`.
5. **Never shadow output params with `var`** — assign directly to outputs.
6. **Do not generate node IDs** — auto-assigned by post-processing. Preserve existing ones when editing.
7. **Use human-readable names** — `monthlyPremium` not `mp`, `discountRate` not `dr`.
8. **Name the current item in loops** — assign `currentInvestorName = investors[index].name` at loop start so execution traces identify _who_ is being processed.
9. **Types live in `data/`, logic lives in `logic/`.** Never inline a `define` inside a `.logic.vts` file.
10. **One types document per project.** Use a single `data/types.data.vts` for all structures and aliases. Splitting by concept is a planned follow-up.
11. **Prefer constrained aliases over magic strings.** `define Tier as _text constrained_to ["bronze", "silver", "gold"]` beats passing a raw `_text` parameter named `tier`.
