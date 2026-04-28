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
 * Local mode talks to `localhost:4004` with an implicit project segment.
 * Remote mode forwards the resolved URL and API key from localStorage to
 * the server action, which hands them to the runtime client.
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
 * Returns client config for the server action.
 *
 * Remote mode → uses discovered URL (contains appspace/project UUIDs) + API key.
 * Local mode  → builds a per-project URL using the project UUID when available,
 *               falling back to the slug for unpushed projects.
 *
 * The runtime accepts both UUIDs and slugs as the project segment.
 * UUIDs are preferred because they're stable across renames.
 */
export function getClientConfig(
  slug: string,
  projectId?: string,
): LeapterClientConfig | undefined {
  const config = getProjectConfig(slug);
  if (config.mode === "remote" && config.remoteUrl && config.apiKey) {
    return { runtimeUrl: config.remoteUrl, apiKey: config.apiKey };
  }
  const projectSegment = projectId ?? slug;
  return { runtimeUrl: `http://localhost:4004/api/v1/_/${projectSegment}` };
}

/**
 * Build a trace URL for a given run.
 *
 * Format: {labBase}/home/projects/{projectId}/models/{modelId}#runs-{runId}
 *
 * Remote: projectId extracted from remoteUrl, labBase from config.
 * Local:  projectId passed explicitly, labBase is localhost:3000.
 */
export function buildTraceUrl(
  slug: string,
  runId: string,
  modelId: string,
  localProjectId?: string,
): string | null {
  const config = getProjectConfig(slug);

  if (config.mode === "remote" && config.remoteUrl && config.labUrl) {
    const segments = config.remoteUrl.replace(/\/$/, "").split("/");
    const projectId = segments[segments.length - 1];
    if (!projectId) return null;
    const labBase = config.labUrl.replace(/\/$/, "");
    return `${labBase}/home/projects/${projectId}/models/${modelId}#runs-${runId}`;
  }

  if (config.mode === "local" && localProjectId) {
    return `http://localhost:3000/home/projects/${localProjectId}/models/${modelId}#runs-${runId}`;
  }

  return null;
}
