"use client";

import Image from "next/image";
import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wraps its children in a coral→purple glass border with an elevated
 * shadow and a "See how this was calculated →" hint. Pressing anywhere
 * in the wrapper fires `onAudit` to reveal the logic panel.
 */
export function DebugPortal({
  children,
  onAudit,
  active,
  firstTime,
}: {
  children: React.ReactNode;
  onAudit: () => void;
  active: boolean;
  firstTime: boolean;
}) {
  const pressable = !active;

  return (
    <div
      className={cn(
        "relative rounded-2xl p-[1.5px]",
        "transition-[transform,box-shadow] duration-500 ease-out",
        active ? "translate-y-0" : "-translate-y-0.5",
      )}
      style={{
        background:
          "linear-gradient(135deg, #FA4B00 0%, #D96AB0 45%, #968DF6 100%)",
        boxShadow: active
          ? "0 24px 60px -24px color-mix(in oklch, #FA4B00 45%, transparent), 0 10px 28px -14px color-mix(in oklch, #968DF6 35%, transparent)"
          : "0 18px 44px -22px color-mix(in oklch, #FA4B00 30%, transparent), 0 6px 18px -10px color-mix(in oklch, #968DF6 20%, transparent)",
      }}
    >
      {/* Leapter seal — absolute top-left, glass pill, overlays the wrapper */}
      <div
        className={cn(
          "pointer-events-none absolute left-4 top-4 z-20",
          "flex items-center gap-1.5 rounded-full border px-2.5 py-1",
          "backdrop-blur-md shadow-sm",
        )}
        style={{
          backgroundColor: "color-mix(in oklch, var(--background) 70%, transparent)",
          borderColor: "color-mix(in oklch, var(--foreground) 10%, transparent)",
        }}
      >
        <Image
          src="/leapter-logo-icon.svg"
          alt=""
          width={14}
          height={14}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Leapter
        </span>
      </div>

      <div
        role={pressable ? "button" : undefined}
        tabIndex={pressable ? 0 : undefined}
        onClick={pressable ? onAudit : undefined}
        onKeyDown={
          pressable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onAudit();
                }
              }
            : undefined
        }
        aria-label={pressable ? "See how this was calculated" : undefined}
        className={cn(
          "group relative block w-full overflow-hidden outline-none",
          "p-6 space-y-6",
          "focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent)] focus-visible:ring-offset-2",
          pressable ? "cursor-pointer" : "cursor-default",
        )}
        style={{
          borderRadius: "calc(var(--radius-2xl) - 1.5px)",
          backgroundColor: "color-mix(in oklch, var(--background) 94%, transparent)",
          backgroundImage:
            "linear-gradient(135deg, color-mix(in oklch, #FA4B00 6%, transparent) 0%, transparent 45%, color-mix(in oklch, #968DF6 5%, transparent) 100%)",
        }}
      >
        {/* Diagonal glass sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.1) 100%)",
          }}
        />

        <div className="relative space-y-6">
          {children}

          {pressable && (
            <div
              className={cn(
                "flex justify-center pt-1",
                firstTime &&
                  "animate-in fade-in slide-in-from-bottom-1 duration-700 delay-500",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5",
                  "text-xs font-medium",
                  "border-transparent text-muted-foreground bg-transparent",
                  "transition-all duration-300 ease-out",
                  "group-hover:border-[#FA4B00]/30 group-hover:text-[#FA4B00]",
                  "group-hover:bg-gradient-to-br group-hover:from-[#FA4B00]/10 group-hover:to-[#968DF6]/10",
                  "group-hover:shadow-[0_4px_18px_-6px_rgba(250,75,0,0.35)]",
                )}
              >
                <Workflow className="h-3.5 w-3.5" />
                <span>See how this was calculated</span>
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
