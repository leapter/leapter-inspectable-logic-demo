# Leapter CLI (bundled)

This directory contains the project-local Leapter CLI bundle. The wrapper
scripts (`leapter` for Unix, `leapter.cmd` for Windows) prefer the local
`leapter-cli.cjs` and fall back to the global install at `~/.leapter/bin/`.

## Update

Maintainer-only. All project-local Leapter tooling (the CLI, the VS Code
extension, and the browser runtime bundle) is vendored inside this repository.

To refresh every vendored tool from the rolling release
(`leapter-tools-latest`), run this at the repository root:

```bash
pnpm update-tools
```

The command is idempotent: it downloads all assets, verifies their SHA256
checksums, vendors them into place, reinstalls the CLI dependencies, and
re-converts the project blueprints with the updated CLI.

Release page: https://github.com/leapter/genielabs/releases/tag/leapter-tools-latest

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
