# Leapter Starter Agent Instructions

This repository is a starter for building apps whose business logic lives in Leapter, not in application code.

The app shell is Next.js. The business logic is Veritas.

## Core Rule

Do not implement business rules, pricing formulas, scoring decisions, eligibility checks, policy gates, or calculations in React, TypeScript, server actions, or utility functions.

Those belong in Veritas files under:

```text
leapter/logic/<slug>/<slug>.logic.vts
```

Application code should collect inputs, call the Leapter runtime, and render results.

## Architecture

| Layer | Location | Responsibility |
|---|---|---|
| Requirements | `requirements/` | Source material for the app and business rules |
| Business logic | `leapter/` | Veritas `.logic.vts` files |
| UI | `web/src/modules/` | Forms, pages, charts, result display |
| Runtime bridge | `web/src/app/actions/` | Server actions that call Leapter |
| Runtime client | `packages/leapter-client/` | Thin client for local/remote Leapter runtime |

## Veritas Workflow

When creating or changing business logic:

1. Read the relevant requirements.
2. Create or edit the `.logic.vts` file.
3. Keep sections and descriptions readable by a domain expert.
4. Validate:

```bash
pnpm validate
```

5. Test execution from the `leapter/` directory:

```bash
cd leapter
../.leapter-tools/cli/leapter runtime run --model <slug> --input '{}' --format json
```

## App Workflow

Start the local Leapter runtime and Next.js app from the repo root:

```bash
pnpm dev
```

This starts:

- Leapter runtime on `localhost:4004`
- Next.js app on `localhost:4000`

Do not run only the Next.js app when testing the full flow; the UI needs the runtime.

## Preserve Glass Mode

Glass Mode is the in-browser logic inspector. It is core to the starter.

When rewriting the UI, preserve:

- `GlassMode`
- `GlassMode.Toggle`
- `GlassMode.Result`
- the latest run data: `runId`, `modelId`, `traceData`, `inputData`, `outputData`

The point of the starter is that users can inspect the logic that produced a result.

## UI Guidance

Build a tailored UI for the use case. Do not use a generic form renderer unless the user explicitly asks for one.

Use the language and domain terms from the requirements. If the requirements are in German, the UI should be in German.

Prefer clear domain-specific controls:

- option cards for small enums
- toggles for yes/no choices
- sliders for meaningful numeric ranges
- charts or breakdowns for multi-part outputs
- inline validation for input problems

## Runtime And SaaS

Local validation and execution do not require a Leapter SaaS login.

Pushing Blueprints to Leapter Lab does require login:

```bash
pnpm push
```

Do not push or deploy unless the user explicitly asks.
