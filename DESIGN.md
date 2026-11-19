# Ronin Design System

The visual contract for the app. Every page, component, and future feature follows
these rules so the product stays coherent. When in doubt, copy an existing pattern
from `components/` rather than inventing a new one.

**Direction:** modern, fresh, clean, smooth. Soft corners, quiet borders, flat
surfaces with soft layer shadows, gentle motion. Never edgy: no harsh borders, no saturated rainbow palettes,
no abrupt transitions.

---

## 1. Color

Brand tokens live in `tailwind.config.ts` (single source of truth; mirrored as CSS
vars in `src/styles/globals.css`). The scheme is fixed (Obsidian & Brass: warm
black ink, brass, ivory), but use the scale variants freely.

| Token       | Base      | Use                                                                                         |
| ----------- | --------- | ------------------------------------------------------------------------------------------- |
| `primary`   | `#17150f` | Obsidian. Nav shell, dark surfaces, headings (`primary-800/900` for softer darks)           |
| `secondary` | `#8c6a1e` | Brass. Primary actions, toggles, focus, progress, brand accents. Scale `secondary-50…950`   |
| `accent`    | `#f2e6c4` | Champagne/gilt. Highlights, badges, and gold on always-dark surfaces. Scale `accent-50…500` |
| `surface`   | `#fbfaf6` | Ivory page background (`surface`), wells (`surface-muted`), cards (`white`)                 |

Rules:

- Page background is `bg-surface` (warm ivory), never `bg-gray-50`. The gray ramp is
  warm (stone), so neutrals sit with the brass.
- `secondary` is CSS-variable backed and re-ramped in dark mode (fills turn gilt,
  `text-secondary-600…900` turn light gold), so the same classes work in both themes.
- Text on a solid `bg-secondary` fill is always `text-secondary-foreground` (white in
  light, obsidian in dark). Never `text-primary-950` or `text-white` on brass.
- Gold on an always-dark surface (`SideNav`, auth pages, `bg-primary` hero cards) uses
  the fixed gilt `accent-400` (`text-accent-400`, `bg-accent-400/15`), not `secondary`,
  which would flip to dark brass in light mode.
- Keep brass off progress bars that show "near limit": it sits close to the amber
  warning color. Gold progress means in-progress only.
- Selected navigation (tabs, the bottom tab bar, its More sheet) is ink
  (`gray-900`), not brass: brass means "you can act here", ink means "you are here".
- Tint washes use alpha variants: `bg-secondary/10`, `hover:bg-secondary/15`.
- Semantic status only: green = under budget / positive, red = over budget / destructive,
  amber = warning. Use the 600 shades for text (`text-green-600`), 50–100 for chips.
- Never introduce arbitrary hues (purple, indigo, pink) for decoration. Chart series
  colors come exclusively from `components/recharts/theme.tsx`.

## 2. Surfaces & elevation

- Cards: `card-surface` class (rounded-2xl, `border-gray-200/70`, `shadow-card`).
- Clickable cards: `card-interactive`. No hover elevation: hover only firms the
  border. Cards never lift, scale or gain shadow on hover.
- **Flat by default.** Shadow marks a layer change (page → card → popover → modal),
  never emphasis. Shadows are layered and soft (`shadow-soft` / `shadow-card` /
  `shadow-lifted`), never `shadow-xl` hard drops.
- **No nested cards.** One card layer on the page ground; inside a card, separate
  groups with `divide-y divide-gray-200/70` hairlines or a `bg-surface-muted` well.
- No gradient text, no colored left/right accent stripes on cards.
- Radii: cards `rounded-2xl`, buttons/inputs `rounded-xl`, chips `rounded-full`,
  hero/featured surfaces `rounded-4xl`. Nothing below `rounded-lg`.

## 3. Typography

- Font: Geist (already wired in root layout).
- Page titles: `text-xl sm:text-2xl font-semibold tracking-tight text-gray-900`.
- Section titles: `text-sm font-semibold text-gray-900`.
- Metric values: `font-semibold tracking-tight tabular-nums`.
- Summary headline: `text-2xl sm:text-[28px]` regular, with the one amount that
  matters in `font-semibold` brass (red when it is a shortfall).
- Labels/captions: `text-xs font-medium text-gray-500`.
- Currency and numbers always get `tabular-nums` so columns don't jitter.

## 4. Motion

- Standard: `transition-colors duration-150 ease-brand` (`ease-brand` is the one
  brand curve, in `tailwind.config.ts`). Animate color, opacity and transform only.
  Page/list entrances: `animate-fade-in-up` (sparingly, hero card or list
  container, not every item).
- Hover and press change color only: no lift, no `active:scale-*`. The one
  exception to color/opacity/transform is progress-bar width, below.
- Progress bars animate width with `transition-all duration-500 ease-out`.
- Honor `prefers-reduced-motion` (handled globally in `globals.css`).

## 5. Layout & responsive (mobile first)

- Mobile is the primary target. Design every view at 375 px first, then enhance.
- Desktop: fixed `SideNav`. Mobile: slim top header (logo + menu) **plus**
  `MobileBottomNav` tab bar, the primary mobile navigation. Content needs
  bottom padding (`pb-24 lg:pb-8`) so it clears the tab bar.
- Mobile chrome: the top header is frosted glass (`bg-surface-card/75
  backdrop-blur-[18px] backdrop-saturate-[1.8]`) so content dissolves under it.
  The bottom tab bar is flat `bg-surface-card` with a `border-t`; the active tab
  gets a 2px `bg-gray-900` top indicator, a semibold `text-gray-900` label and
  `aria-current="page"`; inactive tabs have a `gray-500` icon and a `gray-600` label.
- Touch targets ≥ 44 px on mobile. Action icons that appear on hover on desktop must
  be always-visible (or reachable) on mobile — hover does not exist on touch.
  Add `tap-target` to icon buttons and pills (44 px minimum below `lg`); pair a
  `lg:group-hover:opacity-100` reveal with `lg:group-focus-within:opacity-100`.
  A clickable `div` gets `pressable(onPress)` from `lib/utils` (role, tabIndex, Enter/Space).
- Spacing rhythm: page gutter `px-4 sm:px-6 lg:px-8`; grid gaps `gap-3 sm:gap-4 lg:gap-6`.
- Figures: `MetricStrip` (2 columns on phones, one row from `lg`). Chart grids: `grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`.
- Horizontal scroll with `scrollbar-hide` is acceptable for filter tab rows on
  mobile (`<Tabs scroll>`). Section tabs that are the only route to a view
  scroll only when they cannot fit, with the selected tab centred (see Section
  tabs below).

## 6. Charts (Recharts)

All theme values come from `components/recharts/theme.tsx`:

- Series colors: `CHART_COLORS` (brass-anchored muted palette). Group colors
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

- **Buttons**: use `components/Button.tsx` variants: `primary` (brass), `secondary`
  (ink), `outline`, `ghost`, `danger`. Never hand-roll button styles. Flat fills:
  default, hover and pressed are each their own color (`enabled:hover:` /
  `enabled:active:`), no shadow or press scale, and disabled is a grey block
  (`bg-gray-200 text-gray-500`), not a faded fill. Sizes: `md` 44px (default),
  `lg` 48px, `sm` 44px on mobile and 32px from `lg`.
- **Tabs**: `components/Tabs.tsx` for every tab, filter and range strip. Underline
  tabs: bare `text-base font-medium` labels with no track, inactive
  `text-gray-500`, active `text-gray-900` over a 2px `border-gray-900` rule,
  counts in a small `tabular-nums` span. `size="compact"` is the chart range
  strip (12px labels, 1px rule sitting on the strip's own gray-200 hairline
  divider). Strips wrap unless `scroll` is set. Route tab rows that render `Link`s
  (Budget, Savings, Transactions and Recurring) use the exported
  `tabClassName` with `aria-current="page"`; Settings uses `Tabs` itself. Never put `Tabs` on a
  `bg-surface-muted` well: inactive `gray-500` text falls below AA there.
- **Section tabs**: a page's sections (a budget's Overview to Cards, a savings
  account's Overview and Allocations, Transactions and Recurring, the Settings
  sections) are an in-page underline tab row under the page header at every
  width, never a floating dock. Below `lg` the row sticks under the header
  (`sticky top-0`: the scroller's `pt-32` already clears the fixed headers; frosted `bg-surface/90 backdrop-blur-md` with a hairline), so
  sections stay one tap away on long lists. A budget's month switcher sits above its tabs on
  phones. A row with more sections than fit at 375px (budget, settings) scrolls
  sideways with the selected tab centred (`centerSelected` from `Tabs.tsx`, which
  sets `scrollLeft` so the page never jumps). The budget row drops its icons on
  phones; Settings keeps them.
- **Floating add button**: below `lg`, `PageHeader` shows the page's primary
  action as a 56px brass `+` circle (`rounded-full`, `shadow-lifted`: it floats
  over content, a layer change) at the bottom right, on the page gutter and 16px
  above the bottom
  tab bar, with the action's label as its `aria-label`; from `lg` it is the
  header button. Every primary action is an "Add …" / "New …", so `+` always
  fits; one that isn't needs its own icon first. The shell's `pb-16` plus the
  page's `pb-28` already keep it clear of the last row.
- **No stat-card grids.** Page figures go in `components/MetricStrip.tsx`:
  `<MetricStrip>` of `<Metric label value hint valueClassName />` cells split by
  hairlines, on the page ground, edge to edge on phones (`-mx-4`) and a rounded
  hairline band from `sm`. No icon chips. An odd last metric spans both phone
  columns.
- **Summary headline**: `components/SummaryHeadline.tsx` answers the page's main
  question in one sentence above its `MetricStrip` (Reports: what you kept). Wrap the amount in `HeadlineAmount`. One per page,
  only where the page has a single answer; don't repeat that figure in the strip.
- **Action rows**: `components/ActionRow.tsx` for the shortcuts a page exists to
  offer (Home: add transaction, new event, current budget). 64px `rounded-2xl`
  `bg-surface-muted` row, `text-base font-semibold` title over a one-line
  description, 40px brass disc with the icon. On phones they sit above the
  page's lists (`order-first lg:order-none`). Navigation, so they are `Link`s.
- **Lists inside a card**: hairline rows (`divide-y divide-gray-200/70` on the
  list, `py-3` rows), never bordered or tinted boxes per row. An inline edit
  form may keep its highlighted box.
- **Page headers**: `components/PageHeader.tsx`: title, description, actions.
  The primary action (`action`, or the first `actions` entry with
  `variant: "primary"`) is never hidden in a menu: a header button from `lg`,
  the floating add button below it. The rest collapse into the mobile menu.
- **Empty states**: icon in a soft circle (`bg-surface-muted`), one-line headline,
  short helper text, single primary action.
- **Badges/chips**: `rounded-full px-2.5 py-0.5 text-xs font-medium` with a 50/100
  tint background + 700 text (e.g. `bg-green-50 text-green-700`).
- **Progress bars**: track `bg-gray-100 rounded-full h-2`, fill colored by status
  (brass in-progress, green complete, red over).
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
- Empty states encourage: "No transactions yet. Add your first one."
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
  (`bg-secondary` + `text-secondary-foreground` on light, `bg-accent-400` + `text-primary-950` on the dark nav; pill, top-right of the icon, "9+" once
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
