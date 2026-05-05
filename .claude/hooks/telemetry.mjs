#!/usr/bin/env node
/**
 * Claude Code hook → starter telemetry writer.
 *
 * Invoked from `.claude/settings.json` with the hook event name as
 * argv[2]. Reads the hook payload from stdin and appends one typed
 * event per line to `<projectRoot>/.leapter/telemetry.jsonl`.
 *
 * Wrapper that every line shares: { v: 1, ts, session, kind, data }.
 * The eight kinds in v1 are:
 *
 *   session.started           { node_version, os, arch }
 *   session.ended             { duration_ms?, prompt_count, tool_count }
 *   project.metadata          { leap_format, app_id, app_label,
 *                               app_description?, version, main }
 *   claude.prompt_submitted   { prompt, prompt_chars }
 *   claude.tool_used          { tool_name, tool_summary,
 *                               success?, error_summary? }
 *   claude.assistant_stopped  {}
 *   validation.completed      { passed, blueprint_count, error_count }
 *   blueprint.shape_changed   { slug, new_chars, old_chars? }
 *
 * Sanitization: absolute paths in tool summaries are collapsed to
 * basenames (POSIX + Windows); error_summary is truncated to 300
 * chars; nothing outside the project directory is read.
 *
 * Fail-safe: any error is swallowed and the script always exits 0,
 * so a misbehaving telemetry writer can never block Claude.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const SCHEMA_VERSION = 1;
const MAX_ERROR_SUMMARY_CHARS = 300;

async function main() {
  const eventName = process.argv[2] ?? "";
  if (!eventName) return;

  const payload = await readStdinJson();
  if (!payload) return;

  const sessionId =
    typeof payload.session_id === "string" ? payload.session_id : null;
  if (!sessionId) return;

  const cwd = typeof payload.cwd === "string" ? payload.cwd : process.cwd();
  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) return;

  const logPath = path.join(projectRoot, ".leapter", "telemetry.jsonl");

  switch (eventName) {
    case "SessionStart":
      handleSessionStart(logPath, projectRoot, sessionId);
      return;
    case "SessionEnd":
      handleSessionEnd(logPath, sessionId);
      return;
    case "UserPromptSubmit":
      handlePromptSubmitted(logPath, sessionId, payload);
      return;
    case "PostToolUse":
      handleToolUsed(logPath, projectRoot, sessionId, payload);
      return;
    case "Stop":
      handleAssistantStopped(logPath, sessionId);
      return;
    default:
      return;
  }
}

// ---------------------------------------------------------------------------
// Per-event handlers
// ---------------------------------------------------------------------------

function handleSessionStart(logPath, projectRoot, sessionId) {
  // SessionStart can fire on `resume` for an already-known session id.
  // Only emit the start + project metadata pair the first time.
  if (findFirstEventOfKind(logPath, sessionId, "session.started")) return;

  appendEvent(logPath, {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    session: sessionId,
    kind: "session.started",
    data: {
      node_version: process.version,
      os: process.platform,
      arch: process.arch,
    },
  });

  const manifest = readManifest(projectRoot);
  if (manifest) {
    appendEvent(logPath, {
      v: SCHEMA_VERSION,
      ts: new Date().toISOString(),
      session: sessionId,
      kind: "project.metadata",
      data: manifest,
    });
  }
}

function handleSessionEnd(logPath, sessionId) {
  // Compute summary from what's already in the log for this session.
  // SessionEnd only fires once per session, so no dedupe needed.
  const summary = summarizeSession(logPath, sessionId);
  appendEvent(logPath, {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    session: sessionId,
    kind: "session.ended",
    data: summary,
  });
}

function handlePromptSubmitted(logPath, sessionId, payload) {
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
  if (!prompt) return;
  appendEvent(logPath, {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    session: sessionId,
    kind: "claude.prompt_submitted",
    data: { prompt, prompt_chars: prompt.length },
  });
}

function handleToolUsed(logPath, projectRoot, sessionId, payload) {
  const toolName =
    typeof payload.tool_name === "string" ? payload.tool_name : "unknown";
  const toolInput =
    payload.tool_input && typeof payload.tool_input === "object"
      ? payload.tool_input
      : {};
  const toolResponse = payload.tool_response;
  const summary = summarizeTool(toolName, toolInput);
  const success = deriveSuccess(toolResponse);
  const errorSummary = success === false ? extractErrorSummary(toolResponse) : null;

  const data = { tool_name: toolName, tool_summary: summary };
  if (success !== undefined) data.success = success;
  if (errorSummary) data.error_summary = errorSummary;

  appendEvent(logPath, {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    session: sessionId,
    kind: "claude.tool_used",
    data,
  });

  // Specialised follow-up events derived from this tool call.
  if (toolName === "Bash" && isLeapterValidateCommand(toolInput.command)) {
    const validation = parseValidateOutput(toolResponse);
    if (validation) {
      appendEvent(logPath, {
        v: SCHEMA_VERSION,
        ts: new Date().toISOString(),
        session: sessionId,
        kind: "validation.completed",
        data: validation,
      });
    }
  }

  if (
    (toolName === "Edit" ||
      toolName === "Write" ||
      toolName === "MultiEdit") &&
    typeof toolInput.file_path === "string" &&
    toolInput.file_path.endsWith(".logic.vts")
  ) {
    emitShapeChanged(logPath, projectRoot, sessionId, toolInput.file_path);
  }
}

function handleAssistantStopped(logPath, sessionId) {
  appendEvent(logPath, {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    session: sessionId,
    kind: "claude.assistant_stopped",
    data: {},
  });
}

// ---------------------------------------------------------------------------
// blueprint.shape_changed
// ---------------------------------------------------------------------------

function emitShapeChanged(logPath, projectRoot, sessionId, filePath) {
  const slug = path.basename(filePath).replace(/\.logic\.vts$/, "");
  let newChars;
  try {
    newChars = fs.readFileSync(filePath, "utf-8").length;
  } catch {
    // File may have been deleted/renamed; skip.
    return;
  }

  const oldChars = findMostRecentShapeForSlug(logPath, sessionId, slug);
  const data = { slug, new_chars: newChars };
  if (oldChars !== null) data.old_chars = oldChars;

  appendEvent(logPath, {
    v: SCHEMA_VERSION,
    ts: new Date().toISOString(),
    session: sessionId,
    kind: "blueprint.shape_changed",
    data,
  });

  // Avoid the unused-arg warning while keeping projectRoot in the
  // signature for future per-project logic (e.g. per-project caps).
  void projectRoot;
}

function findMostRecentShapeForSlug(logPath, sessionId, slug) {
  const events = readEvents(logPath);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (
      event.session === sessionId &&
      event.kind === "blueprint.shape_changed" &&
      event.data?.slug === slug &&
      typeof event.data?.new_chars === "number"
    ) {
      return event.data.new_chars;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// validation.completed
// ---------------------------------------------------------------------------

function isLeapterValidateCommand(cmd) {
  if (typeof cmd !== "string") return false;
  // Match `leapter validate`, `./.leapter-tools/cli/leapter validate`, etc.
  return /(^|[\s/])leapter\s+validate(\s|$)/.test(cmd);
}

/**
 * Parse stdout from `leapter validate` for pass/fail and counts.
 * The CLI prints either "<N> blueprint(s) — all valid (...)" or
 * "<E> with errors, <V> valid (...)". Both forms are matched here.
 * Returns null if neither form is present (e.g. "No .vts files").
 */
function parseValidateOutput(toolResponse) {
  const text = extractToolOutputText(toolResponse);
  if (!text) return null;

  const allValid = text.match(/(\d+)\s+blueprint\(s\)\s*[—-]\s*all\s+valid/);
  if (allValid) {
    return {
      passed: true,
      blueprint_count: Number.parseInt(allValid[1], 10),
      error_count: 0,
    };
  }
  const withErrors = text.match(/(\d+)\s+with\s+errors(?:,\s+(\d+)\s+valid)?/);
  if (withErrors) {
    const errors = Number.parseInt(withErrors[1], 10);
    const valid = withErrors[2] ? Number.parseInt(withErrors[2], 10) : 0;
    return {
      passed: false,
      blueprint_count: errors + valid,
      error_count: errors,
    };
  }
  return null;
}

function extractToolOutputText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (typeof response !== "object") return "";
  if (typeof response.output === "string") return response.output;
  if (typeof response.stdout === "string") return response.stdout;
  if (typeof response.content === "string") return response.content;
  // tool_response from Bash may also have stderr; append for completeness.
  let collected = "";
  if (typeof response.stdout === "string") collected += response.stdout;
  if (typeof response.stderr === "string") collected += response.stderr;
  return collected;
}

// ---------------------------------------------------------------------------
// session.ended summary
// ---------------------------------------------------------------------------

function summarizeSession(logPath, sessionId) {
  let promptCount = 0;
  let toolCount = 0;
  let firstTs = null;

  for (const event of readEvents(logPath)) {
    if (event.session !== sessionId) continue;
    if (event.kind === "claude.prompt_submitted") promptCount += 1;
    if (event.kind === "claude.tool_used") toolCount += 1;
    if (event.kind === "session.started" && typeof event.ts === "string") {
      firstTs = event.ts;
    }
  }

  const data = { prompt_count: promptCount, tool_count: toolCount };
  if (firstTs) {
    const startMs = Date.parse(firstTs);
    if (Number.isFinite(startMs)) data.duration_ms = Date.now() - startMs;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function readStdinJson() {
  try {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf-8").trim();
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Resolve the Leapter project root for a given Claude cwd.
 *
 * Two strategies, in order:
 *   1. Walk up. Handles the case where Claude was launched inside the
 *      project (e.g. `~/dev/git/leapter-starter-nextjs/leapter/` or any
 *      subdir of it).
 *   2. Walk down by one step into `leapter/`. The starter is documented
 *      for users to launch Claude at the repo root, where the project
 *      sits at `<root>/leapter/leapter.project`. Without this branch,
 *      no events would be captured for that recommended flow.
 *
 * Returns null when neither strategy locates a `leapter.project`.
 */
function findProjectRoot(startDir) {
  const start = path.resolve(startDir);
  const home = os.homedir();

  // Up-walk.
  let dir = start;
  while (true) {
    if (fs.existsSync(path.join(dir, "leapter.project"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir || dir === home) break;
    dir = parent;
  }

  // Down-step into the starter-convention location.
  const downCandidate = path.join(start, "leapter");
  if (fs.existsSync(path.join(downCandidate, "leapter.project"))) {
    return downCandidate;
  }
  return null;
}

function readManifest(projectRoot) {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(projectRoot, "leapter.project"), "utf-8"),
    );
    if (!raw || typeof raw !== "object") return null;
    const app = raw.app && typeof raw.app === "object" ? raw.app : {};
    // app_id should always be a UUID after `leapter init`. Anything else
    // means the manifest was hand-crafted or truncated; skip emitting
    // project.metadata rather than feed schema-violating data downstream.
    if (typeof app.id !== "string" || app.id.length === 0) return null;
    const data = {
      leap_format: typeof raw.leapFormat === "number" ? raw.leapFormat : 1,
      app_id: app.id,
      app_label: typeof app.label === "string" ? app.label : "",
      version: typeof raw.version === "string" ? raw.version : "",
      main: typeof raw.main === "string" ? raw.main : "",
    };
    if (typeof app.description === "string") {
      data.app_description = app.description;
    }
    return data;
  } catch {
    return null;
  }
}

function readEvents(logPath) {
  let raw;
  try {
    raw = fs.readFileSync(logPath, "utf-8");
  } catch {
    return [];
  }
  const events = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      continue;
    }
  }
  return events;
}

function findFirstEventOfKind(logPath, sessionId, kind) {
  for (const event of readEvents(logPath)) {
    if (event.session === sessionId && event.kind === kind) return event;
  }
  return null;
}

function summarizeTool(toolName, input) {
  switch (toolName) {
    case "Bash":
      return sanitizePaths(typeof input.command === "string" ? input.command : "");
    case "Read":
    case "Write":
    case "Edit":
    case "NotebookEdit": {
      const filePath =
        typeof input.file_path === "string" ? input.file_path : "";
      return `${toolName.toLowerCase()} ${lastPathSegment(filePath)}`;
    }
    case "MultiEdit": {
      const filePath =
        typeof input.file_path === "string" ? input.file_path : "";
      const count = Array.isArray(input.edits) ? input.edits.length : 0;
      return `multi-edit ${lastPathSegment(filePath)} (${count} change${count === 1 ? "" : "s"})`;
    }
    case "Grep":
      return `grep ${quote(input.pattern)}`;
    case "Glob":
      return `glob ${quote(input.pattern)}`;
    default:
      return toolName;
  }
}

/**
 * Replace anything that looks like an absolute path with its last
 * segment. Handles POSIX (`/Users/foo/bar`) and Windows drive-letter
 * paths (`C:\Users\foo\bar`, also `C:/Users/...`). UNC paths
 * (`\\server\share\...`) are not redacted, since they're rare enough
 * that we accept the gap.
 *
 * Order matters: the Windows pattern runs first so its trailing
 * `[\\/][...]+` portion isn't re-matched as a POSIX path on the
 * second pass.
 *
 * `path.basename` would not work for Windows paths when this script
 * runs on POSIX (no `\` separator awareness), so we extract the last
 * segment manually based on whichever separator appears last.
 */
function sanitizePaths(text) {
  return text
    .replace(/[A-Za-z]:[\\/][^\s'"`)]+/g, lastPathSegment)
    .replace(/\/[^\s'"`)]+/g, lastPathSegment);
}

function lastPathSegment(match) {
  const lastSlash = Math.max(match.lastIndexOf("/"), match.lastIndexOf("\\"));
  return lastSlash >= 0 ? match.slice(lastSlash + 1) : match;
}

function quote(value) {
  if (typeof value !== "string") return '""';
  return `"${value}"`;
}

function deriveSuccess(response) {
  if (!response || typeof response !== "object") return undefined;
  if (typeof response.is_error === "boolean") return !response.is_error;
  if (typeof response.success === "boolean") return response.success;
  return undefined;
}

function extractErrorSummary(response) {
  const text = extractToolOutputText(response);
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.length <= MAX_ERROR_SUMMARY_CHARS) return trimmed;
  return trimmed.slice(0, MAX_ERROR_SUMMARY_CHARS);
}

function appendEvent(logPath, event) {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    // POSIX guarantees atomic appends only up to PIPE_BUF (~4 KB on
    // macOS, ~64 KB on Linux). v1 events all sit comfortably below
    // that, so concurrent hook invocations writing to the same file
    // won't interleave bytes in practice. If we later add a kind
    // that carries large payloads (e.g. embedded blueprint source),
    // revisit this with file locking or write-then-rename.
    fs.appendFileSync(logPath, JSON.stringify(event) + "\n", "utf-8");
  } catch {
    // swallow
  }
}

main();
