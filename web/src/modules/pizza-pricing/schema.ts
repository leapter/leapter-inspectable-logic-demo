import { z } from "zod";

export const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const TOPPING_PRICE = 1.5;

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

const toppingIds = TOPPINGS.map((t) => t.id) as [ToppingId, ...ToppingId[]];

export const schema = z.object({
  pizzaSize: z.enum(["small", "medium", "large"], {
    message: "Please choose a size",
  }),
  toppings: z.array(z.enum(toppingIds)).max(TOPPINGS.length),
  crustType: z.enum(["thin", "regular", "stuffed"], {
    message: "Please choose a crust",
  }),
  dayOfWeek: z.enum(DAYS_OF_WEEK, {
    message: "Please choose a day",
  }),
});

export type FormValues = z.infer<typeof schema>;

/** Returns today's day in our Monday-first lowercase format. */
export function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay(); // 0=Sunday..6=Saturday
  const mondayFirst = (jsDay + 6) % 7; // 0=Monday..6=Sunday
  return DAYS_OF_WEEK[mondayFirst];
}
