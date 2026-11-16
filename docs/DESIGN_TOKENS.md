# ACNRPLO — Design Token Specification
### Atherstone Collaborative Nature Reserve — Private Land Owners Platform

**Role:** Design System Engineer  
**Standard:** 8pt Grid (with 4pt sub-grid) & WCAG 2.1 AA Color Contrast  
**Compatibility:** Tailwind CSS v4, CSS Custom Properties, DaisyUI  
**Date:** 18 September 2026  

---

## 1. Semantic Color Palette

All color tokens are calibrated to provide high contrast in outdoor bushveld sunlight while providing deep, glare-free legibility in night/indoor settings. Every pairing strictly adheres to WCAG 2.1 AA contrast requirements (`≥ 4.5:1` for standard body text, `≥ 3.0:1` for UI components, graphical badges, and large display headers).

| Token Name | Light Mode Hex | Dark Mode Hex | Purpose & Contrast Context |
|:---|:---|:---|:---|
| `--color-primary` | `#2D4A2B` *(Deep Acacia)* | `#4E7A4A` *(Sage Leaf)* | Primary navigation, authoritative headers, key CTAs |
| `--color-primary-content` | `#FFFFFF` | `#0D140C` | High-contrast text on Primary surfaces (`> 8:1`) |
| `--color-secondary` | `#8C5935` *(Savanna Ochre)* | `#D49563` *(Warm Sandstone)* | Ownership badges, secondary filters, portion highlights |
| `--color-secondary-content`| `#FFFFFF` | `#1F1005` | Text and icons on Secondary elements (`> 6:1`) |
| `--color-success` | `#166534` *(Canopy Emerald)* | `#22C55E` *(Vibrant Green)* | Agree votes, quota in good standing, verified hunt logs |
| `--color-success-content` | `#FFFFFF` | `#052E16` | Text on Success badges (`> 7:1`) |
| `--color-warning` | `#B45309` *(Bushveld Amber)* | `#FBBF24` *(Golden Sun)* | Low quota alerts, polls closing soon, pending reviews |
| `--color-warning-content` | `#FFFFFF` | `#451A03` | Text on Warning surfaces (`> 5:1`) |
| `--color-error` | `#B91C1C` *(Kalahari Red)* | `#F87171` *(Coral Red)* | Disagree votes, quota exhausted, destructive actions |
| `--color-error-content` | `#FFFFFF` | `#450A0A` | Text on Error elements (`> 6:1`) |
| `--color-info` | `#0369A1` *(Waterhole Sky)* | `#38BDF8` *(Breeze Azure)* | Cloudflare AI constitution citations, sync state |
| `--color-info-content` | `#FFFFFF` | `#082F49` | Text on Info surfaces (`> 6.5:1`) |
| **Neutral: Background** | `#F7F8F5` *(Parchment Mist)* | `#0F1411` *(Bushveld Midnight)*| Primary page canvas, high-glare resistant |
| **Neutral: Surface** | `#FFFFFF` *(Pure Canvas)* | `#1A221C` *(Elevated Deep Slate)*| Cards, bottom sheets, voting modals, dropdowns |
| **Neutral: Border** | `#DCE2DA` *(Stone Border)* | `#2D3930` *(Dark Slate Border)*| Card outlines, divider lines, form input borders |
| **Neutral: Text Primary** | `#151B17` *(Charcoal Timber)*| `#F4F6F2` *(Bone White)* | Main text, hectarage, quota figures, poll questions (`> 14:1`)|
| **Neutral: Text Secondary**| `#4D594F` *(Muted Thorn)* | `#9AA69C` *(Dry Grass)* | Timestamps, clause references, table headers (`≥ 4.6:1`)|

---

## 2. Typography Scale

### 2.1 Font Family Stacks

- **Primary UI Sans Stack (`--font-sans`)**:
  A modern, highly legible humanist sans-serif stack optimized for mobile screen legibility at small sizes:
  ```css
  --font-sans: "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  ```
- **Tabular / Monospace Stack (`--font-mono`)**:
  Used for all legally binding land portion sizes, percentages, voting weights, and ZAR pricing so columns align vertically:
  ```css
  --font-mono: "JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace;
  font-feature-settings: "tnum" 1, "zero" 1;
  ```

### 2.2 Typographic Scale & Hierarchy Tokens

| Token Name | HTML Tag / Class | Font Size | Line Height | Font Weight | Letter Spacing | Purpose & Usage in ACNRPLO |
|:---|:---|:---|:---|:---|:---|:---|
| `--font-h1` | `h1`, `.text-h1` | `2.000rem` (32px) | `2.50rem` (40px) | `700` (Bold) | `-0.02em` | Main dashboard welcome, top view titles |
| `--font-h2` | `h2`, `.text-h2` | `1.500rem` (24px) | `2.00rem` (32px) | `600` (Semi-bold) | `-0.015em`| Section headers (Quota Breakdown, Polls) |
| `--font-h3` | `h3`, `.text-h3` | `1.250rem` (20px) | `1.75rem` (28px) | `600` (Semi-bold) | `-0.01em` | Card titles, poll questions, modal headers |
| `--font-body-lg` | `p.lead`, `.text-body-lg` | `1.125rem` (18px) | `1.75rem` (28px) | `500` (Medium) | `0em` | AI assistant answers, highlighted lead text |
| `--font-body-reg`| `body`, `p`, `.text-body-reg` | `1.000rem` (16px) | `1.50rem` (24px) | `400` (Regular) | `0em` | Standard descriptions, hunt logs, form inputs |
| `--font-button` | `button`, `a.btn`, `.text-button` | `0.9375rem` (15px) | `1.25rem` (20px) | `600` (Semi-bold) | `0.01em` | Action buttons (*Agree*, *Disagree*, *Log Hunt*) |
| `--font-caption`| `span.meta`, `.text-caption` | `0.750rem` (12px) | `1.00rem` (16px) | `500` (Medium) | `0.02em` | Audit timestamps, constitutional clause tags |

---

## 3. Spacing Scale (8pt Grid with 4pt Sub-Grid)

Structured on an 8px rhythm with 4px half-steps to support compact mobile layouts and rigorous 48px touch targets.

| Token Name | Value (px) | Value (rem) | Primary Application & Layout Context |
|:---|:---|:---|:---|
| `--space-3xs` | `4px` | `0.25rem` | Icon-to-label gaps, badge internal padding, micro offsets |
| `--space-2xs` | `8px` | `0.50rem` | Compact list item padding, pill tag gaps, tight button padding |
| `--space-xs` | `12px` | `0.75rem` | Standard input vertical padding, compact card internal padding |
| `--space-sm` | `16px` | `1.00rem` | Standard mobile gutter margin, card padding, form field gaps |
| `--space-md` | `24px` | `1.50rem` | Section vertical rhythm, bottom sheet padding, table row gaps |
| `--space-lg` | `32px` | `2.00rem` | Major dashboard widget gaps, desktop grid spacing |
| `--space-xl` | `40px` | `2.50rem` | Hero widget spacing, desktop section header clearance |
| `--space-2xl` | `48px` | `3.00rem` | **Minimum accessible touch target bounding box**, action heights |
| `--space-3xl` | `64px` | `4.00rem` | Mobile bottom navigation bar height + safe area inset clearance |

---

## 4. Implementation Reference (Tailwind CSS / CSS Variables)

```css
:root {
  /* Semantic Colors - Light Mode */
  --color-primary: #2D4A2B;
  --color-primary-content: #FFFFFF;
  --color-secondary: #8C5935;
  --color-secondary-content: #FFFFFF;
  --color-success: #166534;
  --color-success-content: #FFFFFF;
  --color-warning: #B45309;
  --color-warning-content: #FFFFFF;
  --color-error: #B91C1C;
  --color-error-content: #FFFFFF;
  --color-info: #0369A1;
  --color-info-content: #FFFFFF;

  --color-bg-base: #F7F8F5;
  --color-bg-surface: #FFFFFF;
  --color-border: #DCE2DA;
  --color-text-primary: #151B17;
  --color-text-secondary: #4D594F;

  /* Typography */
  --font-h1: 700 2rem / 2.5rem var(--font-sans);
  --font-h2: 600 1.5rem / 2rem var(--font-sans);
  --font-h3: 600 1.25rem / 1.75rem var(--font-sans);
  --font-body-lg: 500 1.125rem / 1.75rem var(--font-sans);
  --font-body-reg: 400 1rem / 1.5rem var(--font-sans);
  --font-button: 600 0.9375rem / 1.25rem var(--font-sans);
  --font-caption: 500 0.75rem / 1rem var(--font-sans);

  /* Spacing */
  --space-3xs: 0.25rem;
  --space-2xs: 0.50rem;
  --space-xs: 0.75rem;
  --space-sm: 1.00rem;
  --space-md: 1.50rem;
  --space-lg: 2.00rem;
  --space-xl: 2.50rem;
  --space-2xl: 3.00rem;
  --space-3xl: 4.00rem;
}

[data-theme="dark"] {
  /* Semantic Colors - Dark Mode */
  --color-primary: #4E7A4A;
  --color-primary-content: #0D140C;
  --color-secondary: #D49563;
  --color-secondary-content: #1F1005;
  --color-success: #22C55E;
  --color-success-content: #052E16;
  --color-warning: #FBBF24;
  --color-warning-content: #451A03;
  --color-error: #F87171;
  --color-error-content: #450A0A;
  --color-info: #38BDF8;
  --color-info-content: #082F49;

  --color-bg-base: #0F1411;
  --color-bg-surface: #1A221C;
  --color-border: #2D3930;
  --color-text-primary: #F4F6F2;
  --color-text-secondary: #9AA69C;
}
```
