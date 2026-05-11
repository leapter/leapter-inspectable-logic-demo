"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Wrapper around the <leapter-logic-viewer> web component.
 * Sets attributes imperatively via refs — React doesn't reliably pass
 * complex string attributes to custom elements, and the viewer's boolean
 * attributes use a custom Lit converter that parses "true"/"false" strings.
 *
 * Supports the viewer's two input modes:
 *   - Single blueprint via `modelJson` (→ `logic` attribute)
 *   - Full project via `projectJson` (→ `project` attribute), optionally
 *     focused on a specific chapter via `initialBlueprint`
 * Exactly one of `modelJson` / `projectJson` must be provided.
 */
export function LogicViewerEmbed({
  modelJson,
  projectJson,
  initialBlueprint,
  traceJson,
  className,
  hideMinimap = true,
  hideContentsPanel = true,
  autoMaximize,
  autoplay = false,
  playbackSpeed = 0.75,
}: {
  /** Base64-encoded blueprint JSON (single-blueprint mode). */
  modelJson?: string;
  /** Base64-encoded ProjectExportSchema JSON (project mode). */
  projectJson?: string;
  /** In project mode, slug/id of the chapter to focus first. */
  initialBlueprint?: string;
  /** Base64-encoded ModelInvocation JSON */
  traceJson?: string;
  className?: string;
  /** Hide the bottom-right minimap overlay. Default: true. */
  hideMinimap?: boolean;
  /** Hide the left-side contents/chapters panel. Default: true. */
  hideContentsPanel?: boolean;
  /**
   * Override the viewer's per-mode auto-maximize default. Tri-state:
   * undefined keeps the default (logic → maximized, project → spec view),
   * true forces the focused chapter to be maximized, false forces spec view.
   * Useful in project mode when you want the focused chapter expanded the
   * same way single-blueprint mode does.
   */
  autoMaximize?: boolean;
  /** Auto-play the trace when set. Default: false. */
  autoplay?: boolean;
  /** Playback speed multiplier for the trace animation. Default: 0.75. */
  playbackSpeed?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  // Keep payload and trace updates independent so a new run (trace changes,
  // payload stable) never re-runs the payload branch — which tears down the
  // viewer's internal React tree and throws renderReact errors.
  //
  // Use useLayoutEffect, not useEffect, so attributes are written
  // synchronously during the commit phase. Lit schedules its first render
  // via a microtask after `connectedCallback`, and the viewer's
  // `renderReact()` renders a "Missing required attribute: `logic` or
  // `project`" error if neither is set when that microtask runs. With
  // plain useEffect (which fires after paint) the user briefly sees that
  // error message.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (projectJson) {
      el.removeAttribute("logic");
      el.setAttribute("project", projectJson);
    } else if (modelJson) {
      el.removeAttribute("project");
      el.setAttribute("logic", modelJson);
    }
  }, [modelJson, projectJson]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (initialBlueprint) {
      el.setAttribute("initial-blueprint", initialBlueprint);
    } else {
      el.removeAttribute("initial-blueprint");
    }
  }, [initialBlueprint]);

  // Set autoplay before trace so the viewer sees the desired value when it
  // reacts to a new trace attribute.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("autoplay", autoplay ? "true" : "false");
  }, [autoplay]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("playback-speed", String(playbackSpeed));
  }, [playbackSpeed]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (traceJson) {
      el.setAttribute("trace", traceJson);
      el.setAttribute("frame", "");
    } else {
      el.removeAttribute("trace");
      el.removeAttribute("frame");
    }
  }, [traceJson]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("hide-minimap", hideMinimap ? "true" : "false");
  }, [hideMinimap]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute(
      "hide-contents-panel",
      hideContentsPanel ? "true" : "false",
    );
  }, [hideContentsPanel]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (autoMaximize === undefined) {
      el.removeAttribute("auto-maximize");
    } else {
      el.setAttribute("auto-maximize", autoMaximize ? "true" : "false");
    }
  }, [autoMaximize]);

  return (
    // @ts-expect-error — custom element, typed in leapter-viewer.d.ts
    <leapter-logic-viewer
      ref={ref}
      class={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
