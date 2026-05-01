---
name: introduction
description: Interactive project introduction — explains architecture, checks tooling health, shows project status, and guides next steps
version: '1.0.0'
triggers:
  - hello
  - hallo
  - help
  - getting started
  - how does this work
  - what is this
  - introduce
  - onboarding
  - where do I start
priority: high
categories:
  - onboarding
---

# Project Introduction

When triggered, give the user a friendly, interactive introduction to this project.
Tailor everything to the actual state of the repo — no generic filler.

## Phase 1: Gather State (silently, before speaking)

Run these checks in parallel to build context:

- `node --version` — is Node.js installed?
- `pnpm --version` — is pnpm installed?
- `ls requirements/` — what customer requirements exist?
- `ls leapter/` — does the Leapter project exist?
- `cat web/src/lib/project.ts` — what project is configured?
- `.leapter-tools/cli/leapter --version` — is the CLI available? (see Phase 1b)
- `ls web/node_modules/.package-lock.json 2>/dev/null` — are dependencies installed?
- `cat web/.env.local 2>/dev/null` — is the environment file configured?
- `ls .leapter-tools/leapter-blueprint-viewer.vsix` — is the VS Code extension bundled?

### Phase 1a: Environment Init

If `web/.env.local` does **not** exist, run the init script to create it:

- **macOS / Linux:** `./init.sh`
- **Windows:** `init.cmd`

The script copies `web/.env.example` → `web/.env.local`. Local mode runs
blueprints in-browser via `@leapter/runtime-browser` - no runtime URL or
API key is needed for local dev. The env file is mainly there to enable
Glass Mode (`NEXT_PUBLIC_LEAPTER_DEV_MODE=true`, the default) and to hold
the optional remote runtime credentials when the user later toggles to
remote mode in the devtools panel.

If the init script itself is missing, create `web/.env.local` manually:

```bash
cp web/.env.example web/.env.local
```

Report the result in the Tooling Health section (Phase 3).

### Phase 1b: CLI Execution Check

Verify the Leapter CLI can actually run from the project-local `.leapter-tools/` directory.
Run these checks in order and stop at the first failure:

1. **File exists:** `ls .leapter-tools/cli/leapter` (Unix) or `ls .leapter-tools/cli/leapter.cmd` (Windows)
2. **Runs:** `.leapter-tools/cli/leapter help` — should print the help/usage text

If step 1 fails → the CLI wrapper is missing. Suggest re-cloning or running `npm install`
in `.leapter-tools/cli/`.

If step 2 fails → likely Node.js is not installed or not on PATH. Show the Node.js
install instructions (see Phase 3 below). Also check that `.leapter-tools/cli/leapter-cli.cjs`
exists and that `node_modules/` is populated (`cd .leapter-tools/cli && npm install`).

## Phase 2: Greet and Orient

Open with a brief welcome, then immediately explain the key mental model:

```
Welcome to the Leapter Starter!

You describe business rules — I turn them into a working web app.

How it works:
  Business logic  →  Leapter blueprints (.vts files)            — NOT in TypeScript
  Web UI          →  Next.js + React + shadcn/ui                 — NOT in blueprints
  Local runtime   →  blueprints execute in the browser via WASM  - no server needed
  Remote option   →  Server Actions call the hosted runtime      - for production / shared state
```

## Phase 3: Tooling Health

Show a quick status line for each tool. Use checkmarks/crosses for scannability:

```
Tooling:
  Node.js:       v22.x
  pnpm:          v9.x
  Leapter CLI:   .leapter-tools/cli/leapter (v0.1.0)
  CLI test:      leapter validate — OK
  Environment:   web/.env.local — created (debug mode on, in-browser runtime)
  Dependencies:  installed
  API key:       not configured (needed for remote deployment only)
  VS Code ext:   bundled — install from .leapter-tools/ if not yet active
  MCP servers:   shadcn, next-devtools, vercel, context7
```

If something is missing, add a one-line fix suggestion inline.

**CLI test row:** Show the result of Phase 1b. Examples:
- `CLI test:      leapter help — OK`
- `CLI test:      leapter help — FAILED (node not found)`
- `CLI test:      .leapter-tools/cli/leapter — MISSING`

**Environment row:** Show the result of Phase 1a. Examples:
- `Environment:   web/.env.local — created by init.sh (debug on, in-browser runtime)`
- `Environment:   web/.env.local — already existed (debug on)`
- `Environment:   web/.env.local — MISSING (init.sh failed, see error above)`

**If Node.js or npm is not installed**, stop here and help the user install it first:

- **Windows** — download the installer from nodejs.org (includes npm)
- **macOS** — `brew install node` or download from nodejs.org
- **Linux** — `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt-get install -y nodejs`

Then install pnpm: `npm install -g pnpm`, then `pnpm install`.
Do not proceed to project status until the runtime prerequisites are met.

## Phase 4: Project Status

Show what exists as a compact table using actual names from the repo:

```
Projects:
  Requirement                    Blueprint                      UI Module
  requirements/pizza-pricing     pizza-pricing                   web/src/modules/pizza-pricing
  requirements/vc-tool           vc-waterfall-calculator         web/src/modules/vc-waterfall-...
```

Mark gaps clearly (e.g., "-- not started --") so the user sees what's incomplete.

## Phase 5: Guide Next Steps

Based on what's missing, suggest the most useful next action:

| State | Suggest |
|-------|---------|
| No requirements | Offer both paths (see below) |
| Requirements without blueprints | "I see `requirements/<name>`. Want me to read it and start building?" |
| Blueprints without UI | "Blueprints are ready. Want me to create the web UI?" |
| Everything exists | "The app looks complete. Want to test locally, make changes, or deploy?" |
| Dependencies not installed | "Run `cd web && pnpm install` first, then we can start" |

### When no requirements exist: Two paths

Present both options and let the user pick:

```
To get started, I need a requirements document. Two ways to do that:

  1) Drop it in:  If you already have a spec, existing Excel sheets, requirements doc, or notes,
     put them in requirements/<project-name>/ and tell me to build it.

  2) Let's create one together:  I'll ask a few questions about the use case
     and write the requirements for you.

Which works for you?
```

### Interactive Requirements Gathering (path 2)

Only when the user picks the conversational path (or has nothing to drop in).
Ask focused questions:

1. **What's the use case?** "What kind of calculation or decision should the app handle?"
   (e.g., pizza pricing, loan eligibility, shipping cost, tax computation)
2. **What are the inputs?** "What information does the user enter?"
   (e.g., size, quantity, type, location)
3. **What are the outputs?** "What should the app show as results?"
   (e.g., total price, breakdown by category, comparison of options)
4. **What are the business rules?** "How is the result calculated? Any tiers, discounts, special cases?"
5. **Any branding?** "Company name, colors, logo? Or keep it neutral for now?"
6. **What language?** "Should the UI be in German, English, or another language?"

After gathering answers, write a structured requirements document and save it to
`requirements/<slug>/requirements.md` (create the subdirectory). The slug should be
a hyphenated lowercase name derived from the use case (e.g., `pizza-pricing`,
`loan-calculator`, `pricing-tool`).

Then confirm with the user: "Here's what I've captured — look good? I'll start building."

### When blueprints exist: Offer blueprint preview

If blueprints exist, offer to open the project in VS Code with the blueprint viewer:

```
Want to preview your blueprints?
  Run: pnpm code:open
  This opens VS Code with the blueprint viewer and Claude Code extensions installed.
  Open any .vts file to see the visual blueprint representation.
```

### Quick actions

```
What would you like to do?

  a) Drop in requirements and build from them
  b) Create requirements together (I'll ask a few questions)
  c) Open VS Code with blueprint viewer (pnpm code:open)
  d) Test an existing blueprint locally
  e) Start the dev server and preview the app
  f) Deploy to production (push blueprints + deploy web)
  g) Something else — just tell me
```

## Phase 6: Workflow Cheat Sheet (only if user asked "help" or "how does this work")

If the trigger suggests the user wants more detail, append a brief workflow overview:

```
Workflow:
  1. Tell me about the use case — I'll create a requirements doc (or drop one into requirements/)
  2. I create Leapter blueprints (business logic) and validate them
  3. I build a tailored Next.js UI with shadcn/ui components
  4. Test locally:  pnpm dev  (one process - converter watcher + Next.js)
  5. Deploy:        pnpm push  +  cd web && vercel deploy
```

And mention the key skills available:

```
Skills you can invoke:
  /leapter-veritas   — author or modify blueprint logic
  /leapter           — CLI operations, testing, deployment
```

## Tone

- Friendly but concise — respect the user's time
- Use actual project names, file paths, and versions from the repo
- "hello" → lighter greeting, skip the cheat sheet
- "help" or "how does this work" → include the cheat sheet
- Never repeat information the user can already see
