/**
 * Base error for all Leapter runtime failures.
 * Carries structured metadata (status, runId, slug) so callers can
 * handle errors without parsing message strings.
 */
export class LeapterError extends Error {
  public readonly status?: number;
  public readonly runId?: string;
  public readonly modelId?: string;
  public readonly slug?: string;

  constructor(
    message: string,
    opts?: { status?: number; runId?: string; modelId?: string; slug?: string },
  ) {
    super(message);
    this.name = "LeapterError";
    this.status = opts?.status;
    this.runId = opts?.runId;
    this.modelId = opts?.modelId;
    this.slug = opts?.slug;
  }
}

/** 401/403 — invalid or missing API key. */
export class AuthError extends LeapterError {
  constructor(
    message: string,
    opts?: { status?: number; runId?: string; slug?: string },
  ) {
    super(message, { status: 401, ...opts });
    this.name = "AuthError";
  }
}

/** 404 — blueprint not found on the runtime. */
export class NotFoundError extends LeapterError {
  constructor(
    message: string,
    opts?: { status?: number; runId?: string; modelId?: string; slug?: string },
  ) {
    super(message, { status: 404, ...opts });
    this.name = "NotFoundError";
  }
}

/** Network-level failure — runtime unreachable. */
export class NetworkError extends LeapterError {
  constructor(message: string, opts?: { modelId?: string; slug?: string }) {
    super(message, opts);
    this.name = "NetworkError";
  }
}
