# Ronin Design System

The visual contract for the app. Every page, component, and future feature follows
these rules so the product stays coherent. When in doubt, copy an existing pattern
from `components/` rather than inventing a new one.

**Direction:** modern, fresh, clean, smooth. Soft corners, quiet borders, layered
shadows, gentle motion. Never edgy: no harsh borders, no saturated rainbow palettes,
no abrupt transitions.

---

## 1. Color

Brand tokens live in `tailwind.config.ts` (single source of truth; mirrored as CSS
vars in `src/styles/globals.css`). The scheme is fixed — black ink, gold, cream —
but use the scale variants freely.

| Token       | Base      | Use                                                                               |
| ----------- | --------- | --------------------------------------------------------------------------------- |
| `primary`   | `#0e0e10` | Nav shell, dark surfaces, headings (`primary-800/900` for softer darks)           |
| `secondary` | `#b9a15e` | Primary actions, active states, progress, brand accents. Scale `secondary-50…950` |
| `accent`    | `#fce5a0` | Highlights, hover washes, badges. Scale `accent-50…500`                           |
| `surface`   | `#f7f7f5` | Page background (`surface`), wells (`surface-muted`), cards (`white`)             |

Rules:

- Page background is `bg-surface` (warm off-white), never `bg-gray-50`.
- Tint washes use alpha variants: `bg-secondary/10`, `hover:bg-secondary/15`.
- Semantic status only: green = under budget / positive, red = over budget / destructive,
  amber = warning. Use the 600 shades for text (`text-green-600`), 50–100 for chips.
- Never introduce arbitrary hues (purple, indigo, pink) for decoration. Chart series
  colors come exclusively from `components/recharts/theme.tsx`.

## 2. Surfaces & elevation

- Cards: `card-surface` class (rounded-2xl, `border-gray-200/70`, `shadow-card`).
- Clickable cards: `card-interactive` (adds hover lift `-translate-y-0.5` + `shadow-lifted`).
- Shadows are layered and soft (`shadow-soft` / `shadow-card` / `shadow-lifted`),
  never `shadow-xl` hard drops.
- Radii: cards `rounded-2xl`, buttons/inputs `rounded-xl`, chips `rounded-full`,
  hero/featured surfaces `rounded-4xl`. Nothing below `rounded-lg`.

## 3. Typography

- Font: Geist (already wired in root layout).
- Page titles: `text-xl sm:text-2xl font-semibold tracking-tight text-gray-900`.
- Section titles: `text-sm font-semibold text-gray-900`.
- Metric values: `font-bold tracking-tight tabular-nums`.
- Labels/captions: `text-xs font-medium text-gray-500`.
- Currency and numbers always get `tabular-nums` so columns don't jitter.

## 4. Motion

- Standard: `transition-all duration-200 ease-out`. Page/list entrances:
  `animate-fade-in-up` (sparingly — hero card or list container, not every item).
- Hover: lift cards (`-translate-y-0.5`), brighten buttons; press: `active:scale-[0.98]`.
- Progress bars animate width with `transition-all duration-500 ease-out`.
- Honor `prefers-reduced-motion` (handled globally in `globals.css`).

## 5. Layout & responsive (mobile first)

- Mobile is the primary target. Design every view at 375 px first, then enhance.
- Desktop: fixed `SideNav`. Mobile: slim top header (logo + menu) **plus**
  `MobileBottomNav` tab bar — the primary mobile navigation. Content needs
  bottom padding (`pb-24 lg:pb-8`) so it clears the tab bar.
- Touch targets ≥ 44 px on mobile. Action icons that appear on hover on desktop must
  be always-visible (or reachable) on mobile — hover does not exist on touch.
- Spacing rhythm: page gutter `px-4 sm:px-6 lg:px-8`; grid gaps `gap-3 sm:gap-4 lg:gap-6`.
- Stat grids: `grid-cols-2 lg:grid-cols-4`. Chart grids: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
- Horizontal scroll with `scrollbar-hide` is acceptable for tab rows on mobile.

## 6. Charts (Recharts)

All theme values come from `components/recharts/theme.tsx`:

- Series colors: `CHART_COLORS` (gold-anchored muted palette). Group colors
  (Needs/Wants/Investment): `GROUP_COLORS`. Status: `STATUS_COLORS`.
- Axes: spread `chartAxisProps`; grid: `chartGridProps` (horizontal lines only).
- Tooltips: `contentStyle={chartTooltipStyle}` + `labelStyle={chartTooltipLabelStyle}`
  - `itemStyle={chartTooltipItemStyle}` — dark rounded tooltip, no default white box.
- Empty data: render `<ChartEmptyState icon={...} message="..." />`, never a bare div.
- Prefer **AreaChart with a soft gradient fill** over LineChart for trends; donut
  (`innerRadius`) over solid pie; rounded bar corners `radius={[6, 6, 0, 0]}`.
- Wrap charts in `ChartContainer` (`components/recharts/ChartWrapper.tsx`).
- Format money with `formatCompactCurrency` on axes, `formatChartCurrency` in tooltips.

## 7. Components

- **Buttons**: use `components/Button.tsx` variants — `primary` (gold), `secondary`
  (ink), `outline`, `ghost`, `danger`. Never hand-roll button styles.
- **Stat tiles**: `components/StatsCard.tsx` — icon chip + label + value.
- **Page headers**: `components/PageHeader.tsx` — title, description, actions.
- **Empty states**: icon in a soft circle (`bg-surface-muted`), one-line headline,
  short helper text, single primary action.
- **Badges/chips**: `rounded-full px-2.5 py-0.5 text-xs font-medium` with a 50/100
  tint background + 700 text (e.g. `bg-green-50 text-green-700`).
- **Progress bars**: track `bg-gray-100 rounded-full h-2`, fill colored by status
  (gold in-progress, green complete, red over).
- **Modals**: backdrop `bg-primary-950/40 backdrop-blur-sm`, panel `rounded-2xl
shadow-lifted animate-scale-in`.
- **Toggle rows** (on/off preferences, e.g. Settings → Features): a row with
  label + one-line description on the left, a pill switch on the right —
  `role="switch"` `aria-checked`, track `h-7 w-12 rounded-full`, `bg-secondary`
  when on / `bg-gray-200` when off, white thumb `h-5 w-5 rounded-full
shadow-soft` translating via `translate-x-6` / `translate-x-1`. Disabled
  rows (e.g. non-admin viewers) drop to `opacity-50 cursor-not-allowed` and
  pair with a one-line helper explaining who can change it. Stack rows in a
  `card-surface` with `divide-y divide-gray-200/70`.

## 8. Voice & content

- Sentence case everywhere ("Create budget", not "Create Budget").
- Empty states encourage: "No transactions yet — add your first one."
- Destructive actions always confirm via `DeleteConfirmationModal`.

## 9. Adding a new page (checklist)

1. `bg-surface` page background, content inside the standard gutter.
2. `PageHeader` at the top; mobile padding offsets from `ConditionalLayout`.
3. Cards use `card-surface` / `card-interactive`.
4. Charts use the shared theme; money uses `formatCurrency` from `lib/utils`.
5. Check at 375 px: touch targets, bottom-nav clearance (`pb-24 lg:pb-8`), no
   hover-only actions.
6. Run `pnpm check` (lint + typecheck) before committing.

## 10. Notifications (bell + panel)

Introduced with in-app/push notifications (Feature 5). Reuse this pattern for
any future alert/inbox UI rather than inventing another one.

- **Bell button**: `components/notifications/NotificationBell.tsx` — a 44px
  icon button (`Bell` from lucide-react) with an unread-count badge
  (`bg-secondary`, `text-primary-950`, pill, top-right of the icon, "9+" once
  it clips). Lives in the dark `SideNav` header row (`variant="dark"`) and the
  light `MobileHeader` action row (`variant="light"`, default) — both gated on
  the account's `notifications` feature toggle being on.
- **Panel**: `components/notifications/NotificationPanel.tsx` — the standard
  `Modal` in `sheet` variant (bottom sheet on mobile, centered dialog at
  `sm:` and up), titled "Notifications", with a "Mark all as read" button in
  the footer when there's anything unread. Rows: a `bg-secondary` unread dot,
  title (`text-sm font-medium`), body (`text-xs text-gray-500`, 2-line clamp),
  relative timestamp (`text-xs text-gray-400`). Clicking a row marks it read
  and navigates to its target (see `notificationLink.ts`); empty state
  follows the standard icon-in-a-circle + headline + helper text pattern.
- **Settings toggles**: per-trigger and push on/off rows use the shared
  `components/settings/ToggleRow.tsx` (extracted from the Features tab) — the
  same switch described in §7 "Toggle rows", never a bespoke checkbox.
