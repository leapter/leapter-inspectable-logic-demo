"use client";

import { useEffect, useState } from "react";

/**
 * Reactive wrapper around `window.matchMedia`. Returns `false` until the
 * first effect runs (SSR-safe), then tracks the media query live.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}
