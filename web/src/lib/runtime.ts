"use client";

/**
 * Unified blueprint client that branches on the project's runtime mode:
 *
 *   - "local"  → execute in-browser via @leapter/runtime-browser. The
 *               compiled `Project` (manifest + per-blueprint JSON) is
 *               fetched from `/blueprints/...`, written there at build
 *               time by `pnpm convert:blueprints`.
 *   - "remote" → call the existing Server Actions over HTTP, untouched.
 *
 * Each function mirrors the corresponding Server Action's return shape
 * so component call sites can migrate without restructuring their state.
 */

import {
  describeBlueprint as describeInBrowser,
  runBlueprint as runInBrowser,
  type Project,
} from "@leapter/runtime-browser";

import {
  checkBlueprintConnection as checkRemote,
  describeBlueprint as describeRemote,
  executeBlueprint as executeRemote,
  fetchModelDefinition as fetchRemote,
} from "@/app/actions/blueprint";
import type { ConnectionStatus, ModelDefinition, TraceData } from "@leapter/client";

import { getClientConfig, getProjectConfig } from "./runtime-config";

interface RuntimeContext {
  /** Project slug — used to look up the runtime mode in localStorage. */
  projectSlug: string;
  /** Project UUID — only needed for remote mode trace links and routing. */
  projectId?: string;
}

/**
 * Cache the assembled `Project` (and the manifest alone, for callers that
 * don't need the full blueprints) in production so we don't refetch on
 * every call. In dev we always fetch fresh — this is what gives the kit
 * hot reload on `.vts` saves without a page refresh, since JSON modules
 * don't HMR cleanly.
 */
let cachedManifest: Promise<Project["manifest"]> | null = null;
let cachedProject: Promise<Project> | null = null;

async function loadManifest(): Promise<Project["manifest"]> {
  if (process.env.NODE_ENV !== "production") {
    return fetchManifest();
  }
  // Drop the memoized promise on failure so a transient error
  // (e.g. mid-deploy stale CDN cache) doesn't pin the page to a
  // broken state until a hard refresh.
  return (cachedManifest ??= fetchManifest().catch((err) => {
    cachedManifest = null;
    throw err;
  }));
}

async function loadProject(): Promise<Project> {
  if (process.env.NODE_ENV !== "production") {
    return fetchProject();
  }
  // Also drop the manifest cache: a stale CDN-cached manifest
  // pointing at jsonPaths that no longer exist would otherwise keep
  // failing the same way on every retry.
  return (cachedProject ??= fetchProject().catch((err) => {
    cachedProject = null;
    cachedManifest = null;
    throw err;
  }));
}

async function fetchManifest(): Promise<Project["manifest"]> {
  const cacheMode =
    process.env.NODE_ENV === "production" ? "default" : "no-store";
  const res = await fetch("/blueprints/manifest.json", { cache: cacheMode });
  if (!res.ok) {
    throw new Error(
      `Failed to load blueprint manifest. ` +
        `Run \`pnpm convert:blueprints\` to generate it.`,
    );
  }
  return res.json();
}

async function fetchProject(): Promise<Project> {
  const cacheMode =
    process.env.NODE_ENV === "production" ? "default" : "no-store";
  // Reuse loadManifest so the prod manifest cache is shared.
  const manifest = await loadManifest();
  const modelEntries = await Promise.all(
    manifest.blueprints.map(async (b) => {
      const res = await fetch(`/blueprints/${b.jsonPath ?? `${b.slug}.json`}`, {
        cache: cacheMode,
      });
      if (!res.ok) {
        throw new Error(`Failed to load blueprint "${b.slug}".`);
      }
      return [b.slug, await res.json()] as const;
    }),
  );
  const helpers = await Promise.all(
    manifest.blueprints.flatMap((b) =>
      (b.helpers ?? []).map(async (h) => {
        const res = await fetch(`/blueprints/${h.jsonPath}`, {
          cache: cacheMode,
        });
        if (!res.ok) {
          throw new Error(`Failed to load helper blueprint "${h.jsonPath}".`);
        }
        return res.json();
      }),
    ),
  );
  return {
    manifest,
    models: Object.fromEntries(modelEntries),
    ...(helpers.length > 0 ? { helpers } : {}),
  };
}

function isLocal(ctx: RuntimeContext): boolean {
  return getProjectConfig(ctx.projectSlug).mode === "local";
}

function override(ctx: RuntimeContext) {
  return getClientConfig(ctx.projectSlug, ctx.projectId);
}

// ── Execution ──────────────────────────────────────────────────────────────

export type RunBlueprintResult =
  | {
      success: true;
      data: Record<string, unknown>;
      runId?: string;
      modelId?: string;
      traceData?: TraceData;
    }
  | {
      success: false;
      error: string;
      runId?: string;
      modelId?: string;
    };

export async function runBlueprint(
  ctx: RuntimeContext,
  blueprintSlug: string,
  input: Record<string, unknown>,
): Promise<RunBlueprintResult> {
  if (!isLocal(ctx)) {
    return executeRemote(blueprintSlug, input, override(ctx));
  }

  try {
    const project = await loadProject();
    const response = await runInBrowser(project, blueprintSlug, input);
    const entry = project.manifest.blueprints.find(
      (b) => b.slug === blueprintSlug,
    );
    return {
      success: true,
      data: response.outputData,
      runId: response.runId,
      modelId: entry?.modelId,
      // The browser runtime's TraceData shape matches what the HTTP
      // runtime returns; pass it through untyped so consumers don't
      // have to import two near-identical interfaces.
      traceData: response.traceData as unknown as TraceData,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Blueprint execution failed",
    };
  }
}

// ── Model definition (for the trace replay viewer) ─────────────────────────

export type ModelDefinitionResult =
  | { success: true; model: ModelDefinition }
  | { success: false; error: string };

export async function fetchModelDefinition(
  ctx: RuntimeContext,
  blueprintSlug: string,
): Promise<ModelDefinitionResult> {
  if (!isLocal(ctx)) {
    // Remote uses modelId; pull it from the manifest if we have one so
    // callers can keep working in slugs. The manifest is a *local*
    // build artefact (`pnpm convert:blueprints`), so on a fresh
    // checkout or in a remote-only deployment it may be missing —
    // fall back to the slug, which the server action also accepts.
    let entry: { modelId?: string } | undefined;
    try {
      const manifest = await loadManifest();
      entry = manifest.blueprints.find((b) => b.slug === blueprintSlug);
    } catch {
      // Manifest unavailable in this deployment; remote can still
      // resolve by slug below.
    }
    return fetchRemote(entry?.modelId ?? blueprintSlug, override(ctx));
  }

  try {
    const project = await loadProject();
    const model = project.models[blueprintSlug];
    if (!model) {
      return { success: false, error: `Blueprint "${blueprintSlug}" not found.` };
    }
    return { success: true, model: model as unknown as ModelDefinition };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load model",
    };
  }
}

// ── Connection check (powers the BlueprintStatus banner) ───────────────────

export async function checkBlueprint(
  ctx: RuntimeContext,
  blueprintSlug: string,
): Promise<ConnectionStatus> {
  if (!isLocal(ctx)) {
    return checkRemote(blueprintSlug, override(ctx));
  }

  // Local mode: blueprint exists if it's in the loaded manifest.
  // Manifest-only — no need to fetch every blueprint just to list slugs.
  const manifest = await loadManifest();
  const slugs = manifest.blueprints.map((b) => b.slug);
  return {
    reachable: true,
    blueprintFound: slugs.includes(blueprintSlug),
    availableModels: slugs,
    resolvedUrl: "in-browser",
  };
}

// ── Input schema description (for form option enums) ───────────────────────

export type DescribeBlueprintResult =
  | { success: true; inputProperties: Record<string, unknown> }
  | { success: false; error: string };

export async function describeBlueprintInputs(
  ctx: RuntimeContext,
  blueprintSlug: string,
): Promise<DescribeBlueprintResult> {
  if (!isLocal(ctx)) {
    return describeRemote(blueprintSlug, override(ctx));
  }

  try {
    const project = await loadProject();
    const description = describeInBrowser(project, blueprintSlug);
    const input = description.input as { properties?: Record<string, unknown> };
    return {
      success: true,
      inputProperties: input.properties ?? {},
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to describe blueprint",
    };
  }
}
