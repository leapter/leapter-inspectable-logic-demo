"use client";

import { useCallback, useRef, useState } from "react";
import { PanelRight, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/use-media-query";
import { LogicReplayPanel } from "@/components/logic-replay-panel";
import { buildTraceUrl, useRuntimeStore } from "@/lib/runtime-config";
import { DebugPortal } from "./debug-portal";
import {
  GlassContext,
  useGlassContext,
  type GlassRun,
} from "./context";

const SPLIT_MIN = 30;
const SPLIT_MAX = 80;
const SPLIT_DEFAULT = 50;

export function GlassModeImpl({
  children,
  projectSlug,
  localProjectId,
  run,
  accentColor,
}: {
  children: React.ReactNode;
  projectSlug: string;
  localProjectId?: string;
  run: GlassRun;
  accentColor?: string;
}) {
  const [showLogic, setShowLogic] = useState(false);
  const isWide = useMediaQuery("(min-width: 1024px)");
  const isRemote = useRuntimeStore(
    (s) => s.configs[projectSlug]?.mode === "remote",
  );

  const effectiveShowLogic = showLogic && !isRemote;

  const [leftWidthPct, setLeftWidthPct] = useState(SPLIT_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsResizing(true);
  }, []);

  const onResizeMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isResizing || !shellRef.current) return;
      const rect = shellRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftWidthPct(Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, pct)));
    },
    [isResizing],
  );

  const endResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setIsResizing(false);
  }, []);

  const onResizeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setLeftWidthPct((p) => Math.max(SPLIT_MIN, p - step));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setLeftWidthPct((p) => Math.min(SPLIT_MAX, p + step));
      } else if (e.key === "Home") {
        e.preventDefault();
        setLeftWidthPct(SPLIT_MIN);
      } else if (e.key === "End") {
        e.preventDefault();
        setLeftWidthPct(SPLIT_MAX);
      }
    },
    [],
  );

  const toggleLogic = () => {
    if (isRemote && !showLogic) {
      if (!run.runId || !run.modelId) return;
      const url = buildTraceUrl(
        projectSlug,
        run.runId,
        run.modelId,
        localProjectId,
      );
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setShowLogic((prev) => !prev);
  };
  const openLogic = () => {
    if (isRemote) {
      if (!run.runId || !run.modelId) return;
      const url = buildTraceUrl(
        projectSlug,
        run.runId,
        run.modelId,
        localProjectId,
      );
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    setShowLogic(true);
  };
  const closeLogic = () => setShowLogic(false);

  const splitOpen = effectiveShowLogic && isWide;
  const leftWidth = splitOpen ? `${leftWidthPct}%` : "100%";
  const rightWidth = splitOpen ? `${100 - leftWidthPct}%` : "0%";
  const accentStyle = accentColor
    ? ({ "--app-accent": accentColor } as React.CSSProperties)
    : undefined;

  return (
    <GlassContext.Provider
      value={{
        projectSlug,
        localProjectId,
        run,
        showLogic: effectiveShowLogic,
        toggleLogic,
        openLogic,
        closeLogic,
        isWide,
        isRemote,
      }}
    >
      <div
        ref={shellRef}
        style={accentStyle}
        className={cn(
          "flex-1 min-h-0 flex overflow-hidden",
          isResizing && "select-none",
        )}
      >
        <div
          className={cn(
            "relative z-20 h-full overflow-y-auto scrollbar-subtle",
            !isResizing && "transition-[width] duration-500 ease-out",
          )}
          style={{ width: leftWidth }}
        >
          <div className="mx-auto w-full max-w-4xl px-6 py-10 space-y-8">
            {children}
          </div>
        </div>

        {splitOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize logic panel"
            aria-valuenow={Math.round(leftWidthPct)}
            aria-valuemin={SPLIT_MIN}
            aria-valuemax={SPLIT_MAX}
            tabIndex={0}
            onPointerDown={startResize}
            onPointerMove={onResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            onKeyDown={onResizeKeyDown}
            className={cn(
              "group relative h-full w-0 shrink-0 cursor-col-resize z-30 outline-none",
              "focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent)]",
            )}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 -left-2 -right-2"
            />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "h-10 w-[3px] rounded-full bg-border",
                "transition-colors duration-200",
                "group-hover:bg-muted-foreground/60",
                isResizing && "bg-muted-foreground/80",
              )}
            />
          </div>
        )}

        {isWide && !isRemote && (
          <div
            className={cn(
              "h-full flex overflow-hidden shrink-0",
              !isResizing && "transition-[width] duration-500 ease-out",
            )}
            style={{ width: rightWidth }}
            aria-hidden={!showLogic}
          >
            <div
              className="h-full shrink-0 p-3 pl-1.5"
              style={{ width: `${100 - leftWidthPct}vw` }}
            >
              <LogicReplayPanel
                projectSlug={projectSlug}
                runId={run.runId}
                modelId={run.modelId}
                localProjectId={localProjectId}
                traceData={run.traceData}
                inputData={run.inputData}
                outputData={run.outputData}
                onClose={closeLogic}
              />
            </div>
          </div>
        )}
      </div>
    </GlassContext.Provider>
  );
}

export function GlassModeToggleImpl() {
  const ctx = useGlassContext();
  if (!ctx) return null;
  const { showLogic, toggleLogic } = ctx;
  return (
    <button
      type="button"
      onClick={toggleLogic}
      aria-pressed={showLogic}
      title={showLogic ? "Hide the logic behind this app" : "Show the logic behind this app"}
      className={cn(
        "shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        "transition-all duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent)] focus-visible:ring-offset-2",
        showLogic
          ? "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30"
          : "border-transparent text-white shadow-sm",
      )}
      style={
        showLogic
          ? undefined
          : {
              background: "linear-gradient(135deg, #FA4B00 0%, #968DF6 100%)",
            }
      }
    >
      {showLogic ? (
        <PanelRightClose className="h-3.5 w-3.5" />
      ) : (
        <PanelRight className="h-3.5 w-3.5" />
      )}
      {showLogic ? "Hide Logic" : "Show Logic"}
    </button>
  );
}

export function GlassModeResultImpl({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = useGlassContext();
  const inlinePanelRef = useRef<HTMLDivElement>(null);

  if (!ctx) return <>{children}</>;
  const {
    showLogic,
    openLogic,
    closeLogic,
    isWide,
    isRemote,
    projectSlug,
    localProjectId,
    run,
  } = ctx;

  return (
    <>
      {!isWide && !isRemote && (
        <div
          ref={inlinePanelRef}
          aria-hidden={!showLogic}
          className={cn(
            "overflow-hidden",
            "transition-[max-height,opacity,margin] duration-500 ease-out",
            showLogic ? "max-h-[75vh] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="h-[min(75vh,560px)]">
            <LogicReplayPanel
              projectSlug={projectSlug}
              runId={run.runId}
              modelId={run.modelId}
              localProjectId={localProjectId}
              traceData={run.traceData}
              inputData={run.inputData}
              outputData={run.outputData}
              onClose={closeLogic}
            />
          </div>
        </div>
      )}

      <DebugPortal
        onAudit={openLogic}
        active={showLogic}
      >
        {children}
      </DebugPortal>
    </>
  );
}
