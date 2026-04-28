# Style Guide

This file describes the visual identity for this app. Claude reads this
when building or modifying the UI.

---

## Brand

| Property     | Value                          |
|--------------|--------------------------------|
| App name     | Insurance Premium Calculator   |
| Company      | (your company name)            |
| Tagline      | (your tagline)                 |
| Logo         | `web/public/leapter-logo-full.svg` (replace with your own) |
| Favicon      | `web/src/app/icon.svg` (replace with your own)             |

---

## Colors

All colors are defined as CSS custom properties in `web/src/app/globals.css`.
The app accent color is set in `web/src/lib/project.ts` (`accentColor` field).

| Role            | Variable          | Current value                | Usage                                   |
|-----------------|-------------------|------------------------------|-----------------------------------------|
| Accent          | `--app-accent`    | `oklch(0.55 0.18 250)` (blue) | Buttons, selections, step indicators    |
| Background      | `--background`    | near-white                   | Page background                         |
| Foreground      | `--foreground`    | near-black                   | Body text                               |
| Muted           | `--muted`         | light gray                   | Secondary backgrounds, cards            |
| Muted text      | `--muted-foreground` | medium gray               | Descriptions, helper text               |
| Destructive     | `--destructive`   | red                          | Errors, validation messages             |
| Chart 1–5       | `--chart-1` … `--chart-5` | brand palette        | Data visualization                      |

To change the accent color for this app, edit `accentColor` in
`web/src/lib/project.ts`. To change global theme colors, edit the `:root`
block in `web/src/app/globals.css`.

---

## Typography

| Element         | Font              | Weight    | Size                  |
|-----------------|-------------------|-----------|-----------------------|
| Body text       | Inter (variable)  | 400       | base (1rem)           |
| Headings        | Inter (variable)  | 700       | text-3xl / text-5xl   |
| Labels          | Inter (variable)  | 500       | text-sm               |
| Monospace       | Geist Mono        | 400       | text-sm               |

Fonts are loaded locally from `web/public/fonts/` via `next/font/local`.
To change fonts, replace the `.woff2` files and update `web/src/app/layout.tsx`.

---

## Spacing & Layout

- Max content width: `max-w-4xl` (56rem / 896px)
- Page padding: `px-6 py-10`
- Card padding: `p-5` to `p-8`
- Section gap: `space-y-6` to `space-y-8`
- Grid gaps: `gap-3` (tight, e.g. selection cards) to `gap-4` (standard)

---

## Components

### Selection cards
- Unselected: `border-border bg-background`, subtle hover
- Selected: accent border + 8% accent tint background + accent-colored icon/text
- Touch target: full card is clickable, minimum 44px height

### Step indicators
- Numbered circles (1, 2, 3) with solid accent background and white text
- `h-8 w-8 rounded-full`

### Buttons
- Primary action: solid accent background, white text, `rounded-full`
- Secondary: `variant="outline"`, `rounded-full`
- Loading state: text changes to "Calculating…", button disabled

### Result display
- Hero number: `text-5xl font-bold` in accent color
- Supporting metrics: `text-2xl font-semibold` in standard foreground
- Summary card: dashed border, muted background, icon + text explanation

### Validation
- Inline errors: `text-sm text-destructive` below the field
- Global alert: red `Alert` banner above the submit button
- Never silently block submission

---

## Tone of Voice

- Professional but approachable
- Use the **language of the requirements document** for all UI text
- Short labels, helpful descriptions
- No jargon — this app is used by non-technical people

---

## Customization Checklist

When adapting this app for a new use case, update these files:

| What to change              | Where                                    |
|-----------------------------|------------------------------------------|
| App name & metadata         | `web/src/app/layout.tsx` (metadata)      |
| Project config              | `web/src/lib/project.ts`                 |
| Accent color                | `web/src/lib/project.ts` → `accentColor` |
| Theme colors                | `web/src/app/globals.css` → `:root`      |
| Logo                        | `web/public/leapter-logo-full.svg`       |
| Favicon                     | `web/src/app/icon.svg`                   |
| Fonts                       | `web/public/fonts/` + `layout.tsx`       |
| Landing page copy           | `web/src/app/page.tsx`                   |
| Requirements                | `requirements/`                          |
| Business logic              | `logic/`                                 |
