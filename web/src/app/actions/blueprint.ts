"use server";

import {
  createLeapterClient,
  configFromEnv,
  discoverRuntime,
  LeapterError,
  type LeapterClientConfig,
  type ConnectionStatus,
} from "@leapter/client";

/**
 * Generic blueprint execution action.
 */
export async function executeBlueprint(
  modelSlug: string,
  input: Record<string, unknown>,
  config?: LeapterClientConfig,
) {
  const client = createLeapterClient(config ?? configFromEnv());
  try {
    const result = await client.run(modelSlug, input);
    return {
      success: true as const,
      data: result.outputData,
      runId: result.runId,
      modelId: result.modelId,
      traceData: result.traceData,
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Blueprint execution failed",
      runId: error instanceof LeapterError ? error.runId : undefined,
      modelId: error instanceof LeapterError ? error.modelId : undefined,
    };
  }
}

/**
 * Check if a blueprint is reachable on the given runtime.
 */
export async function checkBlueprintConnection(
  modelSlug: string,
  config?: LeapterClientConfig,
): Promise<ConnectionStatus> {
  const client = createLeapterClient(config ?? configFromEnv());
  return client.checkConnection(modelSlug);
}

/**
 * Fetch the parsed model JSON from the runtime.
 * Needed by the logic viewer to render the blueprint diagram.
 */
export async function fetchModelDefinition(
  modelId: string,
  config?: LeapterClientConfig,
) {
  const client = createLeapterClient(config ?? configFromEnv());
  try {
    const model = await client.getModel(modelId);
    return { success: true as const, model };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to fetch model",
    };
  }
}

/**
 * Discover remote runtime endpoint from a Lab URL + API key.
 */
export async function discoverRemote(labUrl: string, apiKey: string) {
  return discoverRuntime({ labUrl, apiKey });
}
