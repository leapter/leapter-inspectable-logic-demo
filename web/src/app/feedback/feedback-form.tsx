"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  sendFeedback,
  type ProjectSnapshotSummary,
  type SessionLogSummary,
} from "./actions";

interface FeedbackFormProps {
  log: SessionLogSummary;
  project: ProjectSnapshotSummary;
}

export function FeedbackForm({ log, project }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState("");
  const [includeLog, setIncludeLog] = useState(false);
  const [includeProject, setIncludeProject] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await sendFeedback({
      feedback,
      includeLog: includeLog && log.exists,
      includeProject: includeProject && project.exists,
    });

    if (result.ok) {
      setSent(true);
    } else {
      setError(result.error ?? "Send failed. Please try again.");
    }
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold">Thank you.</h2>
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <Link href="/" className="text-muted-foreground underline-offset-4 hover:underline">
            Back to the demo
          </Link>
          <span className="text-border">&middot;</span>
          <a
            href="https://lab.leapter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-4 hover:underline"
          >
            See Leapter Lab
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="feedback">Your feedback</Label>
        <Textarea
          id="feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          rows={6}
          placeholder="What are you building? What worked, what didn't, what's missing?"
          className="resize-y"
        />
      </div>

      <SessionLogAttachment
        log={log}
        included={includeLog}
        onChange={setIncludeLog}
      />

      <ProjectSnapshotAttachment
        project={project}
        included={includeProject}
        onChange={setIncludeProject}
      />

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={
            submitting ||
            (feedback.trim().length === 0 &&
              !(includeLog && log.exists) &&
              !(includeProject && project.exists))
          }
        >
          {submitting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {submitting ? "Sending…" : "Send feedback"}
        </Button>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Session log card
// ---------------------------------------------------------------------------

function SessionLogAttachment({
  log,
  included,
  onChange,
}: {
  log: SessionLogSummary;
  included: boolean;
  onChange: (value: boolean) => void;
}) {
  const [showLog, setShowLog] = useState(false);
  return (
    <AttachmentCard>
      <AttachmentHeader
        id="include-log"
        title="Include my Claude session log"
        helper={
          log.exists ? (
            <>
              Your prompts and what Claude did in response. {log.eventCount}{" "}
              event{log.eventCount === 1 ? "" : "s"}, {formatBytes(log.bytes)}.
            </>
          ) : (
            <>
              Nothing recorded yet. Open Claude Code in the{" "}
              <code className="font-mono">leapter/</code> folder and start a
              conversation to capture one.
            </>
          )
        }
        disabled={!log.exists}
        included={included}
        onChange={onChange}
      />

      {included && log.exists && (
        <div className="mt-3 ml-7 space-y-2">
          <DisclosureToggle
            open={showLog}
            onToggle={() => setShowLog((value) => !value)}
            label={`${showLog ? "Hide" : "Show"} the exact bytes that will be sent`}
          />
          <p className="text-[11px] font-mono text-muted-foreground">
            {formatBytes(log.bytes)}
          </p>
          {showLog && (
            <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[11px] font-mono leading-relaxed">
              {log.content}
            </pre>
          )}
        </div>
      )}
    </AttachmentCard>
  );
}

// ---------------------------------------------------------------------------
// Project snapshot card
// ---------------------------------------------------------------------------

function ProjectSnapshotAttachment({
  project,
  included,
  onChange,
}: {
  project: ProjectSnapshotSummary;
  included: boolean;
  onChange: (value: boolean) => void;
}) {
  const [showFiles, setShowFiles] = useState(false);
  const fileCount = project.files.length;
  return (
    <AttachmentCard>
      <AttachmentHeader
        id="include-project"
        title="Show us what you built"
        helper={
          project.exists ? (
            <>
              We&rsquo;d love to see your work. Manifest + {fileCount}{" "}
              <code className="font-mono">.vts</code> file
              {fileCount === 1 ? "" : "s"}, {formatBytes(project.totalBytes)}.
            </>
          ) : (
            <>
              Nothing to attach yet. There&rsquo;s no project at{" "}
              <code className="font-mono">leapter/leapter.project</code>.
            </>
          )
        }
        disabled={!project.exists}
        included={included}
        onChange={onChange}
      />

      {included && project.exists && (
        <div className="mt-3 ml-7 space-y-2">
          <DisclosureToggle
            open={showFiles}
            onToggle={() => setShowFiles((value) => !value)}
            label={`${showFiles ? "Hide" : "Show"} the exact files that will be sent`}
          />
          <p className="text-[11px] font-mono text-muted-foreground">
            {formatBytes(project.totalBytes)}
          </p>
          {showFiles && (
            <ul className="overflow-hidden rounded-md border border-border bg-muted/40 text-[11px] font-mono">
              <li className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span>leapter.project</span>
                <span className="text-muted-foreground">
                  {formatBytes(project.manifestBytes)}
                </span>
              </li>
              {project.files.map((file) => (
                <li
                  key={file.path}
                  className="flex items-center justify-between px-3 py-1.5 last:border-0 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
                >
                  <span>{file.path}</span>
                  <span className="text-muted-foreground">
                    {formatBytes(file.bytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </AttachmentCard>
  );
}

// ---------------------------------------------------------------------------
// Shared attachment chrome
// ---------------------------------------------------------------------------

function AttachmentCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {children}
    </div>
  );
}

function AttachmentHeader({
  id,
  title,
  helper,
  disabled,
  included,
  onChange,
}: {
  id: string;
  title: string;
  helper: React.ReactNode;
  disabled: boolean;
  included: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={included}
        onCheckedChange={(checked) => onChange(checked === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex-1 space-y-1">
        <Label
          htmlFor={id}
          className={cn("font-medium", disabled && "text-muted-foreground")}
        >
          {title}
        </Label>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
    </div>
  );
}

function DisclosureToggle({
  open,
  onToggle,
  label,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
    >
      {open ? (
        <ChevronDown className="h-3 w-3" />
      ) : (
        <ChevronRight className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
