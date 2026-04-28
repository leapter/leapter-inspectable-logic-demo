"use client";

import { useEffect, useState, useCallback } from "react";
import { checkBlueprintConnection } from "@/app/actions/blueprint";
import { getClientConfig } from "@/lib/runtime-config";
import { getProjectConfig } from "@/lib/runtime-config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Upload,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BlueprintStatusProps {
  projectSlug: string;
  blueprintSlug: string;
}

type Status =
  | { state: "checking" }
  | { state: "connected"; mode: "local" | "remote" }
  | { state: "not-found"; mode: "local" | "remote"; available: string[] }
  | { state: "unreachable"; mode: "local" | "remote"; error: string }
  | { state: "auth-error"; error: string };

export function BlueprintStatus({
  projectSlug,
  blueprintSlug,
}: BlueprintStatusProps) {
  const [status, setStatus] = useState<Status>({ state: "checking" });
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    setStatus({ state: "checking" });
    setDismissed(false);

    const config = getProjectConfig(projectSlug);
    const override = getClientConfig(projectSlug);
    const mode = config.mode;

    const result = await checkBlueprintConnection(blueprintSlug, override);

    if (result.reachable && result.blueprintFound) {
      setStatus({ state: "connected", mode });
    } else if (result.reachable && !result.blueprintFound) {
      setStatus({
        state: "not-found",
        mode,
        available: result.availableModels,
      });
    } else if (result.error?.includes("Authentication")) {
      setStatus({ state: "auth-error", error: result.error });
    } else {
      setStatus({
        state: "unreachable",
        mode,
        error: result.error ?? "Connection failed",
      });
    }
  }, [projectSlug, blueprintSlug]);

  useEffect(() => {
    check();
  }, [check]);

  // Don't show anything when connected or dismissed
  if (status.state === "connected" || dismissed) return null;
  if (status.state === "checking") return null;

  return (
    <Alert
      variant={status.state === "unreachable" ? "destructive" : "default"}
      className={cn(
        "relative",
        status.state === "not-found" && "border-amber-500/50 bg-amber-50/50 text-amber-900 [&>svg]:text-amber-600",
        status.state === "auth-error" && "border-amber-500/50 bg-amber-50/50 text-amber-900 [&>svg]:text-amber-600"
      )}
    >
      {status.state === "unreachable" && <WifiOff className="h-4 w-4" />}
      {status.state === "not-found" && <AlertTriangle className="h-4 w-4" />}
      {status.state === "auth-error" && <AlertTriangle className="h-4 w-4" />}

      <AlertDescription className="flex flex-col gap-3">
        {/* ── Unreachable ── */}
        {status.state === "unreachable" && (
          <>
            <div>
              <p className="font-medium">
                {status.mode === "local"
                  ? "Local runtime not running"
                  : "Remote runtime unreachable"}
              </p>
              <p className="text-sm mt-1">
                {status.mode === "local" ? (
                  <>
                    Start the local server with{" "}
                    <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">
                      pnpm dev
                    </code>{" "}
                    or{" "}
                    <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">
                      pnpm dev:leapter
                    </code>
                  </>
                ) : (
                  <>Check the runtime URL in the settings dialog.</>
                )}
              </p>
            </div>
            {status.mode === "local" && (
              <div className="flex items-center gap-2 bg-background/50 rounded-lg p-2.5 text-xs font-mono">
                <Terminal className="h-3.5 w-3.5 shrink-0 opacity-60" />
                pnpm dev
              </div>
            )}
          </>
        )}

        {/* ── Blueprint not found ── */}
        {status.state === "not-found" && (
          <>
            <div>
              <p className="font-medium">
                Blueprint &ldquo;{blueprintSlug}&rdquo; not found
                {status.mode === "remote" ? " on remote instance" : ""}
              </p>
              <p className="text-sm mt-1">
                {status.mode === "remote" ? (
                  <>
                    The blueprint hasn&apos;t been pushed to this Leapter instance yet.
                    Push it first, then refresh.
                  </>
                ) : (
                  <>
                    Make sure the blueprint file exists at{" "}
                    <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">
                      leapter/logic/{blueprintSlug}/
                    </code>
                  </>
                )}
              </p>
            </div>
            {status.mode === "remote" && (
              <div className="flex items-center gap-2 bg-background/50 rounded-lg p-2.5 text-xs font-mono">
                <Upload className="h-3.5 w-3.5 shrink-0 opacity-60" />
                cd logic && leapter push
              </div>
            )}
            {status.available.length > 0 && (
              <p className="text-xs">
                Available blueprints: {status.available.map((m) => (
                  <code key={m} className="bg-background/50 px-1 py-0.5 rounded mx-0.5">{m}</code>
                ))}
              </p>
            )}
          </>
        )}

        {/* ── Auth error ── */}
        {status.state === "auth-error" && (
          <div>
            <p className="font-medium">Authentication failed</p>
            <p className="text-sm mt-1">
              Check your API key in the Runtime Settings. Make sure it has
              &ldquo;Execute&rdquo; permission.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={check}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
