"use client";

/**
 * Per-project Leapter runtime configuration, backed by a persisted
 * zustand store. Components that need to react to config changes can
 * subscribe directly with `useRuntimeStore`. The exported imperative
 * helpers (`getProjectConfig`, `setProjectConfig`, `getClientConfig`,
 * `buildTraceUrl`) are for event handlers and server-action payloads
 * where a one-shot read is more convenient than a hook.
 *
 * Each project can be pointed at a local or remote runtime independently.
 * Local mode runs blueprints in the browser via `@leapter/runtime-browser`
 * - no URL, no API key, nothing to configure. Remote mode forwards the
 * resolved URL and API key from localStorage to the server action, which
 * hands them to the runtime client.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LeapterClientConfig } from "@leapter/client";

export interface RuntimeProjectConfig {
  mode: "local" | "remote";
  /** Lab URL (e.g. https://test.lab.leapter.com) — used for discovery */
  labUrl: string;
  /** Resolved runtime URL (auto-discovered via /cli/connect) */
  remoteUrl: string;
  apiKey: string;
}

const DEFAULT_CONFIG: RuntimeProjectConfig = {
  mode: "local",
  labUrl: "https://lab.leapter.com",
  remoteUrl: "",
  apiKey: "",
};

interface RuntimeStore {
  configs: Record<string, RuntimeProjectConfig>;
  setConfig: (slug: string, config: RuntimeProjectConfig) => void;
}

export const useRuntimeStore = create<RuntimeStore>()(
  persist(
    (set) => ({
      configs: {},
      setConfig: (slug, config) =>
        set((state) => ({
          configs: { ...state.configs, [slug]: config },
        })),
    }),
    {
      name: "leapter-runtime-config",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ configs: state.configs }),
    },
  ),
);

// ── Imperative helpers ─────────────────────────────────────────────────────

export function getProjectConfig(slug: string): RuntimeProjectConfig {
  return useRuntimeStore.getState().configs[slug] ?? DEFAULT_CONFIG;
}

export function setProjectConfig(slug: string, config: RuntimeProjectConfig) {
  useRuntimeStore.getState().setConfig(slug, config);
}

export function getAllConfigs(): Record<string, RuntimeProjectConfig> {
  return useRuntimeStore.getState().configs;
}

/**
 * Returns client config for the remote-runtime server action.
 *
 * Returns `undefined` for local mode (the in-browser runtime needs no
 * URL) and for remote mode when URL or API key are missing - the unified
 * runtime client treats `undefined` as "not configured" and short-
 * circuits with a clear error before any HTTP call goes out.
 *
 * `projectId` is unused today but kept on the signature so callers can
 * pass it forward without rewiring; future remote-routing logic may
 * branch on it.
 */
export function getClientConfig(
  slug: string,
  _projectId?: string,
): LeapterClientConfig | undefined {
  const config = getProjectConfig(slug);
  if (config.mode === "remote" && config.remoteUrl && config.apiKey) {
    return { runtimeUrl: config.remoteUrl, apiKey: config.apiKey };
  }
  return undefined;
}

/**
 * Build a trace URL for a given run - links into Leapter Lab's web UI
 * so the user can inspect the run alongside the blueprint diagram.
 *
 * Only meaningful in remote mode (when the run lives on the server). In
 * local mode the run only exists in the browser, so we return null and
 * callers omit the link.
 *
 * Format: {labBase}/home/projects/{projectId}/models/{modelId}#runs-{runId}
 */
export function buildTraceUrl(
  slug: string,
  runId: string,
  modelId: string,
  _localProjectId?: string,
): string | null {
  const config = getProjectConfig(slug);

  if (config.mode !== "remote" || !config.remoteUrl || !config.labUrl) {
    return null;
  }

  const segments = config.remoteUrl.replace(/\/$/, "").split("/");
  const projectId = segments[segments.length - 1];
  if (!projectId) return null;
  const labBase = config.labUrl.replace(/\/$/, "");
  return `${labBase}/home/projects/${projectId}/models/${modelId}#runs-${runId}`;
}
