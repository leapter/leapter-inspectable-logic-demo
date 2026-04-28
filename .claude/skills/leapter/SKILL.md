---
name: leapter
description: Leapter CLI — manage projects, push blueprints, test via runtime API, and deploy to the SaaS platform. Covers the full development and deployment lifecycle.
version: '1.0.0'
globs:
  - 'leapter.project'
  - '.leapter/**'
triggers:
  - leapter
  - leapter push
  - leapter validate
  - leapter login
  - leapter clone
  - leapter runtime
  - push blueprint
  - deploy blueprint
  - test blueprint
  - runtime api
  - leapter project
  - leapter list
  - leapter test
  - leapter test run
  - leapter test create
  - test suite
  - test case
  - regression test blueprint
priority: high
categories:
  - cli
  - deployment
  - api
---

# Leapter CLI — Project & Runtime Orchestrator

Manages the full lifecycle of a Leapter project: authoring and validating blueprints
locally, pushing to the SaaS platform, cloning remote projects, and executing
blueprints via the local or hosted runtime API.

## Project Layout

A Leapter project has a fixed directory structure anchored by a `leapter.project` manifest.
The CLI discovers the project by walking up from the current directory until it finds this file.

```
my-project/
  leapter.project                                    # Project manifest (JSON, required)
  .gitignore                                         # Should include .leapter/
  logic/
    calculate-discount/
      calculate-discount.logic.vts                   # One blueprint per file
      tests/
        calculate-discount.test.json                 # Test suites (optional, one file per suite) When more than 25 tests. Split into multiple forming logical groups.
    validate-order/
      validate-order.logic.vts                       # Each blueprint in its own subdirectory
  data/
    types.data.vts                                   # Shared type definitions (optional)
  .leapter/
    .remote-config                                   # Remote binding (created by push/clone, gitignored)
```

### Rules

- **One blueprint per `.logic.vts` file** — each file contains exactly one `function` declaration
- **Each blueprint in its own subdirectory** under `logic/` — directory name matches filename: `logic/<slug>/<slug>.logic.vts`
- **Slugs are hyphenated lowercase** — e.g. `calculate-discount`, not `calculateDiscount` or `calculate_discount`
- **Type definitions** go in `data/types.data.vts` (optional, for shared custom types)
- **Test suites** live under `logic/<slug>/tests/<suite-name>.test.json` — one JSON file per suite, slug derived from the suite label. Round-trip through `push`, `clone`, `leap export`, and `leap import`.
- **The `.leapter/` directory** is gitignored — it stores local connection metadata

### Manifest Format (`leapter.project`)

```json
{
  "leapFormat": 1,
  "app": {
    "id": "<uuid>",
    "label": "Project Name",
    "description": "Project description"
  },
  "main": "<slug>",
  "version": "1.0.0"
}
```

- `leapFormat` must be `1`
- `app.id` is the **canonical project ID** — used locally and on the server. `leapter init project` generates it; `leapter push` creates the remote project with this same ID
- When creating a new project from scratch (not cloned), `leapter init project` generates the UUID automatically
- **`main`** — the slug of the project's entry-point blueprint (required). This is the
  blueprint that the runtime API exposes as the primary endpoint. It must match one of
  the directory names under `logic/`. Example: if the main blueprint is at
  `logic/calculate-pricing/calculate-pricing.logic.vts`, set `"main": "calculate-pricing"`.

### Main Blueprint

Every project must designate one blueprint as the **main** entry point. This is the
blueprint that:

- Is exposed as the primary runtime API endpoint
- Appears as the project's main blueprint in the SaaS UI
- Can call other blueprints in the project as helpers

When creating a new project:

1. Decide which blueprint is the entry point (the one the frontend will call)
2. Set its slug as the `"main"` field in `leapter.project`
3. Other blueprints are helpers — they can be called from the main blueprint

### Blueprint-to-Manifest ID Matching

Each `.logic.vts` file's function `//#id UUID` is the blueprint's model ID in the SaaS platform.
On `leapter push`, blueprints are matched to remote models by this ID:

- Matching ID → **updated**
- No match → **created** as new
- Remote-only → **unchanged** (not deleted)

## Quick Reference

```bash
# Local development (no auth required)
leapter validate                                # Validate all .vts files in project
leapter validate <file.vts>                     # Validate a single file
leapter validate <dir>                          # Validate all .vts files in directory
leapter convert <file.js>                       # Convert ES5 JavaScript to Veritas
leapter runtime run --model <slug> --input '{}' # Execute blueprint locally
leapter runtime run --model <slug> --file in.json  # Execute with input from file
leapter runtime run --model <slug> --input '{}' --trace  # Stream trace/log events to stderr
leapter runtime describe --model <slug>          # Show blueprint input/output schema
leapter runtime trace list                      # List saved execution traces
leapter runtime trace show <id>                 # Inspect a trace
leapter runtime serve                           # Start local runtime server (port 4004)
leapter runtime serve --port 8080               # Start on custom port
leapter runtime serve --path ./my-project       # Serve from a specific directory
leapter spec validate <file.md>                 # Validate a spec document
leapter init project "Title" "Description"      # Create a new Leapter project
leapter init claude                             # Scaffold Claude Code environment

# Test suites (filesystem-only, no auth)
leapter test list                               # List every suite in the project
leapter test list <slug>                        # List suites for a single blueprint
leapter test show <slug>                        # Show the suite (or pick one via --suite)
leapter test show <slug> --suite <name> --format json
leapter test create <slug> --label "Happy path" # Scaffold an empty suite
leapter test create <slug> --label "Seeded" --from-run <runId>  # Seed first case from a saved run
leapter test add-case <slug> --suite <name> --input '{"x":1}' --expect '{"y":2}'
leapter test add-case <slug> --suite <name> --input @input.json --expect @expected.json
leapter test add-case <slug> --suite <name> --from-run <runId>     # Seed input + expected from a saved run
leapter test add-case <slug> --suite <name> --input '{"x":-1}' --expects-error
leapter test remove <slug> --suite <name>       # Delete the whole suite
leapter test remove <slug> --suite <name> --case <id>  # Delete a single case
leapter test run                                # Run every suite in the project
leapter test run <slug>                         # Run all suites for one blueprint
leapter test run <slug> --suite <name>          # Run a single suite
leapter test run <slug> --suite <name> --case <id> --format json

# Push to SaaS (requires auth)
leapter login                                   # Authenticate via browser OAuth
leapter login <lab-url>                         # Login to specific instance
leapter login --api-key <key>                   # Authenticate with API key (local dev / CI)
leapter login <lab-url> --api-key <key>         # API key against specific instance
leapter logout                                  # Sign out and clear stored credentials
leapter push                                    # Push blueprints (auto-creates project on first push)
leapter push <directory>                        # Push from specific directory
leapter clone                                   # List remote projects available for cloning
leapter clone <project-id>                      # Clone a remote project locally
leapter clone <project-id> -o <dir>             # Clone to specific directory
leapter list                                    # List blueprints in current project
leapter projects list                           # List all your accessible projects
leapter projects create <name>                  # Create a new project on the server

# Remote runtime (requires runtime API key)
leapter runtime api-key create                  # Create a new read+execute key for this project
leapter runtime api-key set <key>               # Manually store an existing key
leapter runtime api-key show                    # Show current runtime API key (masked)
leapter runtime api-key remove                  # Remove stored runtime API key
leapter runtime describe --model <id> --remote   # Show blueprint schema (remote)
leapter runtime run remote --model <id> --input '{}'  # Execute on hosted runtime

# Debugging
leapter push --verbose                              # Verbose output (URLs, auth, response details)
LEAPTER_DEBUG=1 leapter push                        # Same via env var
```

## Interpreting "push the project"

When the user says "push the project" (or "deploy", "publish"), assume they mean
**push blueprints to the Leapter SaaS** via `leapter push`. Deploying the web
app (e.g. to Vercel) is not supported by this kit yet, so do not attempt it.

Before running `leapter push`:

1. **Check login** — `leapter push` requires an authenticated session. If the
   user is not logged in, run `leapter login` first.
2. **Tell the user which endpoint you're pushing to** — report the target host
   (e.g. `https://test.lab.leapter.com`) before pushing, so they can confirm.
   The host comes from the login session / `.leapter/.remote-config`.
3. **Push itself does not require an API key** — `leapter push` uses the OAuth
   session from `leapter login`.
4. **Remote execution DOES require an API key.** If the user also wants to call
   the hosted runtime (from a website or `leapter runtime run remote`), create
   one with `leapter runtime api-key create` after the push succeeds.

## Workflow

The CLI is designed for **offline-first development**. You can author, validate,
and execute blueprints entirely locally — no SaaS connection needed until you're
ready to deploy.

**Important:** If the user asks to create a blueprint or project and there is no
`leapter.project` file in the working directory, run `leapter init project` first
(with `--no-starter` if you'll generate the blueprint yourself).

### Step 1. Create or open a project

**If no `leapter.project` file exists**, create one:

```bash
leapter init project "My Calculator" "Calculates things"
cd my-calculator
```

This creates `leapter.project`, `logic/`, `data/`, `.gitignore`, and a starter
blueprint. Use `--no-starter` when you'll write the blueprint yourself or
generate it from a spec:

```bash
leapter init project "Tax Engine" "Vehicle tax calculation" --no-starter
```

Use `--dir <path>` to control the target directory (defaults to a slugified title).

For an existing project, just `cd` into the directory containing `leapter.project`.

### Step 2. Author blueprints locally

Write `.logic.vts` files using the `leapter-veritas` skill. That skill handles
Veritas syntax, generation constraints, and the validate-fix loop.

Follow the project layout described above: one blueprint per `.logic.vts` file,
each in its own subdirectory under `logic/`.

### Step 3. Validate locally

**Always validate before anything else.** Invalid `.vts` files will cause
problems downstream (empty blueprints on push, runtime errors).

```bash
leapter validate                          # Whole project — must show "all valid"
leapter validate my-blueprint.logic.vts   # Single file
leapter validate logic/                   # All files in a directory
```

### Step 4. Execute locally

Run blueprints directly on your machine using the embedded runtime —
no server, no auth, no network required:

```bash
leapter runtime run --model <slug> --input '{"amount": 100, "rate": 0.19}'
leapter runtime run --model <slug> --file test-input.json
echo '{"x": 42}' | leapter runtime run --model <slug>
```

The `--model` flag accepts a **slug** (directory name under `logic/`) or a
path to a `.logic.vts` file. Results are printed as structured JSON.

Use `--node <node-id>` to execute a specific subtree for focused testing.

### Step 5. Inspect traces

Every local run saves a trace to `.leapter/runs/` for debugging:

```bash
leapter runtime trace list                # List recent traces
leapter runtime trace show <trace-id>     # Inspect execution details
```

Control trace retention with `--keep-traces N` on `runtime run`.

### Step 6. Author and run test suites

Once a blueprint behaves the way you want for a given input, pin that
behaviour as a regression test. Suites are plain JSON under
`logic/<slug>/tests/` and run in-process against the local runtime — no
server, no auth, no network.

**Scaffold from scratch:**

```bash
leapter test create <slug> --label "Happy path"
leapter test add-case <slug> --suite happy-path \
  --input '{"amount": 100, "rate": 0.19}' \
  --expect '{"total": 119}'
```

**Or seed cases from prior ad-hoc runs** (fastest when the output is already
correct — no need to retype inputs or transcribe outputs):

```bash
# Capture the runId straight from `runtime run --format json` — the run is
# saved to .leapter/runs/ automatically.
RUN_ID=$(leapter runtime run --model <slug> --format json \
  --input '{"amount": 100, "rate": 0.19}' | jq -r .runId)

leapter test create <slug> --label "Happy path" --from-run "$RUN_ID"

# Add more cases the same way:
RUN_ID=$(leapter runtime run --model <slug> --format json \
  --input '{"amount": 0, "rate": 0.19}' | jq -r .runId)
leapter test add-case <slug> --suite happy-path --from-run "$RUN_ID" \
  --label "Zero amount"
```

`runtime run` is quiet by default — trace/log events only appear if you
pass `--trace`.

**Agent tip:** `test add-case` prints the new case id on stdout and the
confirmation on stderr, so you can capture it in a variable:

```bash
CASE_ID=$(leapter test add-case <slug> --suite happy-path \
  --input '{"x": 1}' --expect '{"y": 2}')
```

**Large payloads:** pass `--input @input.json` / `--expect @expected.json`
to read JSON from a file instead of quoting it inline.

**Error expectations:** use `--expects-error` for cases that should fail.
Pair with `--expect '{"detail": "..."}'` to assert on the error message.

**Run:**

Run tests after each change to the blueprint.

```bash
leapter test run                               # Every suite in the project
leapter test run <slug>                        # One blueprint's suites
leapter test run <slug> --suite <name>         # Single suite
leapter test run <slug> --suite <name> --case <id>  # Single case
leapter test run --format json                 # Machine-readable output for CI
```

Exit code is `0` when every case passes, `1` when any case fails or
errors. Suites round-trip through `push`, `clone`, and the `leap
export`/`leap import` commands — so checking them into git keeps your
server in sync.

### Step 7. Iterate

Repeat steps 2–5 until the logic is correct:

```
Author → Validate → Run → Inspect → Fix → Repeat
```

This loop is entirely offline and fast — no deploy/push cycle needed.

### Step 8. Serve locally (optional — for frontend development)

Start a local HTTP server that mirrors the production runtime API:

```bash
leapter runtime serve                     # Starts on http://localhost:4004
leapter runtime serve --port 8080         # Custom port
leapter runtime serve --path ./my-project # Serve from a specific directory
```

The server exposes:

- `POST /api/v1/{appspace}/{appId}/models/{slug}/runs` — execute a blueprint
- `GET /api/v1/{appspace}/{appId}/openapi` — OpenAPI 3.0 spec
- `GET /health` — health check

The `{appspace}` and `{appId}` path segments accept any value (not enforced locally).
No authentication is required. Blueprints are re-read from disk on every request
(hot reload — edit a `.vts` file and the next request picks up the change).

### Step 9. Push & build a website (when ready)

When you want a **production website** backed by Leapter blueprints, you need
the hosted runtime. Pushed blueprints are immediately available — there is no
separate deploy step. This is the only step that requires authentication.

#### 9a. Authenticate and push

```bash
leapter login                                   # Opens browser for OAuth
leapter push                                    # Upload blueprints (auto-creates project on first push)
```

**Do NOT push until `leapter validate` reports all files as valid.** Invalid
`.vts` files create empty/broken blueprints on the platform.

After pushing, check the output — if a blueprint shows "created" but has no
content in the SaaS UI, the `.vts` file had parse errors.

#### 9b. Create a runtime API key

Your website (and remote CLI commands) need an API key to call the hosted runtime.

**Option 1 — Create via CLI** (recommended):

```bash
leapter runtime api-key create                  # Creates read+execute key, stores in .remote-config
```

The key is created server-side with read + execute scope for this project.
It's stored in `.leapter/.remote-config` (mode 0o600) and never printed in full.

**Option 2 — Create via web UI:**

1. Open your project in the Leapter web app
2. Go to **Settings → API Keys**
3. Click **Create API Key**, select **Execute** permission
4. Store it: `leapter runtime api-key set lpt_...`

For your deployment environment (Vercel, Netlify), set the key as an env var:

```
LEAPTER_API_KEY=lpt_...
```

#### 9c. Get the runtime URL and schema

```bash
leapter runtime describe --model <model-id> --remote --format json
```

This returns the `runUrl`, `inputSchema`, and `outputSchema` you need to
build your frontend. This command uses the runtime API key stored in step 9b.

#### 9d. Build the website

Call the runtime API from your frontend:

```typescript
const response = await fetch(runUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.LEAPTER_API_KEY!,
  },
  body: JSON.stringify(formData), // fields at top level, not nested
});
const { outputData } = await response.json();
```

**Request format:** Fields go at the top level (not nested under `input`).
**Response format:** Output data is in `outputData` (not `output` or `data`).

### Step 10. Clone (pull remote project)

To download a remote project as local `.vts` files:

```bash
leapter clone                                   # List available projects
leapter clone <project-id>                      # Clone a specific project
leapter clone <project-id> -o my-project        # Clone to a specific directory
```

This exports the project as a ZIP, extracts it, and writes connection metadata
to `.leapter/.remote-config`. The cloned `leapter.project` manifest retains the
server's project ID, so subsequent `leapter push` commands work immediately.

**Note:** Clone cannot be run inside an existing Leapter project directory.

## REST API Reference

Base URL pattern: `https://{host}/runtime/api/v1/{appspaceId}/{appId}`

| Method | Path                                          | Purpose                                       |
| ------ | --------------------------------------------- | --------------------------------------------- |
| `POST` | `/{appspaceId}/{appId}/models/{modelId}/runs` | Execute a blueprint                           |
| `GET`  | `/{appspaceId}/{appId}/openapi`               | OpenAPI 3.0 spec (lists all models + schemas) |

Example (production):

```
GET  https://lab.leapter.com/runtime/api/v1/{appspaceId}/{appId}/openapi
POST https://lab.leapter.com/runtime/api/v1/{appspaceId}/{appId}/models/{modelId}/runs
```

Example (local serve):

```
GET  http://localhost:4004/api/v1/local/local/openapi
POST http://localhost:4004/api/v1/local/local/models/{slug}/runs
```

The `appspaceId` and `appId` are UUIDs from your project configuration. Use `leapter runtime describe --remote` to get the full URLs.

## Troubleshooting

### Push says "created" but blueprint is empty in SaaS UI

The SaaS parser rejected the file content but created the blueprint shell. Fix:

1. Re-validate locally with `leapter validate`
2. If valid locally but still empty after push, the SaaS may not support the node ID format — use `//#id UUID` on all nodes as a fallback
3. Change the function's `//#id UUID` to a new UUID (use `uuidgen`) to force recreation, then push again

### Push returns 403 Forbidden

Common causes:

- **Duplicate node IDs** across `.vts` files in the project — IDs must be globally unique
- **Node IDs conflict** with blueprints in other projects in the same appspace
- Fix: regenerate the conflicting IDs with `uuidgen` and push again

### Push says "unchanged" but content is stale

The push matches blueprints by their function `//#id UUID`. If the ID matches a remote blueprint, it's considered "unchanged" even if the content differs (when the content hash matches). Fix:

- Change the function's `//#id UUID` to a new value to force re-creation

### Runtime returns empty `{}` output

Common causes:

- **Local `var` shadows an output parameter** — declaring `var rate: number = 0;` when `rate` is also an output param creates a separate local variable that interferes with the output binding. Assign directly to the output param instead.
- **Blueprint content didn't upload** — check the SaaS UI to verify the blueprint has logic content

### `__call_blueprint__` runtime error: "Cannot convert {Object} to number"

The `-> varName` binding receives the **full output object** (e.g., `{ rate: 5.0 }`), not a single scalar. If you use the variable directly as a number, it fails. Access the field explicitly: `varName.rate` in subsequent code.

## Tool Routing

- **Business logic / Veritas code** → `leapter-veritas` skill (in `skill/veritas/`)
- **CLI operations / deployment / testing** → This skill
