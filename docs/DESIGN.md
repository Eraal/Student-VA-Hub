# Student VA-Hub — Design System

> Read this before building any UI. Every screen must follow these rules.
> Reference screen: the Client's **Assign Task** page (built on Day 1 as a static mock).

---

## Direction

Clean productivity-app look — **Linear, Notion, Cal.com style**. Not a flashy landing page. Functional, information-dense, calm.

---

## Design Tokens

Defined in `src/app/globals.css` using Tailwind v4 `@theme inline`.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#ffffff` | Page background |
| `--color-surface` | `#f9fafb` (gray-50) | Card / panel background |
| `--color-border` | `#e5e7eb` (gray-200) | Borders, dividers |
| `--color-text` | `#111827` (gray-900) | Primary text |
| `--color-muted` | `#6b7280` (gray-500) | Labels, placeholders, secondary text |
| `--color-accent` | `#18181b` (zinc-900) | Buttons, active nav, links |
| `--color-accent-hover` | `#3f3f46` (zinc-700) | Hover on accent elements |
| `--color-accent-fg` | `#ffffff` | Text on accent backgrounds |

### Meaning colors — use ONLY for their designated purpose

> [!IMPORTANT]
> These three colors carry semantic meaning. **Never** use blue, green, or red for anything other than their purpose below.

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-class` | `#2563eb` (blue-600) | Class schedule blocks |
| `--color-class-bg` | `#eff6ff` (blue-50) | Background behind class blocks |
| `--color-work` | `#16a34a` (green-600) | VA work / task blocks |
| `--color-work-bg` | `#f0fdf4` (green-50) | Background behind work blocks |
| `--color-conflict` | `#dc2626` (red-600) | Conflict alerts, error states |
| `--color-conflict-bg` | `#fef2f2` (red-50) | Background behind conflict alerts |

---

## Component Rules

| Item | Rule |
|------|------|
| **Components** | shadcn/ui only — buttons, forms, dialogs, tables, badges |
| **Icons** | Lucide icons only. No emoji icons, no other icon sets |
| **Font** | Geist Sans (loaded via `next/font/google`) |
| **Border radius** | `rounded-md` (8px) maximum. Never `rounded-xl` or `rounded-2xl` on containers |
| **Shadows** | `shadow-sm` only. No `shadow-lg`, no drop shadows |
| **Spacing** | Tailwind 4/8px scale: `p-4`, `p-8`, `gap-4`, `gap-8`. Consistent across screens |

---

## Layout

- **Mobile-first**: design at 375px width, then expand
- **Bottom tab bar** on mobile for student (5 items) and client (4 items)
- **Sidebar** replaces the tab bar on `md:` and above
- Max content width: `max-w-screen-md` (768px) on most pages; `max-w-screen-lg` on calendar

---

## States — Required on Every Screen

> [!WARNING]
> Every page must implement all three states before it is considered done.

| State | What to show |
|-------|-------------|
| **Loading** | Skeleton placeholders matching the shape of real content |
| **Empty** | An icon, a specific message (not "No data"), and a CTA when applicable |
| **Error** | An icon, the error reason, and a retry or back action |

---

## Avoid

- Purple/blue **gradients**, glassmorphism, glow effects
- Cards inside cards
- Everything centered (use left-aligned lists and grids)
- Oversized rounded corners
- Generic placeholder copy ("Welcome to your dashboard!", "Nothing here yet")
- Emoji as icons

---

## Reference Screen

The **Client → Assign Task** screen is the design reference for the entire app:

- Form with `Label + Input` from shadcn/ui
- Live conflict check below the form:
  - Green badge: "No conflict — ready to assign"
  - Red alert with Lucide `AlertCircle` icon: "Conflict — Juan has class Monday 1 PM–2 PM"
- Primary button: zinc-900 background, white text, `rounded-md`
- Section divider: `border-t border-[var(--color-border)]`

---

## Quick Reference — Tailwind Class Shortcuts

```
Accent button:   bg-[var(--color-accent)] text-[var(--color-accent-fg)] rounded-md px-4 py-2 text-sm font-medium
Surface card:    bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md p-4
Muted label:     text-xs text-[var(--color-muted)] font-medium uppercase tracking-wide
Class badge:     bg-[var(--color-class-bg)] text-[var(--color-class)] rounded px-2 py-0.5 text-xs font-medium
Work badge:      bg-[var(--color-work-bg)] text-[var(--color-work)] rounded px-2 py-0.5 text-xs font-medium
Conflict alert:  bg-[var(--color-conflict-bg)] text-[var(--color-conflict)] border border-[var(--color-conflict)] rounded-md p-3
```

