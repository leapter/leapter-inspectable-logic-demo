"use client";

import { useEffect, useRef } from "react";

/**
 * Wrapper around the <leapter-logic-viewer> web component.
 * Sets attributes imperatively via refs — React doesn't reliably pass
 * complex string attributes to custom elements, and the viewer's boolean
 * attributes use a custom Lit converter that parses "true"/"false" strings.
 */
export function LogicViewerEmbed({
  modelJson,
  traceJson,
  className,
  hideDataPanel = true,
  hideMinimap = true,
  autoplay = false,
  playbackSpeed = 0.75,
}: {
  /** Base64-encoded model JSON */
  modelJson: string;
  /** Base64-encoded ModelInvocation JSON */
  traceJson?: string;
  className?: string;
  /** Hide the left data panel (inputs/outputs). Default: true. */
  hideDataPanel?: boolean;
  /** Hide the bottom-right minimap overlay. Default: true. */
  hideMinimap?: boolean;
  /** Auto-play the trace when set. Default: false. */
  autoplay?: boolean;
  /** Playback speed multiplier for the trace animation. Default: 0.75. */
  playbackSpeed?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  // Keep `logic` and `trace` updates independent so a new run (trace changes,
  // logic stable) never re-runs the logic branch — which tears down the
  // viewer's internal React tree and throws renderReact errors.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("logic", modelJson);
  }, [modelJson]);

  // Set autoplay before trace so the viewer sees the desired value when it
  // reacts to a new trace attribute.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("autoplay", autoplay ? "true" : "false");
  }, [autoplay]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("playback-speed", String(playbackSpeed));
  }, [playbackSpeed]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (traceJson) {
      el.setAttribute("trace", traceJson);
    } else {
      el.removeAttribute("trace");
    }
  }, [traceJson]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("hide-data-panel", hideDataPanel ? "true" : "false");
  }, [hideDataPanel]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.setAttribute("hide-minimap", hideMinimap ? "true" : "false");
  }, [hideMinimap]);

  return (
    // @ts-expect-error — custom element, typed in leapter-viewer.d.ts
    <leapter-logic-viewer
      ref={ref}
      frame
      class={className}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
