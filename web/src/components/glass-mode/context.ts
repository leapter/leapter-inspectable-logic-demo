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
  localProjectId?: string;
  run: GlassRun;
  debugMode: boolean;
  toggleDebug: () => void;
  showLogic: boolean;
  openLogic: () => void;
  closeLogic: () => void;
  logicEverOpened: boolean;
  isWide: boolean;
  /** True when the project is configured to talk to a remote runtime.
   *  Remote mode short-circuits the split-pane replay and opens the run
   *  in Leapter Lab instead. */
  isRemote: boolean;
}

export const GlassContext = createContext<GlassContextValue | null>(null);

export function useGlassContext(): GlassContextValue | null {
  return useContext(GlassContext);
}
