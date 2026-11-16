# [Component Name]
### ACNRPLO Design System Component Specification

**Package / Module Path:** `src/lib/components/[path]/[ComponentName].svelte`  
**Status:** `Draft` | `In Review` | `Stable` | `Deprecated`  
**Version:** `1.0.0`  
**Last Updated:** YYYY-MM-DD  
**Owner / Author:** [Designer / Engineer Name]  

---

## 1. Description & Purpose

Provide a concise 2–3 sentence overview explaining what this component does, where it appears in the ACNRPLO user journey, and what governance or field operational problem it solves.

> **Example:**  
> The `[ComponentName]` displays [critical data/action, e.g., member quota balances and open-to-buy listings]. It standardizes [interaction pattern, e.g., two-step trade confirmations] across mobile PWA and desktop viewports, ensuring zero transactional ambiguity in bright outdoor conditions.

---

## 2. Visual Preview & Anatomy

```text
┌────────────────────────────────────────────────────────┐
│  [1] Leading Icon/Badge    [2] Primary Title           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [3] Core Metric Display / Progress Indicator    │  │
│  └──────────────────────────────────────────────────┘  │
│  [4] Secondary Metadata       [5] Action Trigger (CTA) │
└────────────────────────────────────────────────────────┘
```

### Component Anatomy
1. **[1] Leading Element / Badge**: (e.g., Status Pill `Active Poll`, Category Tag `LEDET Quota`, or Species Icon).
2. **[2] Primary Title / Identifier**: (e.g., Poll Title or Member Portion name rendered in `--font-h3` semi-bold).
3. **[3] Core Data / Visual Gauge**: (e.g., Multi-segment quota progress bar, voting weight pill in `--font-mono`).
4. **[4] Secondary Context / Metadata**: (e.g., Secretary timestamp, closing time remaining, or legal clause citation).
5. **[5] Action Element**: (e.g., Primary CTA button `48px` height with `--elevation-1`).

---

## 3. Code Implementation & Props Specification (Svelte 5)

### TypeScript Props Interface (`$props()`)
```typescript
/**
 * Props for [ComponentName]
 */
export interface [ComponentName]Props {
  /** Primary identifier or label */
  title: string;
  /** Unique ID for DOM accessibility and ARIA pairing */
  id?: string;
  /** Primary value, quantity, or voting weight */
  value?: number | string;
  /** Visual variant reflecting semantic state */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Disabled state (e.g. for non-voting Associate Members or zero remaining quota) */
  disabled?: boolean;
  /** Asynchronous action loading indicator */
  loading?: boolean;
  /** Error message displayed in helper slot */
  errorMessage?: string;
  /** Optional callback triggered on primary action */
  onaction?: (event: CustomEvent<any>) => void;
}
```

### Svelte 5 Usage Example
```svelte
<script lang="ts">
  import [ComponentName] from '$lib/components/[ComponentName].svelte';

  let currentWeight = $state(14.25);
  let isSubmitting = $state(false);

  function handleAction() {
    isSubmitting = true;
    // Handle submission logic
  }
</script>

<[ComponentName]
  title="2026 Quota Off-Take Proposal"
  value={currentWeight}
  variant="primary"
  loading={isSubmitting}
  onaction={handleAction}
/>
```

---

## 4. Design Tokens Applied

| Token Category | Token Name | Value (Light Mode) | Value (Dark Mode) | Component Role |
|:---|:---|:---|:---|:---|
| **Color: Surface** | `--color-bg-surface` | `#FFFFFF` | `#1A221C` | Card/component background |
| **Color: Primary** | `--color-primary` | `#2D4A2B` | `#4E7A4A` | Brand accent, active focus ring |
| **Color: Text** | `--color-text-primary` | `#151B17` | `#F4F6F2` | High-contrast title and metrics |
| **Color: Muted Text**| `--color-text-secondary`| `#4D594F` | `#9AA69C` | Timestamps and supporting metadata |
| **Color: Border** | `--color-border` | `#DCE2DA` | `#2D3930` | Structural card perimeter border |
| **Typography** | `--font-h3` | `1.25rem` (20px) / `600` | Same | Component title |
| **Typography** | `--font-mono` | `1.125rem` (18px) / `600` | Same | Tabular values (hectares, votes, head) |
| **Spacing** | `--space-sm` | `16px` (`1.00rem`) | Same | Internal container padding |
| **Spacing** | `--space-2xs` | `8px` (`0.50rem`) | Same | Gaps between icons and text |
| **Elevation** | `--elevation-1` | `0 1px 3px rgba(...)` | `0 1px 3px rgba(...)` | Resting surface depth |

---

## 5. Detailed Interactive States

| State | Light Mode Styles | Dark Mode Styles | Expected Interaction Feedback |
|:---|:---|:---|:---|
| **Default (Rest)** | Surface `#FFFFFF`, Border `#DCE2DA`, Shadow `--elevation-1` | Surface `#1A221C`, Border `#2D3930`, Shadow `--elevation-1-dark` | Resting state on initial page render |
| **Hover** | Border `#B0BCAD`, Shadow `--elevation-2`, Lift `translate-y-[-1px]` | Border `#415245`, Shadow `--elevation-2-dark`, Lift `translate-y-[-1px]` | Desktop pointer device proximity feedback |
| **Focus-Visible** | Outline `2px solid #2D4A2B`, Offset `2px` | Outline `2px solid #4E7A4A`, Offset `2px` | Visual keyboard tab navigation indicator |
| **Active (Pressed)**| Scale `0.98`, Bg `#F7F8F5` | Scale `0.98`, Bg `#121814` | Tactile spring down-press feedback |
| **Disabled** | Opacity `0.5`, Bg `#F1F3EE`, Cursor `not-allowed` | Opacity `0.5`, Bg `#121814`, Cursor `not-allowed` | Inactive state (e.g. Associate Member restrictions) |
| **Error / Invalid** | Border `#B91C1C`, Ring `3px rgba(185,28,28,0.15)` | Border `#F87171`, Ring `3px rgba(248,113,113,0.25)` | Validation failure; renders inline error message |

---

## 6. UX Guidelines (Do's and Don'ts)

| ✅ Do | ❌ Don't |
|:---|:---|
| **Do** anchor primary interactive triggers in the lower 35% thumb zone for mobile screens. | **Don't** bury high-frequency actions (like *Log Hunt* or *Submit Vote*) in nested flyout menus. |
| **Do** always format ownership percentages and vote weights using tabular figures (`--font-mono`). | **Don't** allow decimal percentages to misalign vertically across list rows. |
| **Do** require a two-step confirmation dialog before committing weighted votes or quota exchanges. | **Don't** commit irreversible governance or financial changes on an accidental single tap. |
| **Do** accompany every color status badge with explicit text (e.g. "Available", "Reserved", "Closed"). | **Don't** rely on green/amber/red indicators alone without textual description. |
| **Do** ensure touch targets span at least `48 × 48 CSS px` to accommodate outdoor field usage. | **Don't** cluster small action links with less than `8px` of separation. |

---

## 7. Accessibility (A11y) & Assistive Technology

Conforms strictly to **WCAG 2.1 Level AA** standards.

### 7.1 Touch Target & Viewport Ergonomics
- **Touch Target Boundary**: Minimum bounding box of `48 × 48 CSS px` on all interactive targets.
- **Font Scaling**: Standard body and input text never drops below `16px` (`1.0rem`) to prevent mobile browser auto-zooming.
- **Outdoor Contrast**: Minimum text-to-background contrast ratio of `4.5:1` in both light and dark themes.

### 7.2 Keyboard Navigation
- `Tab`: Shifts focus into the component's first focusable element.
- `Shift + Tab`: Shifts focus back to the previous interactive element.
- `Space / Enter`: Triggers action buttons, opens dropdowns, or selects options.
- `Escape`: Closes open popovers, bottom sheets, or expanded cards.
- `Arrow Keys`: Navigates between segmented options (e.g. Agree / Disagree / Abstain).

### 7.3 ARIA Attributes & Screen Reader Support
- **Labels**: Interactive elements without visible text must include `aria-label` (e.g. `aria-label="Delete hunt log entry for 14 September"`).
- **Described By**: Form inputs must link to helper/error text using `aria-describedby="[component-id]-error"`.
- **Invalid State**: Must toggle `aria-invalid="true"` when validation fails.
- **Dynamic Updates**: Asynchronous operations (e.g. live AI generation or quota balance recalculation) must declare `aria-live="polite"`.
- **Role Scoping**: Segmented choices must use `role="radiogroup"` with individual options using `role="radio"` and `aria-checked="true|false"`.
