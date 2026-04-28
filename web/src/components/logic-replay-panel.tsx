"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, X } from "lucide-react";
import Image from "next/image";
import { fetchModelDefinition } from "@/app/actions/blueprint";
import { getClientConfig } from "@/lib/runtime-config";
import { loadViewerScript } from "@/lib/load-viewer";
import { buildModelInvocation } from "@/lib/viewer-types";
import { buildTraceUrl } from "@/lib/runtime-config";
import { LogicViewerEmbed } from "./logic-viewer-embed";
import type { TraceData } from "@leapter/client";

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface LogicReplayPanelProps {
  projectSlug: string;
  runId: string | undefined;
  modelId: string | undefined;
  localProjectId?: string;
  traceData: TraceData | undefined;
  inputData: Record<string, unknown> | undefined;
  outputData: Record<string, unknown> | undefined;
  onClose?: () => void;
}

export function LogicReplayPanel({
  projectSlug,
  runId,
  modelId,
  localProjectId,
  traceData,
  inputData,
  outputData,
  onClose,
}: LogicReplayPanelProps) {
  const [modelJson, setModelJson] = useState<string | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fading, setFading] = useState(false);
  const loadedForModel = useRef<string | null>(null);
  const prevRunId = useRef<string | undefined>(undefined);

  // Shade out / shade in on every new run after the first — the trace
  // attribute updates while the viewer is dim, then fades back to full
  // opacity, so the user sees the update as a deliberate transition
  // instead of a jarring snap.
  useEffect(() => {
    const prev = prevRunId.current;
    prevRunId.current = runId;
    if (!runId || !viewerReady) return;
    if (prev === undefined || prev === runId) return;

    setFading(true);
    const t = setTimeout(() => setFading(false), 220);
    return () => clearTimeout(t);
  }, [runId, viewerReady]);

  // Load the viewer bundle + model JSON once per modelId. New runs against
  // the same model reuse the mounted viewer — only the `trace` attribute
  // changes — so the viewer's internal state stays intact across recalcs.
  useEffect(() => {
    if (!modelId) return;
    if (loadedForModel.current === modelId) return;
    loadedForModel.current = modelId;

    setLoading(true);
    setLoadError(null);

    const override = getClientConfig(projectSlug, localProjectId);
    Promise.all([loadViewerScript(), fetchModelDefinition(modelId, override)])
      .then(([, modelResult]) => {
        if (loadedForModel.current !== modelId) return;
        if (!modelResult.success) {
          setLoadError(modelResult.error);
          return;
        }
        setModelJson(utf8ToBase64(JSON.stringify(modelResult.model)));
        setViewerReady(true);
      })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : "Failed to load viewer");
      })
      .finally(() => setLoading(false));
  }, [modelId, projectSlug, localProjectId]);

  const traceAttr =
    viewerReady && inputData && outputData && runId && traceData
      ? utf8ToBase64(
          JSON.stringify(
            buildModelInvocation({
              runId,
              input: inputData,
              output: outputData,
              traceData,
            }),
          ),
        )
      : null;

  const labUrl =
    runId && modelId
      ? buildTraceUrl(projectSlug, runId, modelId, localProjectId)
      : null;

  const hasRun = Boolean(runId && modelId && traceData);

  return (
    <div
      className="
        flex h-full flex-col overflow-hidden rounded-xl
        bg-gradient-to-br from-[#FA4B00]/[0.04] via-[#B379FF]/[0.04] to-[#B379FF]/[0.02]
        border border-[#FA4B00]/15
      "
    >
      <div className="flex items-center gap-3 border-b border-border/40 bg-background/60 px-5 py-3 backdrop-blur-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FA4B00]/15 to-[#B379FF]/15 shrink-0">
          <Image
            src="/leapter-logo-icon.svg"
            alt=""
            width={18}
            height={18}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            No black box. Every step is auditable.
          </p>
          <p className="text-xs text-muted-foreground">
            {hasRun
              ? "This is the logic that produced your result."
              : "Submit the form to see the trace highlight the active path."}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close logic panel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative flex-1 bg-white min-h-[500px]">
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive max-w-sm">
              Could not load the logic viewer: {loadError}
            </div>
          </div>
        )}

        {!modelId && !loading && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-sm text-muted-foreground max-w-sm text-center">
              Fill in the form and calculate a premium — the diagram will load here with the executed path highlighted.
            </p>
          </div>
        )}

        {loading && !viewerReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin" />
              <p className="text-sm">Loading blueprint viewer...</p>
            </div>
          </div>
        )}

        {viewerReady && modelJson && (
          <div
            className="absolute inset-0 transition-[opacity,transform] duration-[220ms] ease-out will-change-[opacity,transform]"
            style={{
              opacity: fading ? 0.15 : 1,
              transform: fading ? "scale(0.995)" : "scale(1)",
            }}
          >
            <LogicViewerEmbed modelJson={modelJson} traceJson={traceAttr ?? undefined} />
          </div>
        )}
      </div>

      {labUrl && (
        <div className="border-t border-border/40 bg-background/60 px-5 py-2.5 backdrop-blur-sm">
          <a
            href={labUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Open in Leapter Lab
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
