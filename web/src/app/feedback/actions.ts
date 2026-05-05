"use server";

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The starter ships a single Leapter project at `<repo>/leapter/`.
 * The Next.js dev server runs from `web/`, so we resolve the project
 * root relative to that. If the starter ever supports multiple
 * projects in the demo, this needs to become per-project. For the
 * single-blueprint MVP, one fixed path is enough.
 */
const PROJECT_ROOT = path.resolve(process.cwd(), "../leapter");
const TELEMETRY_DIR = path.join(PROJECT_ROOT, ".leapter");
const LOG_PATH = path.join(TELEMETRY_DIR, "telemetry.jsonl");
const SENT_PATH = path.join(TELEMETRY_DIR, "telemetry.sent");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "leapter.project");

/**
 * Dev-mode gate. The /feedback page already short-circuits with
 * `notFound()` outside dev, but Next.js server actions are addressable
 * independently. Anyone with the action reference can invoke them.
 * Each exported action checks this and silently returns empty / no-op
 * so the surface effectively doesn't exist outside dev.
 */
const DEV_MODE = process.env.NEXT_PUBLIC_LEAPTER_DEV_MODE !== "false";

// ---------------------------------------------------------------------------
// Session log
// ---------------------------------------------------------------------------

export interface SessionLogSummary {
  exists: boolean;
  /** Raw JSONL bytes. Exactly what would be sent if attached. */
  content: string;
  /** Byte length of `content` (utf-8). */
  bytes: number;
  /** sha256 hex digest of `content`. Shown in the preview. */
  sha256: string;
  /** Session id from the first parseable event line, if any. */
  sessionId: string | null;
  /** Number of well-formed event lines. */
  eventCount: number;
  /** Map from event kind to count. */
  eventsByKind: Record<string, number>;
}

const EMPTY_LOG: SessionLogSummary = {
  exists: false,
  content: "",
  bytes: 0,
  sha256: "",
  sessionId: null,
  eventCount: 0,
  eventsByKind: {},
};

export async function readSessionLog(): Promise<SessionLogSummary> {
  if (!DEV_MODE) return EMPTY_LOG;
  let content: string;
  try {
    content = fs.readFileSync(LOG_PATH, "utf-8");
  } catch {
    return EMPTY_LOG;
  }
  if (!content.trim()) return EMPTY_LOG;

  const bytes = Buffer.byteLength(content, "utf-8");
  const sha256 = crypto.createHash("sha256").update(content).digest("hex");

  let sessionId: string | null = null;
  let eventCount = 0;
  const eventsByKind: Record<string, number> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event: { kind?: unknown; session?: unknown };
    try {
      event = JSON.parse(trimmed) as typeof event;
    } catch {
      continue;
    }
    eventCount += 1;
    if (typeof event.kind === "string") {
      eventsByKind[event.kind] = (eventsByKind[event.kind] ?? 0) + 1;
    }
    if (sessionId === null && typeof event.session === "string") {
      sessionId = event.session;
    }
  }

  return {
    exists: true,
    content,
    bytes,
    sha256,
    sessionId,
    eventCount,
    eventsByKind,
  };
}

// ---------------------------------------------------------------------------
// Project snapshot (manifest + every .vts under logic/ and data/)
// ---------------------------------------------------------------------------

export interface ProjectSnapshotFile {
  /** Path relative to the project root, e.g. `logic/pizza-pricing/pizza-pricing.logic.vts`. */
  path: string;
  /** File contents, captured verbatim. */
  content: string;
  /** Byte length of `content`. */
  bytes: number;
}

export interface ProjectSnapshotSummary {
  exists: boolean;
  /** Contents of `leapter.project`. Empty when the manifest is missing. */
  manifest: string;
  /**
   * Byte length of `manifest` (utf-8). Pre-computed server-side because
   * the client component can't rely on Node's `Buffer` being polyfilled.
   */
  manifestBytes: number;
  files: readonly ProjectSnapshotFile[];
  /** Sum of manifest + every file in bytes. */
  totalBytes: number;
  /** sha256 hex digest over the canonical concatenation (path|content per file). */
  sha256: string;
}

const EMPTY_SNAPSHOT: ProjectSnapshotSummary = {
  exists: false,
  manifest: "",
  manifestBytes: 0,
  files: [],
  totalBytes: 0,
  sha256: "",
};

export async function readProjectSnapshot(): Promise<ProjectSnapshotSummary> {
  if (!DEV_MODE) return EMPTY_SNAPSHOT;
  let manifest = "";
  try {
    manifest = fs.readFileSync(MANIFEST_PATH, "utf-8");
  } catch {
    return EMPTY_SNAPSHOT;
  }

  const files: ProjectSnapshotFile[] = [];
  for (const subdir of ["logic", "data"]) {
    collectVtsFiles(path.join(PROJECT_ROOT, subdir), PROJECT_ROOT, files);
  }
  files.sort((a, b) => a.path.localeCompare(b.path));

  const manifestBytes = Buffer.byteLength(manifest, "utf-8");
  const filesBytes = files.reduce((sum, f) => sum + f.bytes, 0);
  const totalBytes = manifestBytes + filesBytes;

  // Canonical concatenation gives a stable hash even if file ordering
  // differs across runs. Use a NUL separator that can't appear inside
  // text content so the boundary is unambiguous.
  const hash = crypto.createHash("sha256");
  hash.update("leapter.project\0");
  hash.update(manifest);
  for (const f of files) {
    hash.update(`\0${f.path}\0`);
    hash.update(f.content);
  }

  return {
    exists: true,
    manifest,
    manifestBytes,
    files,
    totalBytes,
    sha256: hash.digest("hex"),
  };
}

function collectVtsFiles(
  dir: string,
  projectRoot: string,
  out: ProjectSnapshotFile[],
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectVtsFiles(full, projectRoot, out);
      continue;
    }
    if (!entry.name.endsWith(".vts")) continue;
    let content: string;
    try {
      content = fs.readFileSync(full, "utf-8");
    } catch {
      continue;
    }
    out.push({
      path: path.relative(projectRoot, full),
      content,
      bytes: Buffer.byteLength(content, "utf-8"),
    });
  }
}

// ---------------------------------------------------------------------------
// Send (stub)
// ---------------------------------------------------------------------------

export interface SendFeedbackInput {
  feedback: string;
  includeLog: boolean;
  includeProject: boolean;
}

export interface SendFeedbackResult {
  ok: boolean;
  error?: string;
}

export async function sendFeedback(
  input: SendFeedbackInput,
): Promise<SendFeedbackResult> {
  if (!DEV_MODE) return { ok: false, error: "Not available." };
  const trimmed = input.feedback.trim();
  if (
    trimmed.length === 0 &&
    !input.includeLog &&
    !input.includeProject
  ) {
    return {
      ok: false,
      error:
        "Add some feedback or tick at least one attachment before sending.",
    };
  }

  const sentAt = new Date().toISOString();
  const payload: Record<string, unknown> = { sent_at: sentAt };
  if (trimmed.length > 0) payload.feedback = trimmed;

  let attachedSession: string | null = null;
  let attachedSha: string | null = null;

  if (input.includeLog) {
    const log = await readSessionLog();
    if (log.exists) {
      payload.log = {
        session: log.sessionId,
        bytes: log.bytes,
        sha256: log.sha256,
        content: log.content,
      };
      attachedSession = log.sessionId;
      attachedSha = log.sha256;
    }
  }

  if (input.includeProject) {
    const project = await readProjectSnapshot();
    if (project.exists) {
      payload.project = {
        manifest: project.manifest,
        files: project.files,
        total_bytes: project.totalBytes,
        sha256: project.sha256,
      };
    }
  }

  const delivery = await deliverFeedback(payload);
  if (!delivery.ok) {
    return {
      ok: false,
      error:
        "We couldn't reach the feedback service right now. Please try again later.",
    };
  }

  // Only mark the session as sent after the payload actually landed.
  // Otherwise a failed POST would still suppress the next ask.
  if (attachedSession) {
    try {
      fs.writeFileSync(
        SENT_PATH,
        JSON.stringify(
          { session: attachedSession, sha256: attachedSha, sent_at: sentAt },
          null,
          2,
        ) + "\n",
        "utf-8",
      );
    } catch {
      // Marker is a nice-to-have; failing to write it must not block
      // the user-facing thank-you state.
    }
  }

  return { ok: true };
}

/**
 * Default ingest endpoint.
 */
const DEFAULT_FEEDBACK_ENDPOINT =
  "https://lab.leapter.com/api/starter-feedback";

interface DeliveryResult {
  ok: boolean;
  status?: number;
  reason?: string;
}

/**
 * POST the prepared payload to the configured ingest endpoint. Returns
 * a result so the caller can decide whether to surface failure to the
 * user. Server-side `console.warn` records the technical detail; the
 * user-facing message stays generic.
 */
async function deliverFeedback(
  payload: Record<string, unknown>,
): Promise<DeliveryResult> {
  const endpoint =
    process.env.LEAPTER_FEEDBACK_ENDPOINT?.trim() || DEFAULT_FEEDBACK_ENDPOINT;

  try {
    const body = JSON.stringify(payload);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(Buffer.byteLength(body, "utf-8")),
      },
      body,
      // The endpoint is fast and idempotent enough that we don't want a
      // hung connection to leave the user staring at a spinner.
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(
        `[feedback] ingest endpoint returned ${response.status}.`,
      );
      return { ok: false, status: response.status, reason: "non-2xx" };
    }
    return { ok: true, status: response.status };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      `[feedback] failed to reach ingest endpoint (${endpoint}).`,
      error,
    );
    return { ok: false, reason: "network" };
  }
}
