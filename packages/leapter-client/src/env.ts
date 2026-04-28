import type { LeapterClientConfig } from "./types";

const LOCAL_RUNTIME_BASE = "http://localhost:4004";

/**
 * Create client config from environment variables.
 *
 * Reads LEAPTER_RUNTIME_URL (falls back to localhost:4004) and
 * LEAPTER_API_KEY.
 *
 * When using multi-project serve, prefer passing the project-specific URL
 * via getClientConfig() instead of relying on this fallback.
 */
export function configFromEnv(projectSlug?: string): LeapterClientConfig {
  const envUrl = process.env.LEAPTER_RUNTIME_URL;
  const url = envUrl ?? `${LOCAL_RUNTIME_BASE}/api/v1/_/${projectSlug ?? "_"}`;
  return {
    runtimeUrl: url,
    apiKey: process.env.LEAPTER_API_KEY,
  };
}
