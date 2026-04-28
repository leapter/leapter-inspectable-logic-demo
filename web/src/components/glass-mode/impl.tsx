"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Workflow } from "lucide-react";
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

/**
 * Enabled-mode root: owns state, split-pane layout, right-column replay panel,
 * and context provider. Only loaded when `NEXT_PUBLIC_LEAPTER_DEV_MODE=true`.
 */
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
  const [debugMode, setDebugMode] = useState(true);
  const [showLogic, setShowLogic] = useState(false);
  const [logicEverOpened, setLogicEverOpened] = useState(false);
  const isWide = useMediaQuery("(min-width: 1024px)");
  const isRemote = useRuntimeStore(
    (s) => s.configs[projectSlug]?.mode === "remote",
  );

  // Remote runtimes can't drive the local replay panel, so we derive the
  // effective state here rather than mutating `showLogic`. If the user
  // flips to remote while the split was open, the effective state collapses
  // without losing the underlying preference when they flip back to local.
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

  const toggleDebug = () => {
    setDebugMode((prev) => {
      const next = !prev;
      if (!next) setShowLogic(false);
      return next;
    });
  };
  const openLogic = () => {
    setLogicEverOpened(true);
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
        debugMode,
        toggleDebug,
        showLogic: effectiveShowLogic,
        openLogic,
        closeLogic,
        logicEverOpened,
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
        {/* Left column: the app's content. Width is user-controlled when
            the split is open; animates to full width when closed. */}
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

        {/* Draggable divider — only while the split is open. */}
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
            {/* Enlarged hit target for easier grabbing */}
            <span
              aria-hidden
              className="absolute inset-y-0 -left-2 -right-2"
            />
            {/* Visible grip */}
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

        {/* Right column: replay panel (wide viewports, local runtime only).
            Always mounted in debug mode with width 0 when closed so it
            pre-warms the viewer. Remote runs open in Lab instead.

            The outer div animates its width during open/close/resize; the
            inner content stays pinned to its target width in viewport units
            so the logic viewer (which lays out on every ResizeObserver tick)
            never sees a mid-transition width. Overflow-hidden clips the
            overhang while the outer is narrower than the inner. */}
        {debugMode && isWide && !isRemote && (
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

/**
 * Toggle button rendered in the app's header. Switches Glass Mode on and off
 * at runtime (for demo/screenshot purposes). Only rendered when the feature
 * flag is enabled at build time.
 */
export function GlassModeToggleImpl() {
  const ctx = useGlassContext();
  if (!ctx) return null;
  const { debugMode, toggleDebug } = ctx;
  return (
    <button
      type="button"
      onClick={toggleDebug}
      aria-pressed={debugMode}
      title={debugMode ? "Turn off Glass Mode" : "Turn on Glass Mode"}
      className={cn(
        "shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
        "transition-all duration-200 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent)] focus-visible:ring-offset-2",
        debugMode
          ? "border-transparent text-white shadow-sm"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30",
      )}
      style={
        debugMode
          ? {
              background: "linear-gradient(135deg, #FA4B00 0%, #968DF6 100%)",
            }
          : undefined
      }
    >
      <Workflow className="h-3.5 w-3.5" />
      Glass Mode
    </button>
  );
}

/**
 * Wraps the result. When Glass Mode is active: renders a DebugPortal around
 * children (clicking it opens the replay), plus an inline replay panel above
 * on narrow viewports. When inactive: passes children through unchanged.
 */
export function GlassModeResultImpl({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = useGlassContext();
  const inlinePanelRef = useRef<HTMLDivElement>(null);

  // When the inline (narrow) panel opens, scroll it into view so the user
  // sees the reveal instead of wondering whether the click did anything.
  useEffect(() => {
    if (!ctx || !ctx.showLogic || ctx.isWide) return;
    const t = setTimeout(() => {
      inlinePanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);
    return () => clearTimeout(t);
  }, [ctx]);

  if (!ctx) return <>{children}</>;
  const {
    debugMode,
    showLogic,
    openLogic,
    closeLogic,
    logicEverOpened,
    isWide,
    isRemote,
    projectSlug,
    localProjectId,
    run,
  } = ctx;

  return (
    <>
      {debugMode && !isWide && !isRemote && (
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

      {debugMode ? (
        <DebugPortal
          onAudit={openLogic}
          active={showLogic}
          firstTime={!logicEverOpened}
        >
          {children}
        </DebugPortal>
      ) : (
        children
      )}
    </>
  );
}
