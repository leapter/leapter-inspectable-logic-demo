# Leapter Starter Web App

This is the Next.js app shell for the Leapter starter. The business logic does
not live here. It lives in Veritas files under `../leapter/` and is compiled
to local Blueprint JSON for the web app to execute and inspect.

Run the app from the repository root:

```bash
pnpm dev
```

That command starts the Veritas-to-Blueprint converter in watch mode and then
starts Next.js on `http://localhost:4000`.

Avoid running `next dev` directly while testing the full flow. Without the root
watcher, edited `.logic.vts` files will not be compiled into
`public/blueprints/`, which Next.js serves at `/blueprints/...`.

## Runtime

The app executes the included Blueprint locally in the browser through
`@leapter/runtime-browser`; no Leapter SaaS account or runtime server is needed
for the demo.

The bundled CLI/converter, browser runtime, and VS Code viewer are proprietary
Leapter beta tooling. You may deploy applications created with this starter,
including applications that use the bundled browser runtime as part of the
starter workflow. Do not modify, extract, repackage, resell, sublicense, or use
the proprietary tooling/runtime/viewer directly or indirectly to develop,
train, power, operate, or support any product or service that competes with, or
is intended to substitute for, Leapter's proprietary tooling, runtime, viewer,
converter, hosted runtime services, Veritas-compatible language
implementations, or visual-programming platform. Ordinary bundling,
minification, caching, containerization, CI packaging, and deployment as part
of an application created with this starter are permitted. The bundled tooling
is beta software provided as-is, without warranty, SLA, support commitment, or
backwards-compatibility commitment.

For the full repository overview, see `../README.md`. For license details, see
`../LICENSES.md`.
