"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STORAGE_KEY = "leapter:feedback-hint-seen";

/**
 * One-time onboarding bubble pointing at the Share Feedback pill.
 * Wraps the trigger element (e.g. the Link) so the underlying tooltip
 * primitive handles positioning, the arrow, and outside-click handling.
 *
 * Open state is fully controlled: opens once after a short delay on
 * first visit, dismisses permanently on first interaction or on the X.
 * Persistence lives in `localStorage`.
 */
export function FeedbackHint({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    // Tiny delay so the bubble feels intentional, not a flash on load.
    const timer = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Non-fatal; bubble just shows again next visit.
    }
  }

  return (
    <TooltipProvider>
      <Tooltip
        open={open}
        // The primitive fires onOpenChange(false) on outside-click,
        // which is exactly the dismissal we want. Hover-triggered
        // onOpenChange(true) is ignored because we don't want hover to
        // re-show the bubble after it's been dismissed.
        onOpenChange={(value) => {
          if (value === false) dismiss();
        }}
      >
        <TooltipTrigger render={<span className="inline-flex" />}>
          {children}
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={8} className="gap-2 px-3 py-2">
          <span>Got feedback? We&rsquo;d love to hear it.</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(event) => {
              event.stopPropagation();
              dismiss();
            }}
            className="-mr-1 opacity-70 transition-opacity hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
