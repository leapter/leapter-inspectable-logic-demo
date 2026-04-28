/**
 * Configuration for creating a Leapter runtime client.
 */
export interface LeapterClientConfig {
  /** Base runtime URL (e.g. http://localhost:4004/api/v1/_/_) */
  runtimeUrl: string;
  /** API key for authenticated runtimes */
  apiKey?: string;
  /**
   * Skip slug-to-UUID resolution — use slugs as model IDs directly.
   * Default: auto-detected (true when runtimeUrl points to localhost/127.0.0.1).
   */
  local?: boolean;
}

/**
 * A single event in a blueprint execution trace.
 */
export interface TraceEvent {
  id: string;
  modelId: string;
  callDepth: number;
  nodeId: string;
  event: string;
  timestamp: number;
  duration?: number;
  dataContext: {
    type: "full" | "patch";
    variables?: Record<string, unknown>;
    patch?: Array<{ op: string; path: string; value?: unknown }>;
  };
}

/**
 * Full trace data from a blueprint execution.
 */
export interface TraceData {
  trace: TraceEvent[];
  totalDuration: number;
}

/**
 * Result of a blueprint execution.
 */
export interface BlueprintResult<T = Record<string, unknown>> {
  outputData: T;
  runId?: string;
  /** Resolved model UUID (from slug→UUID resolution or slug passthrough) */
  modelId?: string;
  /** Execution trace — available when the runtime includes trace data in the response. */
  traceData?: TraceData;
}

/**
 * Parsed model definition from the runtime.
 * The `logicFlow` field contains node IDs matching trace events.
 */
export interface ModelDefinition {
  id: string;
  label?: string;
  modelType?: string;
  contentType?: string;
  /** The parsed logicFlow AST — same representation the runtime uses internally. */
  logicFlow: unknown;
  expressionLanguage?: string;
  settings?: Record<string, unknown>;
}

/**
 * Status of a blueprint connection check.
 */
export interface ConnectionStatus {
  reachable: boolean;
  blueprintFound: boolean;
  availableModels: string[];
  resolvedUrl: string;
  error?: string;
}

/**
 * Result of runtime discovery via Leapter Lab.
 */
export interface DiscoveryResult {
  success: boolean;
  runtimeUrl?: string;
  appspace?: string;
  projects?: Array<{ projectId: string; label?: string }>;
  error?: string;
}
