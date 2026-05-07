// Core client
export { createLeapterClient } from "./client";
export type { LeapterClient } from "./client";

// Config helpers
export { configFromEnv } from "./env";

// Discovery
export { discoverRuntime } from "./discovery";

// Resolver (advanced — most users won't need these)
export { parseModelsFromSpec, clearResolverCache } from "./resolver";

// Types
export type {
  LeapterClientConfig,
  BlueprintResult,
  ConnectionStatus,
  DiscoveryResult,
  TraceEvent,
  TraceData,
  ModelDefinition,
} from "./types";

// Errors
export {
  LeapterError,
  AuthError,
  NotFoundError,
  NetworkError,
} from "./errors";
