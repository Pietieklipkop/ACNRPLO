# ACNRPLO — Design System Principles & Guidelines
### Atherstone Collaborative Nature Reserve — Private Land Owners Platform

**Role:** Principal UX/UI Designer  
**Scope:** ACNRPLO Progressive Web App (PWA)  
**Target Platform:** Desktop, Tablet & Mobile (iOS / Android PWA)  
**Compliance Target:** WCAG 2.1 Level AA Standard  
**Date:** 18 September 2026  

---

## 1. Core Design Pillars

### I. Authoritative Governance Clarity
*Every parcel percentage, voting weight, and quota allocation represents a legally significant property asset with zero tolerance for ambiguity.* The interface prioritises mathematical precision and explicit ownership boundaries, ensuring that members instantly distinguish between personal entitlements, peer quotas, and collective reserve assets without cognitive strain.

### II. Bushveld-Grade Field Resilience
*Members regularly interact with the platform outdoors in intense African sunlight, from open vehicles, or under erratic field connectivity.* UI elements demand high-contrast typography, generous touch targets, and distraction-free layouts engineered to remain effortlessly glanceable and operable on mobile screens under direct glare.

### III. Transparent Stewardship & Collective Trust
*The platform replaces informal WhatsApp communication with an indisputable, tamper-evident source of truth for co-owners.* Every governance action—from voting and quota trading to hunting logs and constitutional AI citations—is communicated through deliberate, non-accidental interactions supported by clear audit trails that reinforce trust among members.

---

## 2. Accessibility Commitment Statement (WCAG 2.1 AA)

> **ACNRPLO is committed to providing a fully inclusive, barrier-free digital governance platform accessible to all landowners and associates, strictly complying with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standard.**
>
> To uphold this commitment across both desktop and mobile PWA contexts, we adhere to four foundational guarantees:
>
> 1. **High-Glare Contrast Ratios**: A strict minimum contrast ratio of `4.5:1` for standard text and `3.0:1` for large text, interface controls, and graphical data representations (quota rings, ownership bars, status badges). Color palettes are calibrated specifically to remain legible in harsh outdoor sunlight.
> 2. **Multi-Sensory State Communication**: Color is never used as the sole conveyor of information. Poll states (*Draft*, *Open*, *Closed*), quota capacities (*Available*, *Reserved*, *Exhausted*), and vote choices (*Agree*, *Disagree*, *Abstain*) are consistently accompanied by explicit text labels, distinct iconography, and numerical values.
> 3. **Field-Grade Touch Ergonomics**: All interactive elements (voting buttons, quota incrementers, calendar date pickers, navigation items) meet or exceed the `48 × 48 CSS px` minimum touch target size with at least `8px` of physical clearance to prevent accidental touches in moving vehicles or when wearing field gloves.
> 4. **Semantic Integrity & Assistive Tech Compatibility**: Native HTML5 semantic elements (`<main>`, `<nav>`, `<article>`, `<dialog>`), strict keyboard accessibility, ARIA live regions for streaming Cloudflare AI responses, and descriptive screen-reader labels for complex data tables ensure seamless operation for all assistive technologies.

---

## 3. Visual Hierarchy Guidelines

These design principles directly establish the spatial, typographic, and interaction hierarchy of the ACNRPLO application:

### 3.1 Three-Tier Typographic Scale (Information Density)

Governance data must be scannable in seconds. We enforce three strict information tiers:

1. **Tier 1 — Critical Assets & Totals (`text-2xl` to `text-4xl`, Tabular Bold)**:
   - Reserved for primary numerical assets: Member Ownership Percentage (`12.45%`), Calculated Vote Weight (`12.45 votes`), Total Quota Remaining (`14 Impala`), and Poll Time Remaining (`Closes in 2d`).
   - Must use tabular figures (`font-mono` or `font-feature-settings: 'tnum'`) so multi-digit numbers align vertically for effortless comparison across portions.
2. **Tier 2 — Structural Anchors & Entities (`text-sm` to `text-base`, Semi-Bold / Font-Medium)**:
   - Member names, parcel portion titles, species names, poll titles, and navigation categories.
   - High visual contrast against card backgrounds to anchor scanning eyes.
3. **Tier 3 — Governance Context & Audit Metadata (`text-xs`, Regular, Muted Slate/Stone)**:
   - Secretary timestamps, uploader attribution, constitutional clause references (`Clause 4.2(b)`), and audit event IDs. Provides verification context without distracting from core operational metrics.

---

### 3.2 Spatial Zones & Touch Hierarchy (Mobile PWA)

To support seamless field usage on smartphones alongside full desktop usability:

- **The Member Identity Bar (Top Zone — 15% Screen Height)**:
  - Displays the logged-in member's name, active assigned roles (e.g. `Main PLO Member` + `Executive`), and their registered land ownership percentage (`14.2%`).
  - Anchors situational awareness on every view so members never wonder whose account or permissions are active.
- **The Core Decision Canvas (Middle Zone — 65% Screen Height)**:
  - Card-based layouts featuring clear vertical grouping and high visual contrast.
  - Houses active polls, quota ledgers, shared calendar events, and document lists.
  - Information density is balanced with generous whitespace (`gap-4` to `gap-6`) to prevent visual overload.
- **The Primary Action Zone (Bottom Thumb Zone — 20% Screen Height)**:
  - Mobile bottom navigation and high-frequency action triggers (e.g., *Log Hunt*, *Book Reserve Visit*, *Cast Vote*, *Ask AI Assistant*) are anchored within easy reach of the thumb.
  - Critical write actions feature bottom sheets with two-step confirmation dialogs to prevent accidental submissions.

---

### 3.3 Governance & Voting Interaction Hierarchy

Voting and quota transactions require deliberate visual weighting to reflect their legal weight:

- **Voting Modals & Poll Cards**:
  - The poll question is presented prominently with an explicit badge indicating status (`Active Poll` or `Closed — Final Result`).
  - The voter's exact weight is shown dynamically beside the options: *"Your vote holds a weight of 12.45%"*.
  - Vote choices are clearly separated by shape, iconography, and color:
    - **Agree**: Solid Emerald button with checkmark icon (`Heroicons check-circle`).
    - **Disagree**: Solid Rose/Crimson button with cross icon (`Heroicons x-circle`).
    - **Abstain**: Neutral Slate/Stone outline button with minus-circle icon (`Heroicons minus-circle`).
  - Includes a pre-submission review step showing the selected choice, vote weight, and an explicit *"Confirm & Submit Vote"* button.

---

### 3.4 Quota & Financial Ledger Visual Coding

Quota categories must be immediately distinguishable to prevent allocation errors:

- **Category Separation**:
  - **LEDET Quota**: Deep Forest Green header badge (`Government Reserve Allocation`).
  - **PLO Collective Quota**: Warm Earth/Amber badge (`Collective Reserve Asset — Sale/Capture`).
  - **Individual PLO Quota**: Slate Blue/Navy badge (`Personal Member Allocation`).
- **Quota State Badges**:
  - **Open to Buy / Available**: Green pill with lock-open icon.
  - **Reserved / In Escrow**: Amber pill with clock icon.
  - **Exhausted / Fully Hunted**: Muted grey pill with zero balance.
- **Price Transparency**:
  - All Secretary-set prices for collective game capture and member buy/sell are displayed in South African Rand notation (`R 4,500.00 / head`) using bold monospace formatting.

---

### 3.5 Natural & Dignified Semantic Color Palette

The color system draws from the natural Atherstone bushveld landscape while ensuring uncompromising contrast:

| Token | Name | Hex Code | Purpose & Usage |
|---|---|---|---|
| `primary` | **Atherstone Earth** | `#2D3A29` (Deep Acacia) | Primary branding, top headers, authoritative titles |
| `primary-content` | **Bone White** | `#F8FAF6` | High-contrast text on primary elements |
| `secondary` | **Savanna Clay** | `#8B5E3C` (Rich Ochre) | Secondary actions, active category filters, member highlights |
| `accent` | **Bushveld Gold** | `#C28E3A` (Warm Amber) | Highlights, quota open-to-buy badges, attention callouts |
| `neutral` | **Granite Slate** | `#1E242B` | Primary body text, high-contrast borders |
| `base-100` | **Parchment Surface** | `#FFFFFF` (Card) / `#F5F6F3` (Canvas) | Crisp, glare-resistant surfaces for sunlight legibility |
| `success` | **Reserve Canopy** | `#15803D` (Deep Green) | Quota available, agree vote, verified hunt log |
| `warning` | **Low Quota Amber** | `#B45309` (Burnt Orange) | Approaching quota limit, poll closing soon |
| `error` | **Alert Crimson** | `#BE123C` (Ruby Red) | Quota exceeded, disagree vote, account deactivated |
