import type { DiscoveryResult } from "./types";

/**
 * Discover a remote Leapter runtime from a Lab URL + API key.
 *
 * Calls /api/v1/cli/connect to resolve the appspace, available projects,
 * and the runtime endpoint URL.
 */
export async function discoverRuntime(opts: {
  labUrl: string;
  apiKey: string;
}): Promise<DiscoveryResult> {
  const base = opts.labUrl.replace(/\/$/, "");
  const connectUrl = `${base}/api/v1/cli/connect`;

  try {
    const res = await fetch(connectUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": opts.apiKey,
      },
      body: JSON.stringify({ apiKey: opts.apiKey }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { success: false, error: "Invalid API key" };
      }
      return { success: false, error: `Server returned ${res.status}` };
    }

    const data = await res.json();
    const appspace: string = data.appspace;
    const projects: Array<{ projectId: string; label?: string }> =
      data.projects ?? [];
    const runtimeEndpoint: string | undefined = data.endpoints?.runtime;

    // Build runtime URL: {runtime}/api/v1/{appspace}/{projectId}
    let runtimeUrl: string | undefined;
    if (runtimeEndpoint && appspace && projects.length > 0) {
      const runtimeBase = runtimeEndpoint.replace(/\/$/, "");
      runtimeUrl = `${runtimeBase}/api/v1/${appspace}/${projects[0].projectId}`;
    }

    return { success: true, runtimeUrl, appspace, projects };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Discovery failed",
    };
  }
}
