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
`src/leapter-blueprints/`.

## Runtime

The app executes the included Blueprint locally in the browser through
`@leapter/runtime-browser`; no Leapter SaaS account or runtime server is needed
for the demo.

The bundled CLI/converter, browser runtime, and VS Code viewer are proprietary
Leapter beta tooling licensed for local development, evaluation, testing, CI,
and non-production demos only. Do not deploy `@leapter/runtime-browser` as part
of a production app unless a Leapter agreement permits it.

For the full repository overview, see `../README.md`. For license details, see
`../LICENSES.md`.
