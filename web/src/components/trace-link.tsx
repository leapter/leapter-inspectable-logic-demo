"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import { buildTraceUrl } from "@/lib/runtime-config";

/**
 * Prominent card shown after a successful blueprint execution,
 * linking the user to the trace viewer in Leapter Lab.
 */
export function TraceLink({
  projectSlug,
  runId,
  modelId,
  localProjectId,
}: {
  projectSlug: string;
  runId: string | undefined;
  /** Resolved model UUID from the runtime */
  modelId: string | undefined;
  /** UUID from leapter.project — needed for local mode trace links */
  localProjectId?: string;
}) {
  const [visible, setVisible] = useState(false);

  // Animate in after mount
  useEffect(() => {
    if (runId) {
      const timer = setTimeout(() => setVisible(true), 150);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [runId]);

  if (!runId || !modelId) return null;

  const url = buildTraceUrl(projectSlug, runId, modelId, localProjectId);
  if (!url) return null;

  return (
    <div
      className={`
        overflow-hidden rounded-xl
        bg-gradient-to-r from-[#FA4B00]/[0.06] via-[#B379FF]/[0.06] to-[#B379FF]/[0.04]
        border border-[#FA4B00]/20
        transition-all duration-500 ease-out
        ${visible ? "opacity-100 translate-y-0 max-h-40" : "opacity-0 translate-y-3 max-h-0"}
      `}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 px-5 py-4 group hover:from-[#FA4B00]/[0.10] hover:via-[#B379FF]/[0.10] hover:to-[#B379FF]/[0.06] hover:bg-gradient-to-r transition-colors"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#FA4B00]/15 to-[#B379FF]/15 shrink-0">
          <Image
            src="/leapter-logo-icon.svg"
            alt=""
            width={22}
            height={22}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            No black box. Every step is auditable.
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Leapter recorded every step of this calculation. <span className="font-semibold text-foreground">Replay it to see</span> exactly how each value was derived. That's trust you can verify.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium bg-gradient-to-r from-[#FA4B00] to-[#B379FF] bg-clip-text text-transparent shrink-0 group-hover:gap-2 transition-all">
          <span className="hidden sm:inline">Open</span>
          <ExternalLink className="h-4 w-4 text-[#FA4B00]" />
        </div>
      </a>
    </div>
  );
}
