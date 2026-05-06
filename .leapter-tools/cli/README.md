# Leapter CLI (bundled)

This directory contains the project-local Leapter CLI bundle. The wrapper
scripts (`leapter` for Unix, `leapter.cmd` for Windows) prefer the local
`leapter-cli.cjs` and fall back to the global install at `~/.leapter/bin/`.

## Update

Maintainer-only: download the latest bundle from the release:

```bash
gh release download cli-latest --repo leapter/genielabs --pattern "leapter-cli.cjs" --dir .leapter-tools/cli --clobber
```

Release page: https://github.com/leapter/genielabs/releases/tag/cli-latest

Starter users do not need this update step for the included local demo.

## Dependencies

The CLI requires Node.js >= 18 and one npm dependency for local blueprint
execution:

```bash
cd .leapter-tools/cli && npm install
```

## License

The bundled Leapter CLI is proprietary Leapter software. It is included so this
starter can validate, convert, and run the example logic locally without a
Leapter SaaS account. See `.leapter-tools/LICENSE` for the terms that apply to
the bundled tooling, and see `../../LICENSES.md` at the repository root for the
mixed-license overview.
