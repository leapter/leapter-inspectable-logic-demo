"use client";

import { createContext, useContext } from "react";
import type { TraceData } from "@leapter/client";

export interface GlassRun {
  runId: string | undefined;
  modelId: string | undefined;
  traceData: TraceData | undefined;
  inputData: Record<string, unknown> | undefined;
  outputData: Record<string, unknown> | undefined;
}

export interface GlassContextValue {
  projectSlug: string;
  /** Blueprint slug - used to load the precompiled model JSON in local mode. */
  blueprintSlug: string;
  localProjectId?: string;
  run: GlassRun;
  showLogic: boolean;
  toggleLogic: () => void;
  openLogic: () => void;
  closeLogic: () => void;
  isWide: boolean;
  isRemote: boolean;
}

export const GlassContext = createContext<GlassContextValue | null>(null);

export function useGlassContext(): GlassContextValue | null {
  return useContext(GlassContext);
}
