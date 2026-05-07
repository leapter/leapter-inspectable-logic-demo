import { z } from "zod";

// ─── Fallback enums (used until the OpenAPI schema loads) ─────────────────────

export const DEFAULT_SIZES = ["small", "medium", "large"] as const;
export const DEFAULT_CRUSTS = ["thin", "regular", "stuffed"] as const;
export const DEFAULT_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayOfWeek = (typeof DEFAULT_DAYS)[number];

// ─── Presentation metadata (UI-only — not business logic) ─────────────────────

export const SIZE_META: Record<string, { label: string; diameter: string; ringSize: number }> = {
  small: { label: "Small", diameter: '10"', ringSize: 56 },
  medium: { label: "Medium", diameter: '12"', ringSize: 76 },
  large: { label: "Large", diameter: '16"', ringSize: 96 },
};

export const CRUST_META: Record<string, { label: string; description: string }> = {
  thin: { label: "Thin", description: "Crispy and light" },
  regular: { label: "Regular", description: "Classic hand-tossed" },
  stuffed: { label: "Stuffed", description: "Cheese-filled edge" },
};

export const DAY_META: Record<string, { short: string; long: string }> = {
  monday: { short: "Mon", long: "Monday" },
  tuesday: { short: "Tue", long: "Tuesday" },
  wednesday: { short: "Wed", long: "Wednesday" },
  thursday: { short: "Thu", long: "Thursday" },
  friday: { short: "Fri", long: "Friday" },
  saturday: { short: "Sat", long: "Saturday" },
  sunday: { short: "Sun", long: "Sunday" },
};

export const TOPPINGS = [
  { id: "tomato", name: "Tomato", emoji: "🍅" },
  { id: "onion", name: "Onion", emoji: "🧅" },
  { id: "bell-pepper", name: "Bell Pepper", emoji: "🫑" },
  { id: "mushroom", name: "Mushroom", emoji: "🍄" },
  { id: "olive", name: "Olive", emoji: "🫒" },
  { id: "sweet-corn", name: "Sweet Corn", emoji: "🌽" },
  { id: "bacon", name: "Bacon", emoji: "🥓" },
  { id: "prosciutto", name: "Prosciutto", emoji: "🍖" },
  { id: "mozzarella", name: "Mozzarella", emoji: "🧀" },
  { id: "shrimp", name: "Shrimp", emoji: "🍤" },
] as const;

export type ToppingId = (typeof TOPPINGS)[number]["id"];

// ─── Zod schema (broad validation — blueprint enforces constraints) ───────────

const toppingIds = TOPPINGS.map((t) => t.id) as [ToppingId, ...ToppingId[]];

export const schema = z.object({
  pizzaSize: z.string().min(1, "Please choose a size"),
  toppings: z.array(z.enum(toppingIds)).max(TOPPINGS.length),
  crustType: z.string().min(1, "Please choose a crust"),
  dayOfWeek: z.string().min(1, "Please choose a day"),
});

export type FormValues = z.infer<typeof schema>;

/** Returns today's day in our Monday-first lowercase format. */
export function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay(); // 0=Sunday..6=Saturday
  const mondayFirst = (jsDay + 6) % 7; // 0=Monday..6=Sunday
  return DEFAULT_DAYS[mondayFirst];
}
