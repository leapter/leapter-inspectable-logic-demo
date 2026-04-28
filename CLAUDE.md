# Leapter Starter (Next.js)

This is a **demo application template**. The included app (Insurance Premium Calculator)
is just an **example** — it exists to show the architecture and will be **replaced entirely**
when the user provides their own requirements.

Your job is to read the requirements in `requirements/` and build a working web application
tailored to the customer's needs, powered by Leapter. When the user describes a new use case:
1. Replace the example blueprints in `logic/` with new ones matching their requirements
2. Replace the example UI in `web/src/modules/` with a bespoke page for their use case
3. Update `web/src/lib/project.ts` with the new project's name, slug, and IDs
4. Update `STYLEGUIDE.md` if the branding changes

## Audience (IMPORTANT)

The user is most likely **not a developer**. They are typically from sales, presales,
or a business team. Do NOT assume programming knowledge. Specifically:

- **Never use unexplained jargon** — if you must mention a technical term, briefly say
  what it means in plain language.
- **Explain what you're doing and why** at each step — don't just execute silently.
- **Report progress in simple terms** — "I'm setting up the app" not "running pnpm predev".
- **When something goes wrong**, explain the problem and the fix in everyday language.
  Don't dump stack traces or error logs without a plain-English summary first.
- **Ask simple, focused questions** — one at a time, with examples. Don't present
  walls of options or technical choices.
- **The user's job is to describe business rules and requirements.** Your job is to
  handle everything technical — they should never need to edit code, run commands,
  or understand the project structure.

---

## Session Start (MUST run at the beginning of every new conversation)

When a new session starts, **proactively** greet the user and check the environment.
Do not wait for the user to ask — this runs automatically on first message.

### Step 1: Greet

Welcome the user warmly. Set the tone: they describe what they need, you build it.

```
Welcome to the Leapter Starter!

I'll help you turn business rules into a working web application — no coding
required on your part. You describe what you need, I handle the technical side.

Let me set things up...
```

### Step 2: Check environment

Run these checks in parallel, fix any issues, and report a simple summary.
The user does not need to see raw command output — just the result.

Checks to run (silently):
1. `node --version` (required >= 18)
2. `pnpm --version`
3. `.leapter-tools/cli/leapter help` — must print usage text
4. Check if `web/.env.local` exists — if not, run `./init.sh` (macOS/Linux) or
   `init.cmd` (Windows) to create it
5. Check if `web/node_modules/.package-lock.json` exists — if not, run
   `cd web && pnpm install`

Show a simple status to the user:

```
Setup:
  Tools         ready
  Environment   configured
  Dependencies  installed
```

If something fails, explain the problem in plain language and fix it. For example:
"A required tool wasn't set up yet — I've installed it for you." Do not proceed
until all checks pass.

If Node.js or pnpm is missing, explain step by step how to install them — the user
may never have done this before. Offer to walk them through it.

### Step 3: Start the app

Once everything is ready, start the app:

```bash
pnpm dev
```

**Always run `pnpm dev` from the repo root — never from `web/`.** The root script
launches two services together (the Leapter runtime on :4004 and the Next.js app
on :4000). `web/package.json`'s `dev` is just `next dev` — running it alone
starts only the web app, which then fails on every API call because the runtime
isn't there. If you `cd`'d into a subdirectory for another step, `cd` back to
the repo root before starting the dev server.

Wait for both services to be ready, then tell the user:

```
The app is running! You can open it in your browser:
  http://localhost:4000
```

**If port 4000 or 4004 is already in use** (e.g. another copy of the starter is
already running), `pnpm dev` will fail with `EADDRINUSE`. Don't silently pick a
different port — tell the user in plain language that another instance seems to
be running and ask whether to stop it. For example:

```
It looks like another copy of the starter is already running on this machine
(port 4000 or 4004 is busy). Would you like me to stop the other one so this
one can start? If you want to keep both running, let me know and I'll set this
one up on different ports.
```

Only shut down the other process after the user confirms. To find it:
`lsof -i :4000 -i :4004` (macOS) or `netstat -ano | findstr :4000` (Windows).

### Step 4: Show what's included

The kit ships with a working example. Show it so the user can try it immediately.
Read `web/src/lib/project.ts` to get the app name, then present:

```
This kit includes a working example you can try right away:

  Insurance Premium Calculator
    Open it: http://localhost:4000/calculator
    What it does: calculates insurance premiums based on vehicle type, driver age,
    and other factors. Try entering different values to see how the result changes.

This example shows the full flow: requirements → blueprint → web app.
```

Use the actual project names from the repo. If a project is incomplete, note it
simply (e.g., "this one is still being built").

### Step 5: Invite the user to create their own

After showing the examples, guide the user toward building something new.
Keep it simple and inviting — no technical language:

```
Ready to create your own?

  1) If you have a document that describes your business rules (Excel, PDF, Word,
     or just notes), drop it into the "requirements" folder and tell me — I'll
     read it and build an app from it.

  2) Or just tell me what you'd like to build. For example:
     "I need a calculator that estimates shipping costs based on package weight
      and destination."
     I'll ask a few questions to understand the details, then build it for you.

What would you like to create?
```

Always end with a clear, simple question for the user to answer.

---

<!-- ============================================================ -->
<!-- INTERNAL: Everything below is for Claude, not shown to users  -->
<!-- ============================================================ -->

## Communication Style

When talking to the user:
- Use short sentences. Avoid compound sentences with semicolons.
- Lead with what happened, not how. "Your app is ready" not "The Next.js dev server
  compiled successfully on port 4000 with Turbopack".
- When you run multiple steps, give a brief status after each: "Setting up... done.
  Starting the app... done."
- If you need to show a file path or URL, present it as a clickable link or a
  clear label, not a raw terminal path.
- If the user asks "what did you do?", then explain in more detail. Don't front-load
  technical explanations they didn't ask for.

---

## Leapter CLI

**Always use the project-local CLI** at `.leapter-tools/cli/leapter` (Unix) or
`.leapter-tools/cli/leapter.cmd` (Windows). It bundles the correct version and falls
back to the global install automatically. Never use a bare `leapter` command — always
use the full path from the repo root:

```bash
.leapter-tools/cli/leapter validate
.leapter-tools/cli/leapter runtime run --model <slug> --input '{}'
.leapter-tools/cli/leapter runtime serve
```

When running from the `logic/` directory, use the relative path back:

```bash
cd logic
../.leapter-tools/cli/leapter validate
../.leapter-tools/cli/leapter runtime run --model <slug> --input '{}'
```

---

## Architecture (STRICT)

This is a **single-app** kit — one project, one set of business logic, one UI.

| Layer | Where | What goes here |
|-------|-------|---------------|
| **Requirements** | `requirements/` | Business rules, specs, notes (input for Claude) |
| **Business logic** | `logic/` | Leapter project — blueprints as `.logic.vts` files |
| **UI** | `web/src/modules/` | Form, schema, page component for the app |
| **API bridge** | `web/src/app/actions/` | Server Actions that call Leapter runtime |
| **Project config** | `web/src/lib/project.ts` | Single project definition (slug, IDs, accent color) |
| **Style guide** | `STYLEGUIDE.md` | Visual identity — colors, fonts, components |
| **Runtime client** | `packages/leapter-client/` | `@leapter/client` — runtime API client |

**Rules:**
- NEVER put business logic in TypeScript/React code — it goes in Leapter blueprints
- NEVER put UI code in Leapter blueprints
- ALL blueprint calls go through Server Actions (never call the runtime from client components)
- API key is ONLY used server-side via `@leapter/client`

---

## Workflow

### 1. Read requirements
Read everything in `requirements/` and `STYLEGUIDE.md`. Identify:
- Business rules → these become Leapter blueprints
- UI requirements → these become the React page/components
- Branding → apply to `STYLEGUIDE.md`, colors, fonts

### 2. Create or update blueprints
The Leapter project lives in `logic/`:
1. Create blueprint(s) using the `leapter-veritas` skill
2. Set `main` in `logic/leapter.project` to the entry-point blueprint slug
3. Validate: `cd logic && ../.leapter-tools/cli/leapter validate`
4. Test: `../.leapter-tools/cli/leapter runtime run --model <slug> --input '{...}'`

### 3. Build the UI
The app UI lives in `web/src/modules/`:
1. Update the page component, schema, and form
2. Update project config in `web/src/lib/project.ts` (slug, IDs, accent color)
3. The route is at `web/src/app/calculator/page.tsx`

**Wrap the page in `<GlassMode>`.** Glass Mode is the coral→purple border
that opens a logic replay panel when clicked — it's how the kit shows that
the result came from a Leapter blueprint. It is a core kit feature and must
survive every UI rewrite. The good news: it's fully encapsulated in
`@/components/glass-mode`. A new app wires it up like this:

```tsx
import { GlassMode } from "@/components/glass-mode";

<GlassMode
  projectSlug={project.slug}
  localProjectId={project.projectId}
  accentColor={project.accentColor}
  run={{ runId, modelId, traceData, inputData, outputData }}
>
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1>My App Title</h1>
      <p>Short description.</p>
    </div>
    <GlassMode.Toggle />   {/* header toggle; null when disabled */}
  </div>

  <form>...</form>

  {result && (
    <GlassMode.Result>    {/* wraps result in the glass portal */}
      <MyResults data={result} />
    </GlassMode.Result>
  )}
</GlassMode>
```

The wrapper owns the split-pane layout, the toggle button, the `DebugPortal`,
the inline replay panel on narrow viewports, and the right-column replay on
wide viewports. The app supplies `run` (runId + modelId + traceData + input +
output from the latest execution) and lays out its own content.

**Disabling for production.** Glass Mode is gated by `NEXT_PUBLIC_LEAPTER_DEBUG`
at build time. When the flag is unset, `<GlassMode>` is a pass-through
(renders a plain scrollable container), `<GlassMode.Toggle>` renders `null`,
`<GlassMode.Result>` renders its children unchanged, and the heavy impl chunk
(DebugPortal, LogicReplayPanel, viewer deps) is not shipped. Same source
works in dev and prod — no conditional rendering in app code.

### 4. Test locally
```bash
# From repo root — starts both runtime and Next.js app
pnpm dev

# Open http://localhost:4000/calculator
```

### 5. Deploy
```bash
# Validate and push blueprints, then deploy the web app
pnpm validate && pnpm push
cd web && vercel deploy --prod
```

---

## Available Tools

- **shadcn MCP** — install UI components: `pnpm dlx shadcn@latest add <component>`
- **Next.js DevTools MCP** — search Next.js docs, test in browser, check diagnostics
- **Vercel MCP** — deploy to Vercel, manage env vars (run `/mcp` to authenticate first)
- **Context7 MCP** — fetch latest docs for any library (Recharts, react-hook-form, etc.)
- **Leapter CLI** — validate, run, push blueprints (always use `.leapter-tools/cli/leapter`)

## Skill Routing

| Task | Skill |
|------|-------|
| Veritas code authoring, syntax, sections, validate-fix loop | `leapter-veritas` |
| CLI operations, project setup, deployment, runtime testing | `leapter` |
| React/Next.js performance, code review, refactoring | `react-best-practices` |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind 4 + shadcn/ui |
| Forms | react-hook-form + Zod + @hookform/resolvers |
| Charts | Recharts (via shadcn/ui Chart wrapper) |
| API | Next.js Server Actions → Leapter runtime |
| Business Logic | Leapter blueprints (Veritas DSL) |
| Deployment | Vercel (zero-config) |

---

## Project Structure

```
leapter-starter-nextjs/
├── CLAUDE.md                          ← You are here
├── STYLEGUIDE.md                      ← Visual identity (colors, fonts, components)
├── requirements/                      ← Business rules & specs (input for Claude)
├── logic/                             ← Leapter project (single project)
│   ├── leapter.project                ← Manifest (app.id, main, label)
│   ├── logic/<slug>/<slug>.logic.vts  ← Blueprint files
│   └── data/                          ← Shared types (optional)
├── web/                               ← Next.js app (single page)
│   ├── src/app/
│   │   ├── page.tsx                   ← Landing page
│   │   └── calculator/page.tsx        ← The app
│   ├── src/modules/                   ← UI module (schema, form, page)
│   ├── src/lib/project.ts             ← Project config (slug, IDs, accent)
│   ├── src/app/actions/blueprint.ts   ← Server Action → runtime API
│   └── src/components/ui/             ← shadcn/ui (pre-installed)
├── packages/
│   └── leapter-client/                ← @leapter/client — runtime API client
├── .leapter-tools/cli/                ← Bundled Leapter CLI
└── package.json                       ← Root workspace (pnpm)
```

---

## Patterns

### Server Action (one per blueprint)

```typescript
// web/src/app/actions/calculate-premium.ts
"use server";

import { z } from "zod";
import { runBlueprint } from "@/lib/leapter-client";

const InputSchema = z.object({
  vehicleType: z.enum(["car", "truck", "motorcycle"]),
  age: z.coerce.number().min(0).max(100),
  mileage: z.coerce.number().min(0),
});

export async function calculatePremium(input: z.infer<typeof InputSchema>) {
  const validated = InputSchema.parse(input);
  try {
    const result = await runBlueprint({ modelSlug: "calculate-premium", input: validated });
    return { success: true as const, data: result.outputData };
  } catch (error) {
    return { success: false as const, error: error instanceof Error ? error.message : "Failed" };
  }
}
```

### UI Design Philosophy (CRITICAL)

**Every project gets a bespoke, tailored UI.** Do NOT use generic form renderers,
generic dropdowns, or one-size-fits-all patterns. Each use case deserves a UI that
feels purpose-built for that specific problem.

**Input patterns — pick what fits the domain:**

- Enum with 2-5 options → **Visual selection cards** with icons, not a `<select>` dropdown
- Yes/no or on/off → **Toggle card** with description, not a bare checkbox
- Coverage tiers / plan levels → **Pricing comparison grid** (side-by-side cards)
- Numeric range with meaning → **Slider with labeled stops**, not a number input
- Vehicle/product type → **Icon cards** (car icon, truck icon, motorcycle icon)
- Date selection → **Calendar picker** with context (e.g., "Policy starts on...")
- Multi-step input → **Wizard with progress** and visual transitions

**Result patterns — match the output shape:**

- Single key metric → **Hero number** (large, prominent) with supporting details below
- Cost/price breakdown → **Stacked bar or donut chart** + line-item table side by side
- Comparison of options → **Side-by-side cards** with highlighted recommendation
- Risk/score → **Gauge or radar chart** with contextual labels
- Time series → **Area chart** with hover details
- Multiple KPIs → **Dashboard grid** — number cards in a row, charts below, detail table at bottom

**Language:**

- **Use the language of the requirements document** for all UI text (labels, headings, descriptions, tooltips, error messages). If the requirements are in German, the UI is in German. Do not mix languages — a German-language spec with English UI labels is confusing for the end user.

**General principles:**

- Use shadcn/ui primitives directly — compose them into domain-specific components
- Install additional shadcn components as needed via `pnpm dlx shadcn@latest add <name>`
- Use Recharts via the shadcn/ui `Chart` wrapper for all data visualization
- Chart colors use CSS variables `--chart-1` through `--chart-5` in `globals.css`
- Mobile-responsive by default — use Tailwind responsive classes
- Generous whitespace, clear visual hierarchy, smooth transitions
- Validate with Zod, but show validation inline and contextually — not as a wall of errors

---

## Branding & Design Guide

When requirements include a design guide (brand colors, logos, fonts), apply it to these
customization points:

| File | What to change |
|------|---------------|
| `web/src/app/globals.css` | CSS custom properties (`:root` block) — primary, secondary, accent, chart-1 through chart-5 |
| `web/src/app/layout.tsx` | Company name in `<metadata>`, font imports |
| `web/src/app/page.tsx` | Landing page copy, hero text, feature descriptions |
| `web/public/` | Logo files (logo.svg, favicon.ico) |
| `web/tailwind.config.ts` | Extended color palette if needed beyond CSS vars |

**Color mapping:** Convert brand hex colors to oklch for the CSS variables:
- Primary brand color → `--primary`
- Secondary brand color → `--secondary` or `--accent`
- Brand colors for charts → `--chart-1` through `--chart-5`
- Dark mode variants → `.dark` block in globals.css

**Fonts:** If the design guide specifies fonts, import via `next/font/local` in
`layout.tsx` and place `.woff2` files in `web/public/fonts/`. Do NOT use
`next/font/google` — it fails on Windows with Turbopack. Set the CSS variable `--font-sans`.

---

## Persistence (add only if requirements need it)

| Requirement mentions | Add |
|---------------------|-----|
| Nothing about saving | Keep stateless — form in, result out |
| "Save results", "history" | PGlite (WASM Postgres, zero setup) |
| "Multiple users", "shared" | Neon via Vercel marketplace |
| "Login", "accounts" | NextAuth.js or simple password protection |

---

## Core Rules

These are the load-bearing rules for this kit. Everything else is a default you
can adjust if requirements demand it.

- **Business logic lives in Leapter blueprints.** TypeScript is for UI and the
  thin Server Action bridge — never for calculation, rules, or decisions.
- **Preserve Glass Mode.** The debug toggle, `DebugPortal` result wrapper, and
  logic-replay split pane are core to the kit — re-skin them for the new use
  case if needed, but keep the flow intact.
- **Keep sample data in fixture files**, separate from source.
- **Scope to the demo.** Build what the requirements ask for and stop there —
  no CI/CD, no test frameworks, no monitoring, no external APIs beyond the
  Leapter runtime unless requirements call for them.
- **Check shadcn/ui first** before installing any new component library.
