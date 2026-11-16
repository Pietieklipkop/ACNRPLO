# ACNRPLO — Critical Component Specifications
### Atherstone Collaborative Nature Reserve — Private Land Owners Platform

**Role:** Senior Product Designer  
**Scope:** Core Progressive Web App (PWA) Touch Components  
**Target:** SvelteKit 5 + Tailwind CSS v4 + DaisyUI  
**Date:** 18 September 2026  

---

## 1. Component 1: `PrimaryActionButton` (Governance & Action Trigger)

The universal action button for high-consequence user commitments: submitting votes, logging hunted game, confirming reserve calendar bookings, and uploading legal documents.

```text
┌────────────────────────────────────────────────────────┐
│  [✓ Confirm & Submit Vote]                             │
└────────────────────────────────────────────────────────┘
```

### 1.1 Visual Anatomy
- **Height**: Fixed `48px` (`--space-2xl`) fulfilling the WCAG 2.1 AA touch target standard.
- **Padding**: Horizontal `24px` (`--space-md`), Vertical `12px` (`--space-xs`).
- **Border**: `1.5px solid transparent` (reserves border pixel to eliminate layout shift across states).
- **Border Radius**: `8px` (`rounded-lg`).
- **Shadow**: `0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)` (`shadow-sm`).
- **Icon Placement**:
  - **Leading Icon**: `20 × 20px`, `8px` right margin (`--space-2xs`) from label text.
  - **Trailing Icon**: `20 × 20px`, `8px` left margin from label text.
  - **Loading Spinner**: Replaces the leading icon seamlessly without altering button dimensions.
- **Typography**: `--font-button` (`0.9375rem` / `15px`, Weight `600`, Letter spacing `+0.01em`).

### 1.2 Interactive States

| State | Light Mode | Dark Mode | Behavior & Visual Feedback |
|:---|:---|:---|:---|
| **Default** | Bg `#2D4A2B`, Text `#FFFFFF`, Border `transparent` | Bg `#4E7A4A`, Text `#0D140C`, Border `transparent` | Rest state with subtle elevation |
| **Hover** | Bg `#223820`, Text `#FFFFFF`, Shadow `shadow-md` | Bg `#5E9159`, Text `#0D140C`, Shadow `shadow-md` | Cursor hover; slight darkening/brightening |
| **Focus** | Outline `2px solid #2D4A2B`, Offset `2px` | Outline `2px solid #4E7A4A`, Offset `2px` | High-contrast keyboard accessibility ring |
| **Active** | Bg `#1A2C18`, Scale `0.98` | Bg `#3D6339`, Scale `0.98` | Tactile spring press feedback |
| **Disabled**| Bg `#DCE2DA`, Text `#8A9687`, Cursor `not-allowed` | Bg `#242E27`, Text `#5E6D61`, Cursor `not-allowed` | Form incomplete or submission in progress |
| **Error** | Bg `#B91C1C`, Text `#FFFFFF` | Bg `#F87171`, Text `#FFFFFF` | Submission failed or retry action |

### 1.3 Responsive Behavior
- **Mobile (< 640px)**: Full width (`w-full`), permanently anchored at the bottom of sheets and voting dialogs.
- **Desktop (≥ 640px)**: Auto width (`w-auto`), min-width `160px`, aligned to the right inside modal footers.

---

## 2. Component 2: `MetricInputField` (Field Log & Data Entry Input)

Used for capturing numeric and text entries in the field: hunting logs (species count), land portion sizes (hectares), game count figures, and date selectors.

```text
┌────────────────────────────────────────────────────────┐
│  HUNTED QUANTITY (HEAD)                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  [🦌]  4                                   Head  │  │
│  └──────────────────────────────────────────────────┘  │
│  Remaining personal quota after log: 8 Head            │
└────────────────────────────────────────────────────────┘
```

### 2.1 Visual Anatomy
- **Height**: `52px` to provide generous mobile tap accuracy in outdoor conditions and prevent mobile browser zooming.
- **Padding**: Left `44px` (when leading icon is present) or `16px`, Right `52px` (when unit suffix is present) or `16px`, Top/Bottom `14px`.
- **Border**: `1.5px solid var(--color-border)` (`#DCE2DA` light / `#2D3930` dark).
- **Border Radius**: `8px` (`rounded-lg`).
- **Affixes**:
  - **Leading Icon**: `20 × 20px`, centered at `14px` from left border, muted olive slate.
  - **Trailing Unit Suffix**: E.g., `ha`, `Head`, `ZAR`, `%` anchored at `14px` right, `--font-caption` bold.
- **Label**: Positioned above input, `--font-caption` (`0.75rem` / `12px`), Weight `600`, uppercase tracking (`tracking-wider`), `6px` bottom spacing.
- **Helper/Error Subtext**: Below input, `--font-caption`, `4px` top spacing.
- **Typography**: `--font-mono`, `1.125rem` (18px), Weight `600`, Tabular figures (`tnum`).

### 2.2 Interactive States

| State | Light Mode | Dark Mode | Visual Indicator |
|:---|:---|:---|:---|
| **Default** | Bg `#FFFFFF`, Text `#151B17`, Border `#DCE2DA` | Bg `#1A221C`, Text `#F4F6F2`, Border `#2D3930` | Clean flat surface |
| **Hover** | Border `#B0BCAD` | Border `#415245` | Increased border contrast on hover |
| **Focus** | Border `#2D4A2B`, Ring `0 0 0 3px rgba(45,74,43,0.15)` | Border `#4E7A4A`, Ring `0 0 0 3px rgba(78,122,74,0.25)`| Focused glow ring; native cursor |
| **Active** | Same as Focus | Same as Focus | Immediate numeric/date keypad display |
| **Disabled**| Bg `#F1F3EE`, Text `#8A9687`, Border `#DCE2DA` | Bg `#121814`, Text `#5E6D61`, Border `#242E27` | Non-editable read-only state |
| **Error** | Border `#B91C1C`, Ring `0 0 0 3px rgba(185,28,28,0.15)` | Border `#F87171`, Ring `0 0 0 3px rgba(248,113,113,0.25)` | Error border + Red validation helper text |

### 2.3 Responsive Behavior
- **Mobile (< 640px)**: `w-full` stacked vertically with `gap-4`. Input mode automatically sets `inputmode="numeric"` or `inputmode="decimal"`.
- **Desktop (≥ 640px)**: Fits into 2-column or 3-column form grids (`col-span-1` in `grid-cols-2` / `grid-cols-3`).

---

## 3. Component 3: `GovernanceVoteCard` (Voting Poll Topic Card)

The core governance interface card displaying pre-loaded meeting topics, voter's dynamic weight based on ownership percentage, voting triggers, and live outcome bars.

```text
┌────────────────────────────────────────────────────────┐
│  [ACTIVE POLL]                       Closes in 3 days  │
│  2026 Quota Allocation & Off-Take Approval             │
│  Proposed off-take schedule as submitted by LEDET.     │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚖️ Your Vote Weight: 14.25% (Portion 3 & 4)      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  [ ✓ Agree ]       [ ✕ Disagree ]       [ ⊘ Abstain ]  │
└────────────────────────────────────────────────────────┘
```

### 3.1 Visual Anatomy
- **Header Strip**:
  - Status Pill: `Active Poll` (Emerald outline), `Draft` (Slate outline), `Closed` (Muted solid).
  - Time Remaining: `Closes in 2d 4h` (`--font-caption`, Right-aligned).
- **Body Area**:
  - Poll Topic Title: `--font-h3` (`1.25rem` / `20px`, Semi-bold).
  - Description: `--font-body-reg` (`1.00rem` / `16px`), max 3 lines clamped with "Read more".
  - Dynamic Weight Banner: Embedded sub-card displaying member's calculated voting percentage in `--font-mono`.
- **Action Strip (When Open)**:
  - 3 action buttons: `Agree` (Green), `Disagree` (Red), `Abstain` (Muted Stone).
  - Height: `44px` each.
- **Results Strip (When Closed / Post-Vote)**:
  - Tri-color segmented progress bar with Agree (Green), Disagree (Red), Abstain (Grey) percentages.
- **Padding**: `20px` (`--space-sm` / `--space-md`).
- **Border**: `1px solid var(--color-border)`.
- **Border Radius**: `12px` (`rounded-xl`).
- **Shadow**: `0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px 0 rgba(0,0,0,0.04)` (`shadow-sm`).

### 3.2 Interactive States

| State | Light Mode | Dark Mode | Visual Indicator |
|:---|:---|:---|:---|
| **Default (Open)** | Bg `#FFFFFF`, Border `#DCE2DA` | Bg `#1A221C`, Border `#2D3930` | Clean card with active vote buttons |
| **Card Hover** | Border `#B0BCAD`, Shadow `shadow-md` | Border `#415245`, Shadow `shadow-md` | Elevated card boundary |
| **Option Selected** | Selected button fills solid color; other 2 become outline-muted | Selected button fills solid color; other 2 become outline-muted | Clear confirmation of chosen stance |
| **Pre-Commit Modal** | Background dim `backdrop-blur-sm`, confirmation bottom sheet | Background dim `backdrop-blur-sm`, confirmation bottom sheet | Displays exact weighted impact before submit |
| **Voted / Closed** | Action buttons replaced by weighted results bar and user vote badge | Action buttons replaced by weighted results bar and user vote badge | Read-only audited voting record |
| **Associate Mode** | Action buttons disabled with notice: *"Associate Member (Read-Only)"* | Action buttons disabled with notice: *"Associate Member (Read-Only)"* | Non-voting restriction clearly shown |

### 3.3 Responsive Behavior
- **Mobile (< 640px)**: Full width card; voting action buttons stack vertically (`flex-col gap-2.5`) with full-width tap targets.
- **Desktop (≥ 640px)**: Fits in a 2-column dashboard layout (`grid-cols-2`); action buttons align horizontally (`flex-row gap-3`).

---

## 4. Component 4: `QuotaLedgerCard` (Species Quota & Trading Card)

The primary asset tracking card summarizing species quota (LEDET / PLO Hunting / Game Capture), remaining vs. hunted quantities, and member-to-member trading triggers.

```text
┌────────────────────────────────────────────────────────┐
│  IMPALA (Aepyceros melampus)              [PLO HUNTING]│
│                                                        │
│  Total Allocated       Hunted to Date        Remaining │
│  12 Head               4 Head                   8 HEAD │
│  [████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░] 66% left│
│                                                        │
│  [● Open to Buy: R 1,800/head]             [+ Log Hunt]│
└────────────────────────────────────────────────────────┘
```

### 4.1 Visual Anatomy
- **Header**:
  - Species Name: `--font-h3` (`1.25rem` / `20px`, Bold).
  - Scientific Name / Category: `--font-caption` (`0.75rem` / `12px`, Italic).
  - Category Badge: `LEDET`, `PLO Hunting`, or `Game Capture/Selling` pill.
- **Metrics Grid**:
  - 3-column ledger: `Total Allocated`, `Hunted to Date`, `Remaining`.
  - Remaining figure styled in Tier 1 bold typography (`--font-h2`) using canopy green.
- **Capacity Progress Gauge**:
  - Height: `8px` (`--space-2xs`), rounded full.
  - Fill: Green (`<80%` hunted), Amber (`80-99%` hunted), Red (`100%` exhausted).
- **Footer Controls**:
  - "Open to Buy" switch toggle with price display in ZAR.
  - "Log Hunt" primary button (`36px` height).
- **Padding**: `20px` (`--space-sm` / `--space-md`).
- **Border**: `1px solid var(--color-border)`.
- **Border Radius**: `12px` (`rounded-xl`).

### 4.2 Interactive States

| State | Light Mode | Dark Mode | Visual Indicator |
|:---|:---|:---|:---|
| **Default** | Bg `#FFFFFF`, Border `#DCE2DA` | Bg `#1A221C`, Border `#2D3930` | Rest state; gauge shows active allocation |
| **Hover** | Border `#B0BCAD`, Translate `translate-y-[-1px]` | Border `#415245`, Translate `translate-y-[-1px]` | Interactive hover lift |
| **Open-to-Buy ON** | Amber border highlight, badge: *"Open to Buy Listed"* | Amber border highlight, badge: *"Open to Buy Listed"* | Published to community marketplace |
| **Exhausted (0 Left)**| Gauge track filled grey/red; "Log Hunt" disabled | Gauge track filled grey/red; "Log Hunt" disabled | Zero remaining capacity badge |
| **Exchange Modal** | Bottom sheet opens with peer member select and transfer quantity | Bottom sheet opens with peer member select and transfer quantity | Quota buy/sell/exchange flow |

### 4.3 Responsive Behavior
- **Mobile (< 640px)**: Full width card; metrics stack with remaining balance prominently centered; footer buttons take full width.
- **Desktop (≥ 640px)**: Arranged in a 3-column grid (`grid-cols-3`); metrics and gauge display inline.

---

## 5. Component 5: `ConstitutionalAIChatWidget` (Cloudflare AI Query Interface)

The natural language query interface scoped exclusively to the PLO Constitution document, returning verified answers with cited articles and clauses.

```text
┌────────────────────────────────────────────────────────┐
│  [✨] What quorum is required for special resolutions? │
│  ┌──────────────────────────────────────────────────┐  │
│  │ A special resolution requires a 75% majority of  │  │
│  │ the total voting weight present or represented.  │  │
│  │                                                  │  │
│  │ 📜 Citations: [Article 12.4]  [Schedule B, §3]   │  │
│  └──────────────────────────────────────────────────┘  │
│  [ Ask another question about the Constitution...   ↗] │
└────────────────────────────────────────────────────────┘
```

### 5.1 Visual Anatomy
- **Input Pill**:
  - Full-width search input with leading Sparkles/AI icon (`20 × 20px`, Waterhole Sky Blue).
  - Trailing "Ask" button with keyboard shortcut badge (`↵ Enter`).
- **Response Container**:
  - Header: AI Badge (`Cloudflare AI Constitution Assistant`) + Generation timestamp.
  - Body: Rendered Markdown text in `--font-body-lg` (`1.125rem` / `18px`, line-height `1.75rem`).
  - Citation Strip: Interactive pill badges linking to exact constitutional articles (`[Article 12.4]`).
  - Restriction Footnote: `--font-caption` (*"Answers are generated strictly from the Atherstone Nature Reserve Constitution"*).
- **Padding**: Container `20px`, Response bubble `16px`.
- **Border**: `1.5px solid var(--color-info)` tint (`#BAE6FD` light / `#0369A1` dark).
- **Border Radius**: `16px` (`rounded-2xl`).

### 5.2 Interactive States

| State | Light Mode | Dark Mode | Visual Indicator |
|:---|:---|:---|:---|
| **Default / Idle** | Clean input pill with placeholder: *"Ask about voting rights, quotas, or rules..."* | Clean input pill with placeholder: *"Ask about voting rights, quotas, or rules..."* | Ready for member prompt |
| **Streaming Query** | Input disabled; animated pulsing indicator; live token streaming | Input disabled; animated pulsing indicator; live token streaming | Real-time Cloudflare AI inference |
| **Answer Rendered** | Response card expands with high-contrast text and interactive citation pills | Response card expands with high-contrast text and interactive citation pills | Final response displayed |
| **Citation Clicked** | Side drawer opens showing highlighted section of the official Constitution PDF | Side drawer opens showing highlighted section of the official Constitution PDF | Document verification view |
| **Out-of-Scope Query**| Amber notice: *"This question falls outside the Constitution. Consult the Secretary."* | Amber notice: *"This question falls outside the Constitution. Consult the Secretary."* | Scope guard rail active |

### 5.3 Responsive Behavior
- **Mobile (< 640px)**: Available as a dedicated bottom tab or bottom sheet drawer; input remains pinned above the mobile virtual keyboard. Citation pills wrap into a horizontally scrollable chip row.
- **Desktop (≥ 640px)**: Split-screen interface with Constitution document viewer on the left (60% width) and AI Assistant conversation panel on the right (40% width).
