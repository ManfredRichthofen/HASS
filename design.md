# Design — Mobile & Tablet Layout

Casa is a Home Assistant dashboard built for phones and tablets. This document is the layout contract: shell chrome, breakpoints, page primitives, and per-route grids as implemented today.

There is no separate desktop layout. Wide viewports are tablet tiers (`lg` labelled sidebar, `xl` Rooms list-detail).

---

## Principles

1. **Phone = single column + bottom chrome.** Primary nav is a fixed bottom tab bar. Content stacks vertically; bottom padding clears the tab bar and safe area.
2. **Tablet = side chrome + denser grids.** Primary nav is a fixed left SideNav. Content uses more columns once there is room.
3. **Content follows available width, not viewport.** Most page grids use container queries (`@xl:`, `@2xl:`, …) on `Page` (or nested `@container` wrappers) so columns adapt beside the sidebar or inside Rooms list-detail.
4. **Shell uses viewport breakpoints.** Nav switch, sidebar width, and main offsets use `md` / `lg` / `xl` on the viewport.
5. **Limit horizontal scrolling.** The page shell and route layouts must not introduce document-level sideways scroll. Prefer wrapping, truncation, or shrinking so content stays within the available width. Intentional, contained strips (e.g. Home Scenes edge-bleed) are fine when they scroll *inside* a bounded row—not when they widen the viewport.

---

## Breakpoints

Tailwind v4 defaults. No custom `--breakpoint-*` overrides.

| Prefix | Width | Owns |
|--------|-------|------|
| `sm` | ≥640px | Slightly wider page padding; SceneStrip stops edge-bleed |
| `md` | ≥768px | **Mobile → tablet nav switch**; SideNav appears; BottomNav hides |
| `lg` | ≥1024px | SideNav expands to labelled sidebar; larger horizontal padding |
| `xl` | ≥1280px | **Rooms list-detail only** (viewport + `matchMedia`) |
| `2xl` | ≥1536px | Rare as viewport; `@2xl:` is common as a **container** query |

Container query prefixes (`@md`, `@lg`, `@xl`, `@2xl`, `@3xl`, `@5xl`) use the same scale relative to the container, not the viewport.

**Rule of thumb:** shell chrome → viewport (`md:`, `lg:`, `xl:`). Page grids → container (`@xl:`, `@2xl:`). Exception: Rooms master list uses viewport `xl:`.

---

## Shell chrome

```mermaid
flowchart TB
  subgraph mobile ["Mobile under 768px"]
    MMain[Main content]
    MNow[NowPlayingBar]
    MNav[BottomNav]
    MMain --> MNow --> MNav
  end

  subgraph tablet ["Tablet 768px and up"]
    TNav[SideNav]
    TMain[Main content]
    TNow[NowPlayingBar]
    TNav --- TMain
    TMain --> TNow
  end
```

### Shared

| Constant | Value | Where |
|----------|-------|--------|
| Content max width | `80rem` | `AppShell` main |
| Page horizontal padding | `px-page` → `sm:px-6` → `md:px-8` → `lg:px-10` | `AppShell` main |
| Top padding | `pt-4` → `md:pt-8` | `AppShell` main |
| Primary nav items | Home, Rooms, Climate, Music, Security | `navItems.ts` |
| Settings | SideNav footer only (not in BottomNav) | `SideNav` |

Key files: [`AppShell.tsx`](src/components/layout/AppShell.tsx), [`SideNav.tsx`](src/components/layout/SideNav.tsx), [`BottomNav.tsx`](src/components/layout/BottomNav.tsx), [`NowPlayingBar.tsx`](src/components/layout/NowPlayingBar.tsx).

### Mobile (`< md`)

| Piece | Behavior |
|-------|----------|
| **BottomNav** | Fixed full-width (theme variants: bar / floating pill). `md:hidden`. |
| **SideNav** | Hidden |
| **Main offset** | No left pad |
| **Bottom inset** | `pb-[calc(6.5rem+safe-area)]` (walnut); modern/glass `5.25rem+safe-area` |
| **NowPlayingBar** | Fixed above BottomNav; hidden on `/media`. See NowPlayingBar details below. |

### Tablet (`md+`)

| Tier | Viewport | SideNav | Main offset |
|------|----------|---------|-------------|
| **Rail** | `md`–`lg` | Icon rail `5.5rem`; stacked icon + short label | `md:pl-[5.5rem]` on shell wrapper |
| **Labelled** | `lg+` | Sidebar `w-60` (15rem); brand “Home”; room count on Rooms | `lg:pl-60` on shell wrapper |
| **Wide** | `xl+` | Same labelled nav; Rooms becomes list + detail | unchanged |

| Piece | Behavior |
|-------|----------|
| **BottomNav** | Hidden |
| **Bottom inset** | `md:pb-10` (no tab bar clearance) |
| **NowPlayingBar** | `md:bottom-4` with `md:left-[5.5rem]` / `lg:left-60`; hidden on `/media` |

### NowPlayingBar details

When visible (playing and not on `/media`):

| Piece | Value |
|-------|--------|
| **Mobile sit height** | Walnut `bottom-[calc(5.75rem+safe-area)]`; modern/glass `5.5rem+safe-area` (above BottomNav; distinct from main `pb` clearance) |
| **Tablet sit** | `md:bottom-4`; left offset matches SideNav (`md:left-[5.5rem]` / `lg:left-60`) |
| **Horizontal padding** | `px-3` → `sm:px-5` → `md:px-8` → `lg:px-10` (tighter than page `px-page` / `sm:px-6` on small screens) |
| **In-flow spacer** | `h-[5.5rem] md:h-[5rem]` so content scrolls clear of the fixed bar |

---

## Page primitives

### `Page`

[`Page.tsx`](src/components/layout/Page.tsx) — every route’s vertical rhythm:

- `@container` so descendants can use `@xl:` / `@2xl:` against **content** width
- `flex flex-col gap-section` (`--spacing-section` = `2.5rem`)

### `PageHeader`

Title / eyebrow / subtitle / optional back + action. Respects safe-area top on phone.

### `EntityGrid`

[`EntityGrid.tsx`](src/components/entities/EntityGrid.tsx) — square tiles with its own `@container`:

`2 → @md:3 → @2xl:4 → @5xl:5`

### `CardGrid`

[`CardGrid.tsx`](src/components/layout/CardGrid.tsx) — wide cards:

`1 → @2xl:2`; odd last child spans full row

---

## Route layouts

### Home — `/`

| | Layout |
|---|--------|
| **Mobile** | Stacked: HouseSummary → Scenes (horizontal scroll, edge-bleed via `-mx-page`) → Favourites (`EntityGrid`) → Around the house |
| **Wide content (`@xl`)** | Asymmetric 2-col: `1.35fr \| 1fr` — HouseSummary \| Scenes; Favourites \| Around the house. Scenes become a 2×2 grid |

### Rooms — `/rooms`, `/rooms/$areaId`

Only route with true **master-detail**, and only at **viewport `xl` (≥1280px)**.

| | Layout |
|---|--------|
| **Mobile / tablet `< xl`** | Index: room card grid `2 → @lg:3 → @3xl:4`. Tap opens full-page detail with back control |
| **Wide tablet `xl+`** | Layout: sticky aside list (`18rem`) + detail outlet. Index auto-navigates to first room and renders nothing. Back control `xl:hidden` |
| **Room detail** | Header: capped sensor readings (temp/humidity + chips). Body `@xl` two columns: lights/fans \| climate / media / appliances / irrigation |)

### Climate — `/climate`

| | Layout |
|---|--------|
| **Mobile** | Stacked: ClimateCard → Outside → room readings (`grid-cols-2`) → fans (`CardGrid`) |
| **Wide content (`@xl`)** | Top: 2-col ClimateCard \| Outside. Readings: `@xl:grid-cols-3`. Fans: `CardGrid` (`1 → @2xl:2`) |

### Security — `/security`

| | Layout |
|---|--------|
| **Mobile** | Stacked: Cameras → Front door → House mode → Water & presence |
| **Wide content (`@xl`)** | 2×2 mosaic. Cameras capped at ≤2 columns even inside `EntityGrid` |

### Music — `/media`

| | Layout |
|---|--------|
| **Mobile** | Full-height column: compact player above segmented panel (Up next / Rooms / Search) |
| **Wide content (`@xl`)** | Side-by-side `1fr \| 1.1fr` — player left, panel right |

Height accounts for shell: phone clears bottom nav; tablet uses shorter chrome (`md:h-[calc(100dvh-8rem)]`). NowPlayingBar is hidden on this route.

### Settings — `/settings`

Reachable from SideNav only (no BottomNav item).

| | Layout |
|---|--------|
| **Mobile** | Theme full width, then stacked device / updates / connection |
| **Wide content (`@2xl`)** | Two columns for device / updates / connection under theme |

---

## Layout tokens

From [`styles.css`](src/styles.css) `@theme` (layout-relevant):

| Token | Value | Utilities |
|-------|-------|-----------|
| `--spacing-page` | `1.25rem` | `px-page`, `-mx-page` |
| `--spacing-section` | `2.5rem` | `gap-section` |
| `--spacing-touch` | `2.75rem` | `touch-target` |

Shell width constants (hard-coded in layout components):

| Role | Width |
|------|-------|
| Tablet rail | `5.5rem` |
| Labelled sidebar | `15rem` (`w-60`) |
| Rooms aside | `18rem` |
| Content max | `80rem` |

Themes (`walnut` / `modern` / `brutalist` / `glass`) change radii, borders, and nav chrome—not breakpoints.

---

## Do / don’t

**Do**

- Put new page grids on `@container` ancestors (`Page` or a local wrapper) and use `@xl:` / `@2xl:` for columns
- Keep the mobile → tablet nav cut at `md` (768px)
- Clear BottomNav + safe area on phone; use `md:pb-10` (or route-specific height) on tablet
- Use `EntityGrid` for square tiles and `CardGrid` for wide cards
- Keep layouts free of document-level horizontal scroll; contain any intentional horizontal strips

**Don’t**

- Drive general content columns with viewport `xl:` — prefer `@xl:` so they work beside the sidebar
- Add Settings (or other secondary destinations) to BottomNav without an intentional nav redesign
- Invent a third “desktop” shell; extend tablet tiers instead
- Forget NowPlayingBar sit heights, spacer, or left offsets when changing bottom chrome
- Let fixed widths, negative margins, or wide children push the viewport sideways

**Exception:** Rooms list-detail **must** use viewport `xl` (≥1280px) plus `useMediaQuery('(min-width: 1280px)')` so the master list and auto-navigation stay in sync.
