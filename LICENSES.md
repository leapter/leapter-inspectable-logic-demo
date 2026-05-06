# License Overview

This repository is a mixed-license starter.

## Summary

| Path / Artifact | License / Rights |
|---|---|
| `web/`, `packages/leapter-client/`, `leapter/`, `requirements/`, `AGENTS.md`, `CLAUDE.md`, `.claude/`, docs, examples, setup scripts | MIT License, except for separately noticed third-party assets and Leapter brand assets |
| `.leapter-tools/` | Leapter proprietary beta tooling |
| `packages/runtime-browser/` | Leapter proprietary beta tooling |
| Leapter names, logos, and brand assets | Leapter GmbH brand assets; not a general trademark or brand license |
| User-created `.logic.vts` files, requirements, generated app code, compiled Blueprint JSON, test cases, local traces, and other project artifacts | Owned by the user, subject to any third-party content the user includes |
| Third-party dependencies, fonts, and template assets | Governed by their own licenses; see `THIRD_PARTY_NOTICES.md` |

## MIT-Covered Starter Files

The MIT License applies to the starter application code, examples,
documentation, requirements, agent instructions, setup scripts, and the
`packages/leapter-client/` package, except where a file or directory has its
own license notice. Leapter names, logos, and brand assets are not licensed as
general-purpose MIT assets or as a trademark grant.

The included pizza-pricing Veritas file and tests are examples. You may copy,
modify, and use them under the starter's MIT license.

## Leapter Proprietary Beta Tooling

The bundled Leapter CLI/converter, browser runtime, and VS Code Blueprint
viewer are proprietary Leapter beta tooling. They are included so the local
demo can validate, view, convert, and execute the example logic without a
Leapter SaaS account.

Permitted beta uses:

- clone, fork, install, and run this starter;
- use the bundled tooling for local development, evaluation, testing, and
  non-production demos;
- use the bundled tooling in CI or local automation for this starter;
- cache or include the bundled tooling as part of ordinary development,
  evaluation, or non-production demo environments for this starter;
- create, edit, validate, convert, view, and execute Veritas logic files for
  projects based on this starter;
- share or redistribute this starter, including modified MIT-covered files, as
  long as the Leapter proprietary tooling notices remain intact.

Except to the extent such restrictions are prohibited by applicable law, the
following uses are not permitted without written permission from Leapter GmbH:

- modifying the proprietary tooling;
- reverse engineering, decompiling, or extracting the proprietary tooling;
- repackaging the proprietary tooling as a standalone product or SDK;
- using the proprietary tooling to build competing tooling, runtimes, viewers,
  hosted services, or language implementations;
- production use of the proprietary tooling outside an agreement with Leapter
  GmbH.

## User-Created Artifacts

You own the artifacts you create with this starter, including your requirements,
Veritas `.logic.vts` files, generated app code, compiled Blueprint JSON, test
cases, local traces, screenshots, and project-specific documentation, subject
to any third-party content you include.

Leapter claims no ownership in those user-created artifacts.

Outputs and project artifacts generated through permitted use are not
derivative works of the proprietary beta tooling solely because that tooling
validates, converts, views, executes, or traces them.

## Third-Party Dependencies

This starter uses third-party packages and assets. Those dependencies are
governed by their own licenses. See `THIRD_PARTY_NOTICES.md` for bundled
third-party notices identified in this repository.

Before redistributing a production derivative or packaged build, review
third-party license obligations for your dependency set, bundled assets, and
deployment target.

## Open-Source Posture

Please do not describe the whole starter or the Leapter platform as open
source. The starter includes MIT-covered files and proprietary Leapter beta
tooling. Leapter is still deciding the long-term open-source shape of Veritas,
local runtime, and viewer tooling.
