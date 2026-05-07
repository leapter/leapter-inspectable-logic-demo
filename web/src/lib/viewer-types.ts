/**
 * Types for the <leapter-logic-viewer> web component's `trace` attribute.
 * The viewer expects a base64-encoded ModelInvocation JSON.
 */

import type { TraceData } from "@leapter/client";

/**
 * ModelInvocation — the shape the viewer's `trace` attribute expects
 * (base64-encoded JSON). Matches the genielabs `ModelInvocation` type.
 */
export interface ModelInvocation {
  id: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  meta: {
    duration: number;
    traceData: TraceData;
  };
}

/**
 * Build a ModelInvocation from the pieces returned by executeBlueprint.
 */
export function buildModelInvocation(params: {
  runId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  traceData: TraceData;
}): ModelInvocation {
  return {
    id: params.runId,
    input: params.input,
    output: params.output,
    meta: {
      duration: params.traceData.totalDuration,
      traceData: params.traceData,
    },
  };
}
