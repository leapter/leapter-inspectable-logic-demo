"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Radio,
  Globe,
  Eye,
  EyeOff,
  Check,
  Loader2,
  AlertTriangle,
  WifiOff,
  Wifi,
  X,
  Copy,
  Terminal,
  Upload,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { projectConfig } from "@/lib/project";

type ProjectEntry = typeof projectConfig;
import {
  getProjectConfig,
  setProjectConfig,
  getClientConfig,
  type RuntimeProjectConfig,
} from "@/lib/runtime-config";
import { checkBlueprintConnection, discoverRemote } from "@/app/actions/blueprint";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ConnectionState =
  | "idle"
  | "checking"
  | "connected"
  | "wrong-blueprint"
  | "no-blueprints"
  | "unreachable"
  | "auth-error";

interface ProjectStatus {
  state: ConnectionState;
  message?: string;
  models: string[];
  resolvedUrl?: string;
}

// ─── Connection Check ──────────────────────────────────────────────────────────

async function checkProject(entry: ProjectEntry): Promise<ProjectStatus> {
  const config = getProjectConfig(entry.slug);
  const override = getClientConfig(entry.slug, entry.projectId);

  // Warn if remote mode but no override (missing URL/key)
  if (config.mode === "remote" && !override) {
    return {
      state: "unreachable",
      message: "Remote mode selected but URL or API key is empty",
      models: [],
    };
  }

  try {
    const result = await checkBlueprintConnection(entry.blueprintSlug, override);
    const resolvedUrl = result.resolvedUrl;

    // Detect mismatch: mode says remote but resolved URL is local
    const isLocal = resolvedUrl?.includes("localhost") || resolvedUrl?.includes("127.0.0.1");
    if (config.mode === "remote" && isLocal) {
      return {
        state: "unreachable",
        message: "Falling back to local — remote URL or API key not configured",
        models: [],
        resolvedUrl,
      };
    }

    if (!result.reachable) {
      return {
        state: "unreachable",
        message: result.error,
        models: [],
        resolvedUrl,
      };
    }
    if (result.error?.includes("Authentication")) {
      return { state: "auth-error", message: result.error, models: [], resolvedUrl };
    }
    if (result.availableModels.length === 0) {
      return { state: "no-blueprints", models: [], resolvedUrl };
    }
    // Remote uses UUIDs as model IDs, so we can't match by slug —
    // if the runtime is reachable and has models, it's connected.
    // Local uses slugs, so we can check for a specific blueprint.
    if (config.mode === "local" && !result.blueprintFound) {
      return { state: "wrong-blueprint", models: result.availableModels, resolvedUrl };
    }
    return { state: "connected", models: result.availableModels, resolvedUrl };
  } catch {
    return { state: "unreachable", message: "Connection failed", models: [] };
  }
}

// ─── Status Indicator ──────────────────────────────────────────────────────────

function StatusDot({ state }: { state: ConnectionState }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full shrink-0",
        state === "connected" && "bg-green-500",
        state === "checking" && "bg-amber-400 animate-pulse",
        state === "wrong-blueprint" && "bg-amber-500",
        state === "no-blueprints" && "bg-amber-500",
        state === "unreachable" && "bg-red-500",
        state === "auth-error" && "bg-red-500",
        state === "idle" && "bg-zinc-400"
      )}
    />
  );
}

function stateLabel(state: ConnectionState): string {
  switch (state) {
    case "connected":
      return "Connected";
    case "wrong-blueprint":
      return "Blueprint not found";
    case "checking":
      return "Checking...";
    case "no-blueprints":
      return "No blueprints";
    case "unreachable":
      return "Unreachable";
    case "auth-error":
      return "Auth failed";
    default:
      return "Idle";
  }
}

// ─── Copy Helper ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

// ─── Remote Config (Lab URL + API Key + Discover) ──────────────────────────────

function RemoteConfig({
  config,
  onSave,
}: {
  config: RuntimeProjectConfig;
  onSave: (c: RuntimeProjectConfig) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  const canDiscover = (config.labUrl?.length ?? 0) > 5 && (config.apiKey?.length ?? 0) > 3;

  async function discover() {
    setDiscovering(true);
    setDiscoverError(null);
    const result = await discoverRemote(config.labUrl, config.apiKey);
    if (result.success && result.runtimeUrl) {
      onSave({ ...config, remoteUrl: result.runtimeUrl });
    } else {
      setDiscoverError(result.error ?? "Discovery failed");
    }
    setDiscovering(false);
  }

  // Auto-discover when both fields are filled and no runtime URL yet
  useEffect(() => {
    if (canDiscover && !config.remoteUrl && !discovering) {
      discover();
    }
  }, [config.labUrl, config.apiKey]);

  return (
    <div className="space-y-2">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">
          Lab URL
        </label>
        <input
          type="text"
          placeholder="https://lab.leapter.com"
          value={config.labUrl}
          onChange={(e) =>
            onSave({ ...config, labUrl: e.target.value, remoteUrl: "" })
          }
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 block">
          API Key
        </label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            placeholder="lpt_..."
            value={config.apiKey}
            onChange={(e) =>
              onSave({ ...config, apiKey: e.target.value, remoteUrl: "" })
            }
            className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2.5 py-1.5 pr-8 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showKey ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Discovered runtime URL */}
      {config.remoteUrl && (
        <div className="flex items-center gap-1.5 bg-green-500/10 rounded-md px-2.5 py-1.5 text-[11px] font-mono text-green-400">
          <Check className="h-3 w-3 shrink-0" />
          <span className="truncate">{config.remoteUrl}</span>
        </div>
      )}

      {/* Discover button (when auto-discover hasn't run) */}
      {canDiscover && !config.remoteUrl && (
        <button
          type="button"
          onClick={discover}
          disabled={discovering}
          className="w-full flex items-center justify-center gap-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50"
        >
          {discovering ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Globe className="h-3 w-3" />
          )}
          Discover Runtime
        </button>
      )}

      {discoverError && (
        <p className="text-[11px] text-red-400">{discoverError}</p>
      )}
    </div>
  );
}

// ─── Project Row ───────────────────────────────────────────────────────────────

function ProjectRow({
  project,
  expanded,
  onToggle,
}: {
  project: ProjectEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [config, setConfig] = useState<RuntimeProjectConfig>({
    mode: "local",
    labUrl: "",
    remoteUrl: "",
    apiKey: "",
  });
  const [status, setStatus] = useState<ProjectStatus>({
    state: "idle",
    models: [],
  });

  useEffect(() => {
    setConfig(getProjectConfig(project.slug));
  }, [project.slug]);

  const test = useCallback(async () => {
    setStatus({ state: "checking", models: [] });
    const result = await checkProject(project);
    setStatus(result);
  }, [project]);

  // Auto-check on expand
  useEffect(() => {
    if (expanded && status.state === "idle") {
      test();
    }
  }, [expanded, status.state, test]);

  function save(updated: RuntimeProjectConfig) {
    setConfig(updated);
    setProjectConfig(project.slug, updated);
    // Reset status when config changes
    setStatus({ state: "idle", models: [] });
  }

  const pushCmd = `cd logic && leapter push`;

  return (
    <div className="border-b border-zinc-800 last:border-0">
      {/* Row header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-zinc-800/50 transition-colors text-left"
      >
        <StatusDot state={status.state} />
        <span className="text-sm font-medium text-zinc-200 truncate flex-1">
          {project.title}
        </span>
        <span
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded",
            config.mode === "remote"
              ? "bg-blue-500/20 text-blue-400"
              : "bg-zinc-700 text-zinc-400"
          )}
        >
          {config.mode}
        </span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 text-zinc-500 transition-transform",
            expanded && "rotate-90"
          )}
        />
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => save({ ...config, mode: "local" })}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-all",
                config.mode === "local"
                  ? "bg-zinc-700 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <Radio className="h-3 w-3" />
              Local
            </button>
            <button
              type="button"
              onClick={() => save({ ...config, mode: "remote" })}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-all",
                config.mode === "remote"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              <Globe className="h-3 w-3" />
              Remote
            </button>
          </div>

          {/* Local hint */}
          {config.mode === "local" && (
            <div className="flex items-center gap-2 bg-zinc-800/80 rounded-md px-2.5 py-2 text-[11px] font-mono text-zinc-400">
              <Terminal className="h-3 w-3 shrink-0 text-zinc-500" />
              <span className="flex-1 truncate">localhost:4004</span>
            </div>
          )}

          {/* Remote fields */}
          {config.mode === "remote" && (
            <RemoteConfig config={config} onSave={save} />
          )}

          {/* Status message */}
          {status.state !== "idle" && status.state !== "checking" && (
            <div
              className={cn(
                "rounded-md px-2.5 py-2 text-xs flex items-start gap-2",
                status.state === "connected" &&
                  "bg-green-500/10 text-green-400",
                (status.state === "wrong-blueprint" || status.state === "no-blueprints") &&
                  "bg-amber-500/10 text-amber-400",
                status.state === "unreachable" && "bg-red-500/10 text-red-400",
                status.state === "auth-error" && "bg-red-500/10 text-red-400"
              )}
            >
              {status.state === "connected" && (
                <Wifi className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              {(status.state === "wrong-blueprint" || status.state === "no-blueprints") && (
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              {(status.state === "unreachable" ||
                status.state === "auth-error") && (
                <WifiOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium">{stateLabel(status.state)}</p>
                {status.state === "connected" && (
                  <p className="text-green-400/70 mt-0.5">
                    {status.models.length} blueprint(s):{" "}
                    {status.models.join(", ")}
                  </p>
                )}
                {status.state === "wrong-blueprint" && (
                  <div className="mt-1 space-y-1">
                    <p className="text-amber-400/80">
                      Runtime has: {status.models.join(", ")}
                    </p>
                    <p className="text-amber-400/80">
                      Expected: <span className="font-mono">{project.blueprintSlug}</span>
                    </p>
                  </div>
                )}
                {status.state === "no-blueprints" &&
                  config.mode === "remote" && (
                    <div className="mt-1.5 flex items-center gap-1.5 bg-zinc-800/80 rounded px-2 py-1 font-mono text-[11px] text-zinc-400">
                      <Upload className="h-3 w-3 shrink-0" />
                      <span className="truncate">{pushCmd}</span>
                      <CopyButton text={pushCmd} />
                    </div>
                  )}
                {status.state === "unreachable" &&
                  config.mode === "local" && (
                    <p className="text-red-400/70 mt-0.5">
                      Start with <code>pnpm dev</code>
                    </p>
                  )}
                {status.message && status.state !== "no-blueprints" && (
                  <p className="text-zinc-500 mt-0.5 truncate">
                    {status.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Test button */}
          <button
            type="button"
            onClick={test}
            disabled={status.state === "checking"}
            className="w-full flex items-center justify-center gap-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50"
          >
            {status.state === "checking" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
            Test Connection
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

export function LeapterDevtools() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  const currentSlug = projectConfig.slug;
  const visibleProjects = [projectConfig];

  const [expandedSlug, setExpandedSlug] = useState<string | null>(currentSlug);

  if (!mounted) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col items-end gap-2">
      {/* Trigger button */}
      <TriggerBadge
        open={open}
        onToggle={() => setOpen(!open)}
        currentSlug={currentSlug}
      />

      {/* Panel */}
      {open && (
        <div className="w-80 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/40 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Image
                src="/leapter-logo-icon.svg"
                alt=""
                width={16}
                height={16}
                className="opacity-70"
              />
              <span className="text-xs font-semibold text-zinc-300 tracking-wide">
                LEAPTER DEVTOOLS
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Project list */}
          <div className="max-h-[60vh] overflow-y-auto">
            {visibleProjects.map((project) => (
              <ProjectRow
                key={project.slug}
                project={project}
                expanded={expandedSlug === project.slug}
                onToggle={() =>
                  setExpandedSlug(
                    expandedSlug === project.slug ? null : project.slug
                  )
                }
              />
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-zinc-800 text-[10px] text-zinc-600 flex justify-between">
            <span>NEXT_PUBLIC_LEAPTER_DEV_MODE=true</span>
            <span>localStorage</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Trigger Badge ─────────────────────────────────────────────────────────────

function TriggerBadge({
  open,
  onToggle,
  currentSlug,
}: {
  open: boolean;
  onToggle: () => void;
  currentSlug: string | null;
}) {
  const [mode, setMode] = useState<"local" | "remote">("local");
  const [connState, setConnState] = useState<ConnectionState>("idle");

  // Read config for the current project
  useEffect(() => {
    if (currentSlug) {
      setMode(getProjectConfig(currentSlug).mode);
    }
  }, [currentSlug, open]); // re-read when panel closes (config may have changed)

  // Auto-check connection for the project
  useEffect(() => {
    if (!currentSlug) return;
    const entry = projectConfig;
    let cancelled = false;
    setConnState("checking");
    checkProject(entry).then((result) => {
      if (!cancelled) setConnState(result.state);
    });
    return () => { cancelled = true; };
  }, [currentSlug, mode]);

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium shadow-lg transition-all",
        "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700",
        open && "border-zinc-700 text-zinc-200"
      )}
    >
      <Image
        src="/leapter-logo-icon.svg"
        alt=""
        width={14}
        height={14}
        className={cn("transition-opacity", open ? "opacity-90" : "opacity-60")}
      />
      {currentSlug ? (
        <>
          <span
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded",
              mode === "remote"
                ? "bg-blue-500/20 text-blue-400"
                : "bg-zinc-800 text-zinc-500"
            )}
          >
            {mode}
          </span>
          <StatusDot state={connState} />
        </>
      ) : (
        <span className="hidden sm:inline">Leapter</span>
      )}
    </button>
  );
}
