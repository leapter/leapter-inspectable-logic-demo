"use client";

/**
 * Unified blueprint client that branches on the project's runtime mode:
 *
 *   - "local"  → execute in-browser via @leapter/runtime-browser using
 *               the precompiled LogicFlowModel JSON written by
 *               `pnpm convert:blueprints`.
 *   - "remote" → call the existing Server Actions over HTTP, untouched.
 *
 * Each function mirrors the corresponding Server Action's return shape
 * so component call sites can migrate without restructuring their state.
 */

import {
  describeBlueprint as describeInBrowser,
  runBlueprint as runInBrowser,
  type LogicFlowModel,
} from "@leapter/runtime-browser";

import {
  checkBlueprintConnection as checkRemote,
  describeBlueprint as describeRemote,
  executeBlueprint as executeRemote,
  fetchModelDefinition as fetchRemote,
} from "@/app/actions/blueprint";
import type { ConnectionStatus, ModelDefinition, TraceData } from "@leapter/client";

import { getClientConfig, getProjectConfig } from "./runtime-config";

interface BlueprintManifest {
  blueprints: { slug: string; modelId?: string }[];
}

/**
 * Lazy-load the manifest. Both the manifest and per-blueprint JSON live
 * under the gitignored `web/src/leapter-blueprints/` dir, populated by
 * `pnpm convert:blueprints`. Loading lazily means a fresh checkout can
 * run `pnpm check-types` (or any tooling that doesn't go through
 * `predev` / `build`) before the convert step has produced output.
 */
async function loadManifest(): Promise<BlueprintManifest> {
  try {
    const mod = await import("@/leapter-blueprints/manifest.json");
    return (mod.default ?? mod) as BlueprintManifest;
  } catch {
    return { blueprints: [] };
  }
}

interface RuntimeContext {
  /** Project slug - used to look up the runtime mode in localStorage. */
  projectSlug: string;
  /** Project UUID - only needed for remote mode trace links and routing. */
  projectId?: string;
}

/**
 * Lazy-load a precompiled LogicFlowModel JSON. The dynamic-import template
 * is statically analyzable, so Next.js pre-bundles every JSON file under
 * the directory at build time. Errors here mean `pnpm convert:blueprints`
 * hasn't run or the slug is wrong - surface that, don't silently fall
 * back to remote.
 */
async function loadModel(slug: string): Promise<LogicFlowModel> {
  try {
    const mod = await import(`@/leapter-blueprints/${slug}.json`);
    return (mod.default ?? mod) as LogicFlowModel;
  } catch {
    throw new Error(
      `Blueprint "${slug}" not found in compiled output. ` +
        `Run \`pnpm convert:blueprints\` to convert blueprints.`,
    );
  }
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
    const model = await loadModel(blueprintSlug);
    const response = await runInBrowser(model, input);
    return {
      success: true,
      data: response.outputData,
      runId: response.runId,
      modelId: model.id,
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
    // Remote uses modelId, but the slug→modelId mapping lives in our
    // local manifest too - look it up so callers don't need to track it.
    const manifest = await loadManifest();
    const entry = manifest.blueprints.find((b) => b.slug === blueprintSlug);
    const modelIdOrSlug = entry?.modelId ?? blueprintSlug;
    return fetchRemote(modelIdOrSlug, override(ctx));
  }

  try {
    const model = (await loadModel(blueprintSlug)) as unknown as ModelDefinition;
    return { success: true, model };
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

  // Local mode: blueprint exists if it's in the precompiled manifest.
  // No network, no errors to report - the runtime is the page itself.
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
    const model = await loadModel(blueprintSlug);
    const description = describeInBrowser(model);
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
