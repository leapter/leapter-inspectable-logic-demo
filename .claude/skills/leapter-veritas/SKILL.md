---
name: leapter-veritas
description: Write and modify valid Veritas blueprints — the DSL for Leapter business logic.
version: '0.1.0'
globs:
  - '**/*.vts'
triggers:
  - veritas
  - blueprint
  - create blueprint
  - modify blueprint
  - business logic
  - decision rules
  - .vts
priority: high
categories:
  - dsl
  - blueprint
---

# Veritas Blueprint Authoring (v0.1)

Veritas is a business logic DSL built on the **literate programming** philosophy. Blueprints serve as living documentation of business rules and algorithms, readable by domain experts who are not programmers. Sections and nested sections structure the narrative in domain language — each section explains **why** the logic exists, not just what it does. We combine documentation, intent and code in one artifact and produce human-first artifacts. We write for domain experts and humans.

**Language version:** 0.1 (core language without custom complex types)

## References

| Document                                             | Content                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------- |
| [veritas-spec-0.1.md](veritas-spec-0.1.md)           | Core language — types, control flow, operators, sections, runtime notes |
| [veritas-functions-0.1.md](veritas-functions-0.1.md) | Built-in operations — array, string, math, blueprint calls              |

## Creation Protocol

Creation follows two phases: **structure first, then logic.** The blueprint should read like a well-structured specification before any code is written.

### Phase 1: Structure & Narrative

Create the file with the function signature, sections, and descriptions. The result should read like a human-readable specification of the business problem — a domain expert should be able to review and validate the structure without seeing any logic code.

```
1. UNDERSTAND  Read requirements, identify inputs/outputs/business rules
2. STRUCTURE   Create the .vts file with:
               - Function declaration (typed inputs and outputs)
               - Sections and nested subsections describing each business concept
               - Section descriptions explaining the rationale, regulations, or domain context
               - No logic code yet — just the narrative skeleton
```

At this point the file does not need to validate.

### Phase 2: Implementation

Fill each section with the actual Veritas logic, then validate.

```
3. IMPLEMENT   Write logic inside each section per veritas-spec-0.1.md
               (human-readable names, clear labels, one concept per section)
4. VALIDATE    Run `leapter validate <file.vts>`
5. FIX         If errors, read output, fix, re-validate (max 3 attempts)
6. REPORT      If still failing, report to user with error details
```

## Modification Protocol

```
1. READ        Read the existing .vts file
2. UNDERSTAND  Understand current logic + the requested change
3. EDIT        Modify using the Edit tool (preserve existing node IDs)
4. VALIDATE    Run `leapter validate <file.vts>`
5. FIX         If errors, fix and re-validate (max 3 attempts)
6. REPORT      If still failing, report to user
```

## Project Layout

Each blueprint file lives in its own subdirectory under `logic/`:

```
logic/
  calculate-discount/
    calculate-discount.logic.vts
  validate-order/
    validate-order.logic.vts
```

This is required for `leapter runtime run --model <slug>` to find the file. Slugs are hyphenated lowercase.

## Critical Rules

1. **Every statement needs a `//* label`** — human-readable, mandatory. Sections use their title as the label.
2. **No standalone `if`** — all conditionals inside `choose { }`.
3. **No `else if`** — use sequential `if` branches inside `choose`.
4. **`return;` takes no expression** — assign output params first, then `return;`.
5. **Never shadow output params with `var`** — assign directly to outputs.
6. **Do not generate node IDs** — auto-assigned by post-processing. Preserve existing ones when editing.
7. **Use human-readable names** — `monthlyPremium` not `mp`, `discountRate` not `dr`.
8. **Name the current item in loops** — assign `currentInvestorName = investors[index].name` at loop start so execution traces identify _who_ is being processed.
9. **No large inline objects** — if pushing an object with more than 2-3 fields, pre-compute each field into a labeled variable first. Inline `{ "a": x, "b": y, "c": z, ... }` is unreadable in the blueprint viewer.
10. **Inputs: primitives only (v0.1)** — function inputs cannot use `any single`, `any multiple`, or `any`. Use associative primitive arrays (`list of text`, `list of number`) with matching indices instead. Outputs have no restriction.
