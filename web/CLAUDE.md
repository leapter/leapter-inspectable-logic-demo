@AGENTS.md

# Web Module — UI Standards

This Next.js app is the frontend for Leapter Starter demos. Every page must feel
polished, modern, and usable by non-technical people (sales, presales, customers).

---

## Next.js & React Best Practices

Follow the **Vercel React Best Practices** skill (`react-best-practices`) when
writing, reviewing, or refactoring any React/Next.js code. It contains 70+ rules
across 8 categories, prioritized by impact. The skill triggers automatically on
React/Next.js work, but you can also invoke it explicitly.

Key principles (see the skill for full rules and code examples):

- **Eliminate async waterfalls** — parallel fetches, defer await, Suspense boundaries
- **Minimize client JS** — default to Server Components, dynamic imports for heavy code
- **Avoid unnecessary re-renders** — lazy state init, derived state, no premature memo
- **Consolidate iterations** — single-pass data processing, no duplicate array scans

### Read Next.js docs before writing code

This project uses **Next.js 16** which has breaking changes from earlier versions.
Before writing any code that touches routing, data fetching, metadata, or
middleware, read the relevant guide in `node_modules/next/dist/docs/01-app/`.

---

## Progressive Web App (PWA)

Every demo should work well on mobile devices and feel app-like:

- **Responsive by default** — use Tailwind responsive classes (`sm:`, `md:`, `lg:`).
  Design mobile-first, then enhance for larger screens.
- **Touch-friendly targets** — interactive elements must be at least 44x44px.
  Cards, buttons, and selection items should have generous padding.
- **Viewport meta** — already set by Next.js. Do not override.
- **Fast initial load** — keep the critical path lean. Use Server Components for
  the initial render; hydrate interactive parts selectively.
- **Offline resilience** — not required unless the requirements ask for it, but
  never show a blank page on slow connections. Use loading states and Suspense
  boundaries.

---

## Financial & Numeric Data Formatting

Demos frequently involve money, percentages, and quantities. **Always format
numbers properly** — never show raw floats or unformatted integers.

### Currency

```typescript
// Use Intl.NumberFormat — never concatenate "$" + value manually
function formatCurrency(value: number, currency = "USD", locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
```

- Match the locale to the requirements document language (German → `de-DE`, etc.)
- Large currency values (>10,000): include thousand separators automatically
- Hero/headline numbers: use `maximumFractionDigits: 0` for cleaner display

### Percentages

```typescript
function formatPercent(value: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value); // 0.15 → "15.0%"
}
```

### Quantities & plain numbers

- Always use thousand separators: `12,000` not `12000`
- Use `Intl.NumberFormat` for all numeric display — never `.toString()` or
  template literals for user-visible numbers.

### Dates

- Use `Intl.DateTimeFormat` with the correct locale
- Show relative dates ("2 days ago") for recent events, absolute for older ones

---

## Usability Standards

### Results must be visible

When a calculation completes, **scroll the result into view** automatically.
Users should never have to guess that something happened below the fold.

```typescript
const resultRef = useRef<HTMLDivElement>(null);
// After result arrives:
setTimeout(() => {
  resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
}, 100);
```

### Validation must be obvious

- Show inline validation errors next to the field, not in a toast or console.
- When the user submits with missing required fields, show a visible summary
  (e.g., an alert banner) AND highlight the specific fields.
- Never silently block form submission — if nothing visually changes when the
  user clicks a button, the UX is broken.

### All sections visible by default

- Do NOT hide required inputs behind tabs. If the user must fill in all sections
  to submit, show all sections on one scrollable page.
- Use tabs only for truly optional/alternative views (e.g., "Table view" vs
  "Chart view"), never for sequential required input.
- Use numbered step indicators (1, 2, 3) to show progress in long forms.

### Loading & feedback

- Every button that triggers an async action must show a loading state
  (spinner, "Calculating...", disabled appearance).
- Use optimistic UI where appropriate — show the expected state immediately,
  correct if the server disagrees.
- Show skeleton placeholders for content that's loading, not blank space.

### Accessibility

- All interactive elements must be keyboard-navigable (Tab, Enter, Space).
- Selection cards (vehicle type, coverage level) must use `button` elements or
  have proper ARIA roles — not bare `div` with `onClick`.
- Color must not be the only indicator — pair with icons, text, or patterns.
- Form labels must be associated with their inputs (`htmlFor` / `id`).
- Use `aria-live="polite"` on result areas so screen readers announce new results.

### Empty states

- Never show a blank area. If there's no data yet, show a helpful message:
  "Fill in the form above to see your results here."
- If a list is empty, explain why and suggest an action.

---

## Chart & Data Visualization

- Use Recharts via the shadcn/ui `Chart` wrapper for all charts.
- Chart colors use CSS variables `--chart-1` through `--chart-5` in `globals.css`.
- Always include hover tooltips with formatted values on charts.
- Provide a text summary alongside every chart — charts are visual aids, not the
  only way to consume the data.
- Prefer horizontal bar charts for comparing categories, area/line charts for
  trends over time, and donut charts for part-of-whole breakdowns.

---

## Component Patterns

- Use shadcn/ui primitives — don't install competing component libraries.
- Install additional shadcn components as needed: `pnpm dlx shadcn@latest add <name>`
- Check if shadcn/ui already has the component before installing anything else.
- Compose domain-specific components from primitives (e.g., `CoverageLevelSelector`
  built from `Card` + `Badge` + `Button`).
- Keep components focused — one file per concern, not monolithic page components.

---

## Per-App Accent Color

Each app gets its own accent color for interactive highlights. This avoids the
monochrome look that comes from using the global `--primary` (near-black) for
selections.

### How it works

1. **Project config** — the project in `src/lib/project.ts` sets an `accentColor`
   (oklch value). If omitted, the global `--accent` from `globals.css` is used.

   ```ts
   export const projectConfig = {
     slug: "insurance-premium-calculation",
     accentColor: "oklch(0.55 0.18 250)", // saturated blue
     ...
   };
   ```

2. **CSS variable** — the page component sets `--app-accent` as an inline style
   on the wrapper `div`, scoping the color to that page:

   ```tsx
   const accentStyle = project.accentColor
     ? ({ "--app-accent": project.accentColor } as React.CSSProperties)
     : undefined;

   return <div style={accentStyle}>...</div>;
   ```

3. **Fallback** — `globals.css` defines `--app-accent: var(--accent)` on `:root`,
   so pages without a custom color inherit the global accent automatically.

### Where to use `--app-accent`

Use it for all interactive/highlight elements within a page:

- **Selection cards** (selected state) — border, background tint, icon, label
- **Step indicators** — numbered circles
- **Buttons** — submit / primary action buttons
- **Result highlights** — hero numbers, key metric cards
- **Badges** — "Recommended", active state indicators

### How to apply

Use inline `style` with `var(--app-accent)`:

```tsx
// Border + tinted background for selected state
style={selected ? {
  borderColor: "var(--app-accent)",
  backgroundColor: "color-mix(in oklch, var(--app-accent) 8%, transparent)",
} : undefined}

// Colored icon/text
style={selected ? { color: "var(--app-accent)" } : undefined}

// Solid background (buttons, badges, step indicators)
style={{ backgroundColor: "var(--app-accent)" }}
```

Use `color-mix(in oklch, var(--app-accent) N%, transparent)` for tinted
backgrounds — this works with any hue and keeps the tint proportional.

### Do NOT

- Do not use Tailwind `text-primary` / `bg-primary` / `border-primary` for
  selection highlights — `--primary` is near-black and looks monochrome.
- Do not hardcode hex/oklch colors directly in components — always go through
  `--app-accent` so the color is configurable per app.
