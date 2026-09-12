# UI Design Prompt — AIVES v2 (Refinement: Modern, Clean, Smooth)

## 0. Context
The current build (from your screenshot) correctly follows the "exam paper / red pen / AI blue ink" concept, but it's currently **too flat, a bit raw, and lacks smoothness** — because it still carries a few of the "tells" the original brief asked to avoid, and it has no layering/motion system to create a premium feel. This prompt is a **concrete patch**: it points directly at what's wrong in the UI you already built and how to upgrade it.

---

## 1. Rules from the original brief currently being violated (fix these first)

Looking at the screenshot, specific issues:

1. **The all-caps label "DEPARTMENTAL EXAMINATION BOARD" above the heading** → this is exactly the banned "all-caps eyebrow label" pattern from the first brief. Remove it entirely, or rely on the breadcrumb you already have ("Examiner Portal / Session Roster") — one layer of navigation context is enough; no eyebrow needed.
2. **The trailing `→` arrow at the end of "Open Board" and implied on "Create Exam Session"** → this is exactly the banned "trailing arrow" pattern. Drop the arrow; either use a small chevron icon set apart from the text, or drop it altogether and let the text speak for itself.
3. **Monospace overuse**: `crs-001`, `3Q + 2F`, `Open Board`, the `LEC`/`STU` badges, and `AI EXAMINER ACTIVE` are all currently set in a technical/monospace font. Per the original brief, monospace should be reserved for **data that genuinely needs column alignment** (scores, countdown timers). Course codes, role badges, and status labels should go back to a regular sans — right now it reads too much like a code editor and loses the "exam paper" feel.
4. **Cards are single-layer flat**: thin border + uniform white background with no depth → they read as "empty." Add a **layering system** to feel more modern without falling back on the default grey SaaS shadow.
5. **The "SCHEDULED" badge uses a default rounded pill** — per the brief it should be square, like a stamp; right now it's rounded like every other app.
6. **No motion anywhere** — everything is completely static, including the "●" dot next to "AI Examiner Active" (this is actually the single most logical place for a gentle pulse/breathing animation, signaling the system is "alive").

---

## 2. Upgrades to reach a "modern, clean, smooth" feel

### 2.1 Spacing rhythm & grid
- Use a consistent 8px scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Increase whitespace around the page title and between cards — margins are currently tight. Most of "clean" comes from **letting content breathe**, not from adding more detail.
- Content cards: minimum 24px internal padding; 20–24px gap between cards (currently close to this, can be nudged up slightly).

### 2.2 Depth without the default grey shadow — "layered paper"
Instead of a generic `rgba(0,0,0,.1)` drop shadow like every other UI, create depth through:
- **Two subtly different background layers**: page background stays `#F5F5F0` (paper) → cards sit on top with a background 2–3% brighter (`#FFFFFF` or `#FBFAF7`), combined with a `1px` border in a slightly darker tone (`#E4E1D4`) than the default border.
- **A very soft, warm-tinted shadow instead of pure grey**: `box-shadow: 0 1px 2px rgba(36,35,31,0.04), 0 8px 20px rgba(36,35,31,0.05)` — two layers, spread wide but very low opacity, so the card feels like it's "resting gently on the paper" rather than having a plastic-looking SaaS shadow glued under it.
- **A status color strip on the card's left edge** (4px, colored by status: stamp-blue = scheduled, green = in progress, grey = completed) instead of relying only on the corner badge — this adds an information layer visible at a glance and adds compositional depth.

### 2.3 Typography — sharper contrast so it reads as "clean," not flat
- Increase the page heading's weight/size relative to the breadcrumb and the description ("Exam Sessions & Schedule Wall") — hierarchy currently reads too even; widen the gap between H1 (serif, ~32–36px, weight 600) and the supporting text (14px, weight 400, faded-ink color).
- Session titles inside cards ("Viva Exam — SWD392 Midterm") should stay serif but move up one size step from the current build, so they act as the card's visual anchor; the course subtitle underneath uses a small sans in a lighter color — creating a clear two-tier contrast within the same card.
- Change the course code `crs-001` from monospace to small sans, faded-ink color, normal letter-spacing — it doesn't need font emphasis; its position at the top of the card is enough.

### 2.4 Specific components to fix

**Exam session card:**
```
┌ (4px status color strip on the left) ──────────┐
│  crs-001                          [■ Scheduled]│
│                                                 │
│  Viva Exam — SWD392 Midterm     (serif, larger)│
│  Software Architecture and Design (sans, faded)│
│  ─────────────────────────────────────────────│
│  📅 Sep 15, 2026    📄 3 main · 2 follow-up    │
│                                    Open board  │
└─────────────────────────────────────────────────┘
```
- Status badge: very light tinted background matching the status color (light stamp-blue for Scheduled), text in a darker shade of the same hue, **small square corners (2px radius)**, not a pill.
- Drop the `→` on "Open board"; make the entire card clickable instead (pointer cursor across the whole card) — on hover, the card lifts slightly `translateY(-2px)` and the border darkens, without adding a heavier shadow.
- Spell out "3Q + 2F" as "3 main · 2 follow-up" — avoid terse code-style abbreviations, staying true to the original brief's "write for the user to understand immediately" voice.

**Sidebar:**
- The currently selected nav item ("Exam Schedule Board") needs a more distinct background — right now it only has a border. Add a light beige background `#EFEDE3` plus a 3px status-color strip on its left edge (reusing the same "status strip" language as the cards).
- "AI EXAMINER ACTIVE" badge: drop the all-caps → "AI Examiner Active", keep the stamp-blue outline, and give the dot next to it **a gentle pulse animation** (scale 1 → 1.15, opacity 1 → 0.6, ~2s cycle, ease-in-out) — this is the single most fitting place to show "the system is alive"; don't reuse this animation elsewhere.
- The "Switch Identity" list below: drop monospace from the `LEC`/`STU` role badges, use small sans instead; the selected item gets a stronger border plus the same light-beige background treatment.

**"Create Exam Session" button:**
- Keep the red-pen background, but remove the arrow entirely; the `+` icon should sit evenly spaced from the text, aligned to the same baseline. On hover: brighten the background by ~5% with no position shift — this keeps the feeling of a firm, serious primary action, distinct from the "bouncier" hover of secondary buttons.

### 2.5 Motion spec — for an overall "smooth" feel
| Element | Trigger | Property | Duration | Easing |
|---|---|---|---|---|
| Exam session card | hover | translateY, border-color | 160ms | ease-out |
| Primary button (red) | hover | background brightness | 120ms | ease-out |
| "AI Examiner Active" dot | continuous | scale, opacity | 2000ms loop | ease-in-out |
| Route/page transition | navigation | opacity 0→1, translateY 4px→0 | 180ms | ease-out, **once per page load only, not repeated per section** |
| Transcript accordion expand | click | height, opacity | 200ms | ease-in-out |
| Search input | focus | border-color, subtle 2px ring | 120ms | ease-out |

Principle: **every transition should be short (120–200ms), except the "system is active" breathing pulse.** Don't add per-element entrance animations on page load — the "smooth" feeling comes from every interaction having an immediate, consistent response, not from lots of flying/bouncing effects.

### 2.6 Quality checklist before calling it "done"
- [ ] No remaining all-caps labels except genuinely necessary abbreviations (e.g. a course code that originates as-is from the system).
- [ ] No trailing `→` arrows left on any button/link.
- [ ] Monospace remains only on: the countdown timer, scores, and transcript timestamps.
- [ ] Every card has a left status-color strip plus a small square badge, not a pill.
- [ ] Cards show at least two contrasting background layers (page paper vs. raised card), with a clear border but no heavy grey shadow.
- [ ] There is exactly one deliberate continuous animation (the "AI Examiner Active" pulse); everything else is a 120–200ms response to hover/focus/click.
- [ ] Whitespace between blocks is increased by at least 20% compared to the current build.

---

## 3. Notes for React/CSS
- Add new tokens: `--radius-badge: 2px`, `--radius-card: 8px`, `--shadow-card: 0 1px 2px rgba(36,35,31,.04), 0 8px 20px rgba(36,35,31,.05)`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`.
- Implement the pulse with plain CSS keyframes (no library needed), applied to a standalone `<span class="status-dot">` so it can be disabled under `prefers-reduced-motion: reduce`.
- For the card's left status strip: use `border-left: 4px solid var(--status-color)` instead of a separate div, to keep the DOM lean.