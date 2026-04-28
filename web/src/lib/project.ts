/**
 * Single-app project configuration.
 *
 * This file defines the one project this kit serves. Edit these values
 * to match your Leapter project manifest (leapter/leapter.project).
 */
export const projectConfig = {
  slug: "insurance-premium-calculation",
  title: "Insurance Premium Calculator",
  description:
    "Calculate motor insurance premiums based on vehicle details, driver profile, and coverage selection.",
  /** UUID from leapter.project → app.id */
  projectId: "4fe44512-4b05-4316-bfdf-256c065e58a7",
  /** Main blueprint slug (used for execution and status checks) */
  blueprintSlug: "insurance-premium-calculator",
  /** UUID of the main blueprint (//#id in the .vts file) */
  modelId: "fc5ffd5b-3f11-4eff-8a00-2c223fcb9c37",
  /** Per-app accent color (oklch) — used for selection highlights and buttons */
  accentColor: "oklch(0.55 0.18 250)",
};
