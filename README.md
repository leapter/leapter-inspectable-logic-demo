# Leapter Starter (Next.js)

Turn business requirements into working web apps — powered by [Leapter](https://leapter.com) and Claude.

**No coding required.** You describe your business rules, Claude builds the app. Business logic lives in auditable Leapter blueprints, not buried in code.

## What's Included

- A working **Insurance Premium Calculator** example (blueprint + UI)
- **Glass Mode** — click any result to see the execution trace step by step
- Next.js 16, React 19, Tailwind 4, shadcn/ui — all pre-configured
- Bundled Leapter CLI — no separate install needed

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

## Get Started

### 1. Create your project

```bash
git clone https://github.com/leapter/leapter-starter-nextjs.git my-app
cd my-app
```

Or use [degit](https://github.com/Rich-Harris/degit) for a clean copy without git history:

```bash
npx degit leapter/leapter-starter-nextjs my-app
cd my-app
```

### 2. Open it with Claude

**Claude Desktop (easiest):**
Open Claude Desktop, drag the `leapter-starter-nextjs` folder into the chat, and start talking.

**Terminal:**
```bash
cd leapter-starter-nextjs
claude
```

### 3. Say hello

Type **`hello`** in the Claude chat. Claude will:
- Check your machine is set up (Node.js, dependencies, etc.)
- Install anything that's missing
- Start the app so you can try it in your browser
- Show you the included example and guide you to create your own

That's it. No coding required — Claude handles the technical side.

## How It Works

You describe your business rules — Claude turns them into a working web app:

1. **Business logic** as Leapter blueprints — executable, visual, auditable
2. **A web app** with a tailored UI for the specific use case

Just tell Claude what you need. For example:

> "I need a calculator that estimates shipping costs based on weight and destination"

Or drop a requirements document (PDF, Word, Excel, or plain notes) into
`requirements/` and tell Claude to build it.

## Project Structure

```
leapter-starter-nextjs/
├── requirements/          Business rules & specs (input for Claude)
├── logic/                 Leapter blueprints (.vts files)
├── web/                   Next.js app (UI)
├── packages/
│   └── leapter-client/    Runtime API client
└── .leapter-tools/        Bundled Leapter CLI
```

## Development

```bash
# Start both the Leapter runtime and the Next.js app
pnpm dev

# Open http://localhost:4000
```

```bash
# Validate blueprints
pnpm validate

# Push blueprints to Leapter (requires login)
pnpm push
```

## Learn More

- [Leapter Documentation](https://leapter.com)
- [CLAUDE.md](CLAUDE.md) — Full architecture details and conventions

## License

MIT
