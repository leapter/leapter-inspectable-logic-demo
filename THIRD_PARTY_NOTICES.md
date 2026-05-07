# Third-Party Notices

This repository includes third-party open-source packages. The starter source
code, Leapter proprietary beta tooling, and generated project artifacts are
licensed as described in `LICENSES.md`; third-party components remain governed
by their own licenses.

This notice lists bundled third-party components identified in the local
repository. It is a practical notice for this starter, not a substitute for a
complete legal review of a production distribution or modified dependency set.

## Bundled Leapter Tooling

The bundled Leapter CLI/converter in `.leapter-tools/cli/leapter-cli.cjs` and
the browser runtime in `packages/runtime-browser/runtime-browser.mjs` include
or depend on the following third-party components:

| Component | License | Notes |
|---|---|---|
| `quickjs-emscripten`, `quickjs-emscripten-core`, and `@jitl/quickjs-*` packages | MIT | Used for QuickJS WASM execution support. |
| `zod` | MIT | Validation/schema code appears in the browser runtime bundle. |
| `fast-json-patch` | MIT | JSON Patch code appears in the CLI and browser runtime bundles. |
| `lodash-es` / Lodash-derived code | MIT | Utility code appears in the CLI bundle. |

Bundled license comments in `.leapter-tools/cli/leapter-cli.cjs` identify
Lodash and fast-json-patch license information. The lockfile for
`.leapter-tools/cli` identifies the QuickJS packages as MIT-licensed.

Identified copyright notices include:

- `quickjs-emscripten`: copyright (c) 2019-2024 Jake Teton-Landis.
- `zod`: copyright (c) 2025 Colin McDonnell.
- Lodash-derived code: copyright OpenJS Foundation and other contributors;
  based on Underscore.js, copyright Jeremy Ashkenas, DocumentCloud and
  Investigative Reporters & Editors.

For exact package versions and transitive dependencies, inspect the package
lockfiles and the installed package license files for the build being shipped.

## Application Dependencies

The web app and development toolchain use npm packages recorded in
`pnpm-lock.yaml` and package-specific lockfiles. Those packages are governed by
their own licenses.

## Bundled Fonts And Template Assets

The repository includes fonts and template assets under `web/public/`.

| Component | License / Notice | Notes |
|---|---|---|
| Inter Variable font (`web/public/fonts/Inter-Variable.woff2`) | SIL Open Font License 1.1 | Copyright (c) 2016 The Inter Project Authors. Retain the upstream OFL notice before broader redistribution. |
| Geist Mono Variable font (`web/public/fonts/GeistMono-Variable.woff2`) | SIL Open Font License 1.1 | Copyright 2024 The Geist Project Authors. Retain the upstream OFL notice before broader redistribution. |
| Next/Vercel template SVGs | Governed by their upstream project or brand terms | Remove unused template assets before broader distribution. |
| Leapter logo assets | Leapter GmbH brand assets | Included to identify the starter and demo; not licensed as a general trademark or brand-asset grant. |
| Vercel React Best Practices skill (`.claude/skills/react-best-practices/`) | MIT, per bundled metadata | Bundled agent guidance attributed to Vercel in the included metadata; retain upstream/source attribution. |

Before redistributing a production derivative, packaged build, container
image, or hosted bundle, review the dependency licenses for the exact build
you ship. Pay particular attention to native packages, optional platform
packages, fonts, images, generated assets, and any dependencies added after
forking this starter.

## MIT License Text

Several identified third-party components above are MIT-licensed. Their
copyright notices belong to their respective authors and projects.

Permission is hereby granted, free of charge, to any person obtaining a copy of
the MIT-licensed software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
