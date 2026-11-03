# Layout contract

Casa is built for phones and a shared tablet. This file is the layout contract: breakpoints, shell chrome, page primitives and per-route grids. Visual language (color, type, depth, components) lives in [DESIGN.md](../DESIGN.md); motion presets live in [`src/lib/motion.ts`](../src/lib/motion.ts).

There is no separate desktop layout. Wide viewports are tablet tiers.

## Principles

1. **Phone is a single column over a floating bottom nav.** Content stacks; bottom padding clears the nav and the safe area.
2. **Tablet adds a left rail and denser grids.**
3. **Content follows available width, not the viewport.** Page grids use container queries (`@md`, `@xl`, `@2xl`) on `Page` or a local `@container`, so columns adapt beside the sidebar.
4. **Shell follows the viewport.** Nav switch, sidebar width and main offsets use `md` / `lg` / `xl`.
5. **No document-level horizontal scroll.** Wrap, truncate or shrink. Contained strips (scene row, filter chips) may scroll inside a bounded row, never widen the page.

## Breakpoints

Tailwind v4 defaults, no overrides.

| Prefix | Width | Owns |
|--------|-------|------|
| `sm` | ≥640px | Wider page padding; scene strip stops edge-bleed |
| `md` | ≥768px | **Phone → tablet nav switch**: rail appears, bottom nav hides |
| `lg` | ≥1024px | Rail becomes the labelled sidebar |
| `min-[1200px]` | ≥1200px | **Rooms list-detail only** (viewport + `matchMedia`, `ROOMS_SPLIT_QUERY` in `src/lib/layout.ts`). 1200 rather than 1280 leaves margin for 1280px tablets |

Rule of thumb: shell chrome uses viewport prefixes; page grids use container prefixes. The Rooms master list is the one exception and uses the viewport `min-[1200px]:` tier.

## Shell

| Piece | Phone (`< md`) | Tablet (`md+`) |
|-------|----------------|----------------|
| Primary nav | Floating bottom nav: Home, Rooms, Climate, Music, Security | Left rail `5.5rem` (`md`), labelled sidebar `15rem` (`lg+`) |
| Settings | Not in bottom nav | Sidebar footer only |
| Main offset | None | `md:pl-[5.5rem]`, `lg:pl-60` |
| Bottom inset | Clears nav + safe area | `md:pb-10` |
| Now-playing bar | Floats above the nav | `md:bottom-4`, left offset matches the rail or sidebar |

Content max width is `80rem`. Page horizontal padding steps `px-page` → `sm:px-6` → `md:px-8` → `lg:px-10`.

**Now-playing bar.** One floating pill for music and for the TV. Music shows it everywhere except `/media`. When the TV is playing or paused (and music is not playing) it shows the TV, including on `/media`, and tapping opens the remote sheet. Bottom nav, the bar and `<main>` padding derive from `--nav-h`, `--nav-offset` and `--nav-gap` in `styles.css`; change those variables, not individual offsets. Mind the bar's spacer and left offsets when changing bottom chrome.

## Primitives and tokens

- **`Page`:** `@container` plus `flex flex-col gap-section`; every route's vertical rhythm.
- **`PageHeader`:** title, optional subtitle, back control and action; respects the top safe area.
- **`EntityGrid`:** square tiles, `2 → @md:3 → @2xl:4 → @5xl:5`.
- **`CardGrid`:** wide cards, `1 → @2xl:2`; an odd last child spans the row.

| Token | Value |
|-------|-------|
| `--spacing-page` | `1rem` |
| `--spacing-section` | `1.75rem` (`2.25rem` from `md`) |
| `--spacing-touch` | `2.75rem` (minimum target) |
| Rooms aside | `16rem` |

## Routes

| Route | Phone / narrow | Wide content |
|-------|----------------|--------------|
| **Home** `/` | Stacked: summary, scenes (edge-bleed strip), favourites, around the house | `@xl` two columns `1.35fr \| 1fr`; scenes become a 2×2 grid |
| **Rooms** `/rooms`, `/rooms/$areaId` | Room card grid `2 → @lg:3 → @3xl:4`; a room opens as a full page with a back control | Viewport `1200px+`: sticky `16rem` room list beside the detail; the index redirects to the first room. Room detail is two columns at `@xl` (lights and fans, then climate, media and TV, appliances, irrigation) |
| **Climate** `/climate` | Stacked: thermostat, outside, room readings (2 columns), fans | `@xl`: thermostat beside outside; readings 3 columns |
| **Security** `/security` | Stacked: cameras, front door, house mode, water and presence | `@xl` 2×2 mosaic; cameras capped at 2 columns |
| **Music** `/media` | Fixed-height column: compact player and speaker chips, then Up next / Search fills the rest | `@xl` side by side `1fr \| 1.1fr`; left rail scrolls when short |
| **Settings** `/settings` | Stacked; reached from the sidebar only | `@2xl` two columns under the theme picker |

**Doorbell popup.** A dialog `min(100% - 1.5rem, 40rem)` wide: live view, then the activity browser (selected event, day and type filter rows, a day-grouped thumbnail grid of 3 to 5 columns by container width). It stops auto-closing once the visitor starts browsing.

## Do

- Put new page grids on an `@container` ancestor and use `@xl:` / `@2xl:` for columns.
- Keep the phone → tablet cut at `md`.
- Use `EntityGrid` for square tiles and `CardGrid` for wide cards.
- Clear the bottom nav and safe area on phone; use `md:pb-10` or a route-specific height on tablet.
- Use shared motion presets from `#/lib/motion` for entrances, presses and layout morphs.

## Don't

- Drive general content columns with viewport `xl:`; use `@xl:` so they work beside the sidebar. The Rooms list-detail is the only exception, and it must pair the viewport `min-[1200px]:` classes with `useMediaQuery(ROOMS_SPLIT_QUERY)` so the list and auto-navigation stay in sync.
- Add secondary destinations to the bottom nav without a deliberate nav redesign.
- Invent a third desktop shell; extend the tablet tiers instead.
- Let fixed widths, negative margins or wide children push the viewport sideways.
