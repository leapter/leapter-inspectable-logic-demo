import type {
  LeapterClientConfig,
  BlueprintResult,
  ConnectionStatus,
  ModelDefinition,
} from "./types";
import {
  LeapterError,
  AuthError,
  NotFoundError,
  NetworkError,
} from "./errors";
import { resolveModelId, parseModelsFromSpec } from "./resolver";

// ── Public interface ──────────────────────────────────────────────────────────

export interface LeapterClient {
  /** Execute a blueprint and return its output. */
  run<TInput = Record<string, unknown>, TOutput = Record<string, unknown>>(
    modelSlug: string,
    input: TInput,
  ): Promise<BlueprintResult<TOutput>>;

  /** Fetch the OpenAPI spec from the runtime. */
  describe(): Promise<unknown>;

  /** Check if the runtime is reachable and a specific blueprint exists. */
  checkConnection(modelSlug: string): Promise<ConnectionStatus>;

  /**
   * Fetch the parsed model JSON. Accepts either a model UUID or a slug;
   * slugs are resolved to UUIDs via the runtime's OpenAPI spec the same
   * way `run()` does, so callers don't need to know the URL conventions
   * of remote runtimes.
   */
  getModel(slugOrId: string): Promise<ModelDefinition>;

  /** The resolved configuration (frozen). */
  readonly config: Readonly<LeapterClientConfig>;
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createLeapterClient(
  config: LeapterClientConfig,
): LeapterClient {
  const isLocal =
    config.local ??
    (config.runtimeUrl.includes("localhost") ||
      config.runtimeUrl.includes("127.0.0.1"));

  const frozenConfig = Object.freeze({ ...config, local: isLocal });

  function buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["X-API-Key"] = config.apiKey;
    }
    return headers;
  }

  async function getModelId(
    slug: string,
    headers: Record<string, string>,
  ): Promise<string> {
    if (isLocal) return slug;
    return resolveModelId(slug, config.runtimeUrl, headers);
  }

  return {
    config: frozenConfig,

    async run<TInput, TOutput>(
      modelSlug: string,
      input: TInput,
    ): Promise<BlueprintResult<TOutput>> {
      const headers = buildHeaders();

      let modelId: string;
      try {
        modelId = await getModelId(modelSlug, headers);
      } catch {
        modelId = modelSlug;
      }

      let res: Response;
      try {
        res = await fetch(`${config.runtimeUrl}/models/${modelId}/runs`, {
          method: "POST",
          headers,
          body: JSON.stringify(input),
          cache: "no-store",
        });
      } catch {
        throw new NetworkError(
          `Cannot reach runtime at ${config.runtimeUrl}`,
          { slug: modelSlug },
        );
      }

      const runId = res.headers.get("X-Run-Id") ?? undefined;

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const errorOpts = { status: res.status, runId, modelId, slug: modelSlug };

        if (res.status === 401 || res.status === 403) {
          throw new AuthError(
            `Authentication failed for "${modelSlug}": ${body}`,
            errorOpts,
          );
        }
        if (res.status === 404) {
          throw new NotFoundError(
            `Blueprint "${modelSlug}" not found: ${body}`,
            errorOpts,
          );
        }
        throw new LeapterError(
          `Blueprint "${modelSlug}" failed (${res.status}): ${body}`,
          errorOpts,
        );
      }

      const responseBody = await res.json();
      return { ...responseBody, runId, modelId };
    },

    async describe(): Promise<unknown> {
      const headers: Record<string, string> = {};
      if (config.apiKey) {
        headers["X-API-Key"] = config.apiKey;
      }

      let res: Response;
      try {
        res = await fetch(`${config.runtimeUrl}/openapi`, {
          headers,
          cache: "no-store",
        });
      } catch {
        throw new NetworkError(
          `Cannot reach runtime at ${config.runtimeUrl}`,
        );
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new AuthError("Authentication failed fetching OpenAPI spec");
        }
        throw new LeapterError(
          `Failed to fetch OpenAPI spec (${res.status})`,
          { status: res.status },
        );
      }

      return res.json();
    },

    async checkConnection(modelSlug: string): Promise<ConnectionStatus> {
      try {
        const spec = await this.describe();
        const models = parseModelsFromSpec(spec);
        const slugs = models.map((m) => m.slug);
        const normalize = (s: string) => s.replace(/-/g, "_");
        const normalized = normalize(modelSlug);
        const found = models.some(
          (m) =>
            m.slug === modelSlug ||
            m.modelId === modelSlug ||
            normalize(m.slug) === normalized,
        );

        return {
          reachable: true,
          blueprintFound: found,
          availableModels: slugs,
          resolvedUrl: config.runtimeUrl,
        };
      } catch (error) {
        if (error instanceof AuthError) {
          return {
            reachable: true,
            blueprintFound: false,
            availableModels: [],
            resolvedUrl: config.runtimeUrl,
            error: "Authentication failed — check your API key",
          };
        }

        const msg =
          error instanceof Error ? error.message : "Connection failed";
        return {
          reachable: false,
          blueprintFound: false,
          availableModels: [],
          resolvedUrl: config.runtimeUrl,
          error:
            msg.includes("fetch failed") || msg.includes("ECONNREFUSED")
              ? "Cannot reach runtime server"
              : msg,
        };
      }
    },

    async getModel(slugOrId: string): Promise<ModelDefinition> {
      const headers = buildHeaders();

      // Mirror run()'s slug resolution. Local runtimes accept slugs in
      // the URL, so getModelId is a no-op there. Remote runtimes use
      // UUIDs in /models/{id} paths, so we translate via the OpenAPI
      // spec; on resolver failure we fall back to the input as-is so
      // an already-UUID input still works.
      let modelId: string;
      try {
        modelId = await getModelId(slugOrId, headers);
      } catch {
        modelId = slugOrId;
      }

      let res: Response;
      try {
        res = await fetch(`${config.runtimeUrl}/models/${modelId}`, {
          headers,
          cache: "no-store",
        });
      } catch {
        throw new NetworkError(
          `Cannot reach runtime at ${config.runtimeUrl}`,
          { modelId, slug: slugOrId },
        );
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const errorOpts = { status: res.status, modelId, slug: slugOrId };
        if (res.status === 404) {
          throw new NotFoundError(
            `Model "${slugOrId}" not found: ${body}`,
            errorOpts,
          );
        }
        throw new LeapterError(
          `Failed to fetch model "${slugOrId}" (${res.status}): ${body}`,
          errorOpts,
        );
      }

      return res.json();
    },
  };
}
