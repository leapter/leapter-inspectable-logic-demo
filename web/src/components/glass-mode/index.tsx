"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { GlassRun } from "./context";

export type { GlassRun } from "./context";

/**
 * Build-time flag. `NEXT_PUBLIC_*` env vars are inlined by Next.js, so this
 * constant becomes a literal `true` or `false` in the compiled bundle.
 * The `dynamic()` calls below sit behind this gate, so in a production build
 * with the flag unset, the entire `./impl` chunk (split-pane layout,
 * `DebugPortal`, `LogicReplayPanel`, and viewer dependencies) is dead code
 * and never shipped.
 */
const DEV_MODE = process.env.NEXT_PUBLIC_LEAPTER_DEV_MODE !== "false";

type GlassModeProps = {
  children: React.ReactNode;
  projectSlug: string;
  blueprintSlug: string;
  localProjectId?: string;
  run: GlassRun;
  accentColor?: string;
};
type GlassModeResultProps = { children: React.ReactNode };

const GlassModeImpl: ComponentType<GlassModeProps> | null = DEV_MODE
  ? dynamic(() => import("./impl").then((m) => m.GlassModeImpl), {
      ssr: false,
    })
  : null;

const GlassModeToggleImpl: ComponentType | null = DEV_MODE
  ? dynamic(() => import("./impl").then((m) => m.GlassModeToggleImpl), {
      ssr: false,
    })
  : null;

const GlassModeResultImpl: ComponentType<GlassModeResultProps> | null =
  DEV_MODE
    ? dynamic(() => import("./impl").then((m) => m.GlassModeResultImpl), {
        ssr: false,
      })
    : null;

/**
 * Root wrapper. When Glass Mode is disabled, renders its content inside a
 * normal scrollable page shell. When enabled, dynamically loads the impl
 * module which adds split-pane layout, replay panel, and state.
 *
 * The app supplies an accent color and the latest run data; Glass Mode owns
 * everything visual beyond that.
 */
export function GlassMode(props: GlassModeProps) {
  if (!GlassModeImpl) {
    const accentStyle = props.accentColor
      ? ({ "--app-accent": props.accentColor } as React.CSSProperties)
      : undefined;
    return (
      <div style={accentStyle} className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-6 py-10 space-y-8">
          {props.children}
        </div>
      </div>
    );
  }
  return <GlassModeImpl {...props} />;
}

/**
 * Header toggle button. Only renders when the feature flag is enabled.
 * Drop this inside the app header; in production it's a no-op.
 */
GlassMode.Toggle = function GlassModeToggle() {
  if (!GlassModeToggleImpl) return null;
  return <GlassModeToggleImpl />;
};

/**
 * Result wrapper. When Glass Mode is active, wraps children in a glass
 * border that opens the logic replay on click (and renders an inline replay
 * panel on narrow viewports). When disabled or toggled off, renders children
 * unchanged.
 */
GlassMode.Result = function GlassModeResult(props: GlassModeResultProps) {
  if (!GlassModeResultImpl) return <>{props.children}</>;
  return <GlassModeResultImpl {...props} />;
};
