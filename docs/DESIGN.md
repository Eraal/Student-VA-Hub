# VAwise — Design System Specification

> **Status:** Approved Source of Truth  
> **Visual Reference:** The Landing Page (`src/app/page.tsx`, `src/components/landing/*`)  
> **Target Audience:** Working university students & hirers/clients in the Philippines and global remote teams.

---

## The Core Non-Negotiable Laws

> [!IMPORTANT]
> **Core Law 1: Semantic Color Exclusivity**  
> **"Blue = class, Green = VA work, Red = conflict, Amber = warning. Used only for their meaning."**  
> Never use these colors for decorative accents, generic badges, random buttons, or icons unrelated to their semantic purpose.

> [!IMPORTANT]
> **Core Law 2: Visual Cohesion Across Density**  
> **"App pages are denser and calmer than the landing page, but must look like the same product. If a new page looks different from the landing page, it is wrong."**  
> While internal dashboard screens remove marketing hero elements, animations, and decorative textures, they MUST share the exact same palette (`#FAF7F2` canvas, `#FFFFFF` cards, `#0F172A` borders and text), typography (`Bricolage Grotesque` display, `Geist Sans` body), 1.5px stroke weights, and hard offset shadows (`2px/3px`).

> [!IMPORTANT]
> **Core Law 3: Zero Raw Technical Values & Single Source of Truth**  
> **"Never render raw enum values, ISO dates, IDs, null/undefined or error messages. Use StatusBadge, lib/format.ts and lib/errors.ts."**  
> Components must never output raw database cuid/uuid strings, ISO timestamp strings, raw exception traces, or untranslated enum keys directly to the user.

> [!IMPORTANT]
> **Core Law 4: English Copy Standard**  
> **"All UI copy is English. Never show raw enums, IDs, ISO dates, color names, or invented claims."**  
> All user-facing copy, labels, tooltips, buttons, empty states, and notifications must be in plain, natural English with consistent sentence case. Never include color names in textual UI copy (e.g. write "Class", "Work", "Conflict", never "Class (Blue)"). Never invent unsubstantiated platform claims not in `docs/SPEC.md`.

---

# PART 1: SHARED DESIGN SYSTEM
*(Must be identical across EVERY page — landing, auth, student portal, client portal, settings, modals)*

### 1.1 Color Tokens & Meaning System

All values are real extracted codes from `src/app/globals.css` and the approved landing components:

| Token / Role | Hex / Value | Usage & Meaning |
| :--- | :--- | :--- |
| **Canvas Background** | `#FAF7F2` | Warm paper cream canvas. Used across full page `min-h-screen bg-[var(--color-bg)]`. |
| **Card / Surface** | `#FFFFFF` | Crisp white background for cards, tables, panels, and modals. |
| **Subtle Surface** | `#FAF7F2` | Off-white background for secondary panels, tab tracks, and code chips. |
| **Deep Text / Primary Border** | `#0F172A` | Deep slate-900. Used for all primary headlines, body text, button backgrounds, and `1.5px` borders. |
| **Muted Text (Paragraph)** | `#475569` (slate-600) | Secondary body copy, subtitle descriptions, and card body details. |
| **Muted Text (Label/Placeholder)** | `#64748B` (slate-500) | Form placeholders, metadata, timestamps, and subtle hints. |
| **Subtle Divider / Border** | `#E5DFD5` | Warm stone divider line for headers, footers, and internal card compartments. |
| **Focus Ring** | `#0F172A` | Accessible 2px offset ring (`outline: 2px solid #0F172A; outline-offset: 2px;`). |

#### Semantic Meaning Colors & Tints (Strictly Functional)

| Semantic Role | Base / Stroke | Background Tint | Foreground Text | Usage Constraint |
| :--- | :--- | :--- | :--- | :--- |
| **Class Schedule** (Blue) | `#2563EB` (blue-600) | `#EFF6FF` (blue-50) | `#1E40AF` (blue-800) | **Academic Class blocks ONLY**. Timetable, class verification, student schedule views. |
| **VA Work / Tasks** (Green) | `#16A34A` (green-600) | `#F0FDF4` (green-50) | `#166534` (green-800) | **VA Work / Task blocks ONLY**. Active contracts, approved timesheets, assigned tasks. |
| **Conflict / Alert** (Red) | `#DC2626` (red-600) | `#FEF2F2` (red-50) | `#991B1B` (red-800) | **Schedule Conflicts & Hard Blocks ONLY**. Clashes with classes, form submission blocking. |
| **Burnout Warning** (Amber) | `#D97706` (amber-600) | `#FFFBEB` (amber-50) | `#92400E` (amber-800) | **Warning & Capacity Alerts ONLY**. 4h/day daily burnout cap warnings, pending reviews. |

---

### 1.2 Typography & Type Scale

Fonts are loaded globally in `src/app/layout.tsx`:
- **Display Font:** `Bricolage Grotesque` (`--font-bricolage`, weights `500, 600, 700, 800`). Used for headlines, card titles, and modal headers.
- **Body Font:** `Geist Sans` (`--font-geist-sans`, weights `400, 500, 600, 700`). Used for running body text, form labels, buttons, and tables.
- **Monospace Font:** `Geist Mono` (`--font-geist-mono`). Used for timeslots, numerical hours, step counters, and system code snippets.

#### Type Scale Specifications:

| Level | Size (Mobile → Desktop) | Weight | Tracking & Leading | Font Family | Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page / Section H2** | `text-2xl sm:text-4xl` (24px → 36px) | `font-extrabold` (800) | `tracking-tight leading-tight` | `Bricolage Grotesque` | "Three simple steps to conflict-free work." |
| **Card Header H3** | `text-lg sm:text-xl` (18px → 20px) | `font-bold` (700) | `tracking-tight leading-snug` | `Bricolage Grotesque` | "Juan's Weekly Schedule" |
| **Sub-item H4** | `text-sm sm:text-base` (14px → 16px) | `font-bold` (700) | `tracking-tight leading-snug` | `Geist Sans` | "CS 312: Algorithms & Complexity" |
| **Body (Default)** | `text-sm sm:text-base` (14px → 16px) | `font-normal` (400) | `leading-relaxed` | `Geist Sans` | Regular task notes, explanations. |
| **Body (Dense / App)** | `text-xs sm:text-sm` (12px → 14px) | `font-normal` (400) / `font-medium` (500) | `leading-relaxed text-slate-600` | `Geist Sans` | Dashboard summaries, table cell contents. |
| **Micro-Label / Eyebrow**| `text-[10px]` or `text-[11px]` | `font-bold` (700) | `uppercase tracking-wider` | `Geist Sans` | "STUDENT VIEW (DETAILED)", "BLOCKED" |
| **Big Numbers / Stats** | `text-2xl sm:text-3xl` | `font-black` (900) | `tracking-tighter font-mono text-[#0F172A]` | `Geist Mono` | "01", "02", "3.5h / 4.0h" |

---

### 1.3 Borders, Shadows, and Radii (Neo-Brutalist Tactile Style)

1. **Border Style:**
   - **Main Structural Border:** `border-[1.5px] border-[#0F172A]`. Every interactive element, container, input, and card uses this crisp 1.5px stroke.
   - **Internal Divider:** `border-b border-[#E5DFD5]` or `border-t border-[#E5DFD5]` (1px subtle taupe line).

2. **Corner Radii:**
   - Container & Main Cards: `rounded-2xl` (16px)
   - Nested Cards, Modals & Schedule Items: `rounded-xl` (12px)
   - Buttons, Form Inputs, Icon Boxes: `rounded-lg` (8px)
   - Segmented Tabs, Day Pills: `rounded-md` (6px)
   - Status Chips & Eyebrows: `rounded-full` (9999px)

3. **Hard Offset Shadows:**
   - Standard Cards: `shadow-[3px_3px_0px_0px_#0F172A]`
   - Elevated Cards / Focus: `shadow-[4px_4px_0px_0px_#0F172A]`
   - Buttons & Inputs: `shadow-[2px_2px_0px_0px_#0F172A]`
   - Chips & Small Badges: `shadow-[1.5px_1.5px_0px_0px_#0F172A]`
   - Active Press physics: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none`
   - Hover Lift: `hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A]`

---

### 1.4 Global Component Specs (shadcn/ui Built-ins)

All shadcn components automatically inherit these styles from `src/components/ui/*`:

#### Buttons (`src/components/ui/button.tsx`)
- **Primary:** `bg-[#0F172A] text-white border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-slate-800 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-4 font-bold`
- **Secondary / Outline:** `bg-white text-[#0F172A] border-[1.5px] border-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] hover:bg-[#FAF7F2] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#0F172A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none min-h-[40px] px-4 font-bold`
- **Ghost:** `text-slate-700 hover:text-[#0F172A] hover:bg-[#EFEAE2] font-semibold min-h-[40px] px-3.5`
- **Destructive:** `bg-[#DC2626] text-white border-[1.5px] border-[#DC2626] shadow-[2px_2px_0px_0px_#DC2626] hover:bg-red-700 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_#DC2626] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-bold`

#### Cards (`src/components/ui/card.tsx`)
- Container: `rounded-2xl border-[1.5px] border-[#0F172A] bg-white text-card-foreground shadow-[3px_3px_0px_0px_#0F172A] transition-all py-6`
- Card Header: `px-6 pb-4 border-b border-[#E5DFD5]`
- Card Title: `font-display text-lg font-bold tracking-tight text-[#0F172A] leading-snug`
- Card Description: `text-xs sm:text-sm text-slate-600 leading-relaxed`
- Card Content: `px-6 pt-4`

#### Badges & Chips (`src/components/ui/badge.tsx`)
- Base: `rounded-full border-[1.5px] px-2.5 py-0.5 text-xs font-bold shadow-[1.5px_1.5px_0px_0px_#0F172A]`
- Variants:
  - `class`: `border-[#2563EB] bg-[#EFF6FF] text-[#1E40AF] shadow-[1.5px_1.5px_0px_0px_#2563EB]`
  - `work`: `border-[#16A34A] bg-[#F0FDF4] text-[#166534] shadow-[1.5px_1.5px_0px_0px_#16A34A]`
  - `destructive` / `conflict`: `border-[#DC2626] bg-[#FEF2F2] text-[#991B1B] shadow-[1.5px_1.5px_0px_0px_#DC2626]`
  - `warning`: `border-[#D97706] bg-[#FFFBEB] text-[#92400E] shadow-[1.5px_1.5px_0px_0px_#D97706]`
  - `default`: `border-[#0F172A] bg-[#0F172A] text-white`
  - `secondary`: `border-[#0F172A] bg-white text-[#0F172A]`

#### Input Fields (`src/components/ui/input.tsx`)
- Base: `h-10 w-full rounded-lg border-[1.5px] border-[#0F172A] bg-white px-3 py-2 text-sm text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A]`
- Error State: `aria-invalid:border-[#DC2626] aria-invalid:shadow-[2px_2px_0px_0px_#DC2626]`

#### Segmented Tabs (`src/components/ui/tabs.tsx`)
- Track: `flex rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] p-1 shadow-[2px_2px_0px_0px_#0F172A]`
- Trigger: `flex-1 rounded-md py-1.5 px-3 text-xs font-bold transition-all text-slate-600 hover:text-[#0F172A] hover:bg-white/60 data-[state=active]:bg-[#0F172A] data-[state=active]:text-white data-[state=active]:shadow-xs cursor-pointer`

#### Iconography
- Icons: `lucide-react` exclusively.
- Sizes: `size-3.5` (14px) for inline metadata, `size-4` (16px) for buttons/inputs, `size-5` (20px) for section headers, `size-6` (24px) for empty state illustrations.
- Icon Badges: `flex size-9 items-center justify-center rounded-lg border-[1.5px] border-[#0F172A] bg-[#FAF7F2] text-[#0F172A] shadow-[2px_2px_0px_0px_#0F172A]`.

---

### 1.5 Voice, Tone, and Copy

- **Personality:** Respectful, encouraging, transparent, grounded in Philippine student-freelancer culture.
- **Language:** English-first with natural Taglish when contextualizing everyday student hustle (e.g. "Bawal ang burnout", "May klase pa ako").
- **Clarity:** Direct microcopy without corporate fluff:
  - *Conflict State:* "Conflict! Juan has class Monday 1:00 PM – 2:30 PM. Subject name is hidden to protect student privacy."
  - *Burnout State:* "Warning: Exceeds 4h/day Burnout Cap (5.5h vs 4h limit). Take care of your health!"
  - *Success State:* "Timesheet approved! Payout ready for release without platform commissions."

---

# PART 2: LANDING ONLY
*(Do NOT use inside app dashboard screens)*

The following features belong strictly to the marketing surface (`src/app/page.tsx`, `src/components/landing/*`):

1. **Hero-Size Typography:**
   - `text-3xl sm:text-5xl lg:text-5xl font-black leading-[1.12]` is restricted to marketing banners.
   - App pages peak at `text-2xl` for page headings.

2. **Paper / Dot Grid Background Textures:**
   - Radial CSS dot pattern (`radial-gradient(#CBD5E1 1px, transparent 1px) 24px 24px`).
   - App pages use a clean solid canvas: `bg-[#FAF7F2]`.

3. **Hand-drawn SVG Underline Accents:**
   - Curved blue stroke under headlines (`stroke="#2563EB" strokeWidth="3.5"`).
   - In-app headers use standard typography without decorative vector highlights.

4. **Scroll-Reveal Animations & Observers:**
   - `ScrollRevealer` component with intersection observers and CSS reveal staggers.
   - App views render immediately for high-velocity productivity and zero layout shifts.

5. **Heavy Decorative Marketing Blocks:**
   - 3-column marketing value propositions, wide audience comparisons, FAQ accordion lists, and full-width dark CTA footers (`bg-[#0F172A]`).
   - App pages follow functional productivity layouts: top bar, sidebar/bottom navigation, data tables, and schedule grids (`max-w-screen-md` to `max-w-screen-lg`).

---

## Developer Implementation Reference

### Tailwind CSS Variables (`@theme inline` in `src/app/globals.css`)
```css
--color-bg: #FAF7F2;
--color-surface: #ffffff;
--color-surface-subtle: #FAF7F2;
--color-border: #0F172A;
--color-border-subtle: #E5DFD5;
--color-text: #0F172A;
--color-muted: #64748B;
--color-accent: #0F172A;

--color-class: #2563EB;
--color-work: #16A34A;
--color-conflict: #DC2626;
--color-warning: #D97706;

--shadow-hard: 2px 2px 0px 0px #0F172A;
--shadow-hard-md: 3px 3px 0px 0px #0F172A;
```
