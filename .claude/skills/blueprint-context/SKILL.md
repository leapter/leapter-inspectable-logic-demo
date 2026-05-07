---
name: blueprint-context
description: Automatically check what the user is looking at in the Leapter blueprint viewer and use MCP tools to show/compare blueprints.
version: '1.0.0'
globs:
  - '**/*.logic.vts'
triggers:
  - add description
  - modify node
  - change node
  - update node
  - edit node
  - selected node
  - this node
  - blueprint node
  - what node
  - which node
  - current node
  - the node
  - show blueprint
  - render blueprint
  - visualize blueprint
  - display blueprint
  - view blueprint
  - show diagram
  - compare blueprint
  - show differences
  - what changed
  - show changes
  - diff blueprint
priority: high
categories:
  - blueprint
  - context
---

# Blueprint Context & Visualization

## When to Use This Skill

When the user works with Leapter blueprints (.logic.vts files) and:

- Refers to a node without specifying which one (they're looking at it in the viewer)
- Asks to see, show, render, or visualize a blueprint
- Asks to compare two versions or see what changed

## MCP Tools (from `leapter-blueprints` server)

### `get_blueprint_context`

**When:** User refers to "this node", "the selected node", or asks to modify/describe a node without naming it.

Call this first to get the selected node's ID, label, type, file path, and Veritas source code block.

### `show_leapter_blueprint`

**When:** User asks to "show", "render", "visualize", or "display" a blueprint.

Pass the full `.logic.vts` file content as `veritasCode`. The blueprint renders as an interactive diagram in Claude Desktop or VS Code Copilot.

**Example flow:**

1. User: "show me the blueprint"
2. Read the `.logic.vts` file content
3. Call `show_leapter_blueprint` with the file content

### `compare_leapter_blueprints`

**When:** User asks to "compare", "show differences", "what changed", or "diff" between blueprint versions.

Pass `originalCode` (before) and `modifiedCode` (after). The viewer shows added/removed/modified nodes with visual indicators.

**Example flows:**

- "Show me what changed" → Use git to get the original version, read the current file, call `compare_leapter_blueprints`
- "Compare before and after my changes" → Same approach
- After making edits: "Show the diff" → Get the pre-edit version from git, current file content, call `compare_leapter_blueprints`

## Context Flow

1. User selects a node in the VS Code blueprint viewer
2. Extension writes selection to `~/.claude/leapter-context.json`
3. `get_blueprint_context` reads this file
4. You now know which node, file, and code block the user is referring to

## Important

- Always call `get_blueprint_context` before acting on blueprint requests that don't specify a node by name
- For `show_leapter_blueprint`: pass the **entire** `.logic.vts` file content, not just a snippet
- For `compare_leapter_blueprints`: both `originalCode` and `modifiedCode` must be complete `.logic.vts` files
- The viewer renders in Claude Desktop and VS Code Copilot Chat (requires `chat.mcp.apps.enabled: true`)
