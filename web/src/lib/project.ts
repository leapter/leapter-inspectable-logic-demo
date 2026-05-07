/**
 * Single-app project configuration.
 *
 * This file defines the one project this kit serves. Edit these values
 * to match your Leapter project manifest (leapter/leapter.project).
 */
export const projectConfig = {
  slug: "pizza-pricing",
  title: "Pizza Pricing Calculator",
  description:
    "Calculate the price of a pizza based on size, toppings, and crust type.",
  /** UUID from leapter.project → app.id */
  projectId: "180269b6-971b-4c2b-b68f-3a387afb5ec3",
  /** Main blueprint slug (used for execution and status checks) */
  blueprintSlug: "pizza-pricing",
  /** UUID of the main blueprint (//#id in the .vts file) */
  modelId: "f1ae47d5-b5bf-427a-a964-b7d18bd86608",
  /** Per-app accent color (oklch) — used for selection highlights and buttons */
  accentColor: "oklch(0.62 0.21 35)",
};
