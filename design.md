---
name: Casa
description: A household home dashboard of frosted glass panes over soft light, with a warm amber glow for anything that is on.
colors:
  glass-ink: "#141a2e"
  glass-ink-muted: "#454956"
  glass-ink-faint: "#4a4e5c"
  glass-base: "#e4e5ec"
  glass-pane: "#ffffff73"
  glass-pane-strong: "#ffffffd1"
  glass-edge: "#ffffffcc"
  glass-on-light: "#8a5a10"
  glass-on-glow: "#f8e6c4"
  glass-success: "#1b6e4c"
  glass-danger: "#b23a24"
  glass-info: "#2a58a6"
  night-base: "#0c0f22"
  night-ink: "#ffffff"
  night-pane: "#ffffff22"
  night-on-light: "#ffd59a"
  night-glow: "#ffc879"
  night-success: "#8ef3c7"
  night-danger: "#ffa392"
  forest-base-dark: "#0b1914"
  forest-ink-dark: "#f3f8f1"
  forest-light-dark: "#ffcf6b"
  forest-base-light: "#e3ebe4"
  forest-ink-light: "#10241d"
  forest-light-light: "#8a5608"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  numeral:
    fontFamily: "Plus Jakarta Sans, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Plus Jakarta Sans, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Plus Jakarta Sans, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: "1.375rem"
  label:
    fontFamily: "Plus Jakarta Sans, Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: "1.125rem"
rounded:
  control: "1.125rem"
  card: "1.5rem"
  sheet: "1.875rem"
  pill: "9999px"
spacing:
  page: "1rem"
  section: "1.75rem"
  touch: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.glass-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.25rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.glass-ink}"
    rounded: "{rounded.pill}"
    height: "3rem"
    padding: "0 1.25rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.glass-ink-muted}"
    rounded: "{rounded.pill}"
    height: "2.75rem"
    padding: "0 0.875rem"
  chip-selected:
    backgroundColor: "{colors.glass-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    height: "2.75rem"
    padding: "0 0.875rem"
  card:
    backgroundColor: "{colors.glass-pane}"
    textColor: "{colors.glass-ink}"
    rounded: "{rounded.card}"
    padding: "1rem"
---

# Design System: Casa

## Overview

**Creative North Star: "The Lit Window"**

Casa is a window onto the house. Panes of frosted glass float over a soft, slowly drifting field of light, and the home's controls sit on those panes. Anything that is on, playing or open carries the warm amber of a lit window; everything else stays cool, quiet and translucent. The screen is read at arm's length and across a room, so state is communicated by type size, one warm color and contrast, not by dense decoration.

Two themes carry the identity. **Glass** is the default: frosted white panes over lavender, cream and cool-grey light in the light mode, and the same glass over a deep indigo mesh in the dark mode. **Forest** is its photographic sibling: the same glass construction over a misty pine forest at dawn, with an autumn-gold light. Both ship a light and a dark mode that follow the system by default. Walnut and Modern still exist in code as legacy themes, are not part of the design identity, and should not be extended. Walnut is the only theme that uses Fraunces (serif); it is loaded for that theme alone and is not part of the Casa type system.

The system is soft and tactile: generous radii, pill-shaped controls, a visible press, and large touch targets. It is a tool for a household first, so it never performs; delight comes from light and material, not decoration.

**Key Characteristics:**
- Frosted translucent panes (blur 14px) over a fixed, living background; never opaque slabs.
- One warm accent, the amber "light", marks active state; the ink color is the interactive fill.
- Pills for actions and selection, large rounded rectangles for containers.
- Large touch targets (44px minimum) and room-readable type.
- One motion language of short exponential ease-out transitions and layout springs; a reduced-motion preference removes movement (scale, travel, drift, spin) but keeps fades and color changes so feedback still lands.

## Colors

A cool, nearly neutral glass palette with a single warm voice. Surface colors are alpha values over the background, so the same tokens read correctly over the blobs in Glass and the photograph in Forest.

### Primary
- **Midnight Ink** (`#141a2e` light / `#ffffff` dark in Glass; `#10241d` light / `#eef6ea` dark in Forest): text, and the fill of the primary action and selected chip. In dark modes the fill inverts to white with dark text. Choice equals inversion.

### Secondary
- **Window Amber** (Glass light `#8a5a10`, Glass dark `#ffd59a`, Forest dark `#ffcf6b`, Forest light `#8a5608`): the "something is on" voice. Icon color for lit devices, glow on active tiles, selection highlight tint. Used only to say a device is active.
- **Glow Gradient** (Glass `#ffffff` → `#f8e6c4`, dark `#fff3dc` → `#ffc879`): the filled state of an active tile (`bg-on`), with dark ink on top.

### Neutral
- **Pane White** (`#ffffff73`, strong `#ffffffd1`, hover `#ffffffd9`): card and sheet fills in light modes.
- **Frost Night** (`#ffffff22`, hover `#ffffff33`, edge `#ffffff38`): the same panes in dark modes, lightened rather than darkened.
- **Glass Base** (`#e4e5ec` light, `#0c0f22` dark; Forest `#e3ebe4` / `#0b1914`): the color behind the background layer and the browser chrome.
- **Muted and Faint Ink** (`#454956` / `#4a4e5c` on light glass; `#ffffffd6` / `#ffffffb8` on dark): secondary text, tuned to hold AA over the blobs.
- **Status**: success `#1b6e4c` / `#8ef3c7`, danger `#b23a24` / `#ffa392`, info `#2a58a6` / `#a6dcff` (light / dark).

### Named Rules
**The One Warm Voice Rule.** Amber means "on". It is never used for decoration, hover, or branding. If everything glows, nothing is on.

**The Alpha Surface Rule.** Surfaces are translucent colors over a background layer, never opaque fills. Read contrast against the worst point of the background, not the average.

## Typography

**Display, Body and Label Font:** Plus Jakarta Sans (with Geist, then system-ui)
**Character:** One friendly geometric sans at four weights does every job. Display is the same face set heavier and tighter, so the system reads as one voice, calm and slightly warm.

### Hierarchy
- **Display** (600, `1.5rem`, 1.2, -0.025em): sheet and page titles, room names.
- **Numeral** (600, `1.75rem` to `2.75rem`, 1, -0.025em, tabular): the few glanceable readings, such as the house summary counts, room temperature and the page title on large screens. Larger sizes (up to `4rem` for the thermostat setpoint) are the same step scaled by context, not new steps.
- **Title** (600, `1.125rem`, 1.3, -0.025em): card titles, device and now-playing names.
- **Body** (400, `0.9375rem`, `1.375rem`): descriptions, captions, status lines. Keep status lines short; they truncate rather than wrap.
- **Label** (600, `0.8125rem`, `1.125rem`): chips, nav labels, segmented options, counts. Use tabular numerals for times and counts.

### Named Rules
**The Arm's Length Rule.** Anything a person acts on (names, times, state) is at least body size. Nothing is set below `0.8125rem` (the Label size); that is the floor for forecasts, queue positions, captions and error lines. Dense secondary text uses Label, never a smaller literal size.

## Layout

Phone is a single column over a floating bottom navigation; tablet adds a left rail and denser grids. Content follows the available width through container queries (`@md`, `@xl`, `@2xl`), while shell chrome follows the viewport (`md`, `lg`, `xl`). Spacing is a small rhythm: page padding `1rem`, section gap `1.75rem` (`2.25rem` from `md`), tile gaps `0.5rem` to `0.75rem`, and a `2.75rem` touch minimum for any target.

Navigation geometry derives from shared variables (`--nav-h`, `--nav-offset`, `--nav-gap`) so the bottom nav, the now-playing bar and the page padding never drift apart. The full breakpoint table, shell offsets and per-route grids are in `docs/layout.md`.

## Elevation & Depth

Depth is made of light, not weight. A pane is lifted by an inner top highlight and a long, soft, low-contrast shadow below it; sheets lift further. Blur separates layers. Active devices glow rather than rise.

### Shadow Vocabulary
- **Pane** (`box-shadow: inset 0 1px 0 #fff, 0 12px 32px -20px #1d224059` light; `inset 0 1px 0 #ffffff40, 0 24px 48px -24px #04061a99` dark): cards, tiles, rows.
- **Lit** (`0 0 0 1px #ffffff66, 0 18px 48px -12px #ffc879a6`): active tiles and the glowing `bg-on` fill.
- **Sheet** (`inset 0 1px 0 #ffffff33, 0 -24px 60px -24px #04061acc`): bottom sheets, floating nav and now-playing bar.

### Named Rules
**The Light-Not-Weight Rule.** Never stack hard or zero-blur shadows. Elevation is an inner highlight plus a soft downward spread, and an active glow is the only colored shadow.

## Shapes

Soft and rounded throughout. Containers use `1.5rem`; controls `1.125rem`; sheets `1.875rem` at the top; actions, chips, segmented controls and navigation use full pills. Borders are 1px hairlines of white-over-glass that catch the edge of a pane. Icons are Lucide at a 1.75 stroke. Media thumbnails use a control-sized radius so they sit inside the pane without competing with it.

## Components

### Buttons
- **Shape:** full pill (`9999px`), heights `2.75rem` / `3rem` / `3.25rem`, icon button `3rem` square.
- **Primary:** Midnight Ink fill with inverse text; hover deepens to pure black or white.
- **Secondary:** transparent with a 1px glass border; hover fills with the hover pane.
- **Ghost:** no border; muted ink that brightens on hover.
- **Danger:** transparent with a danger border and tint.
- **Press:** scale to 0.97 with a 150ms ease-out; reduced motion removes the scale and keeps the color change.

### Chips and Segmented Controls
- **Chip:** pill, `2.75rem` tall, 1px border, muted ink. Selected is the primary fill with a count at 70% opacity. Rows scroll horizontally inside their own bounds and never widen the page.
- **Segmented:** a pill track on the hover pane; the selected option slides as a shared-layout pill.

### Cards / Containers
- **Corner Style:** `1.5rem`.
- **Background:** Pane White or Frost Night with a 14px backdrop blur.
- **Border:** 1px glass hairline plus the Pane shadow.
- **Internal Padding:** `1rem` to `1.25rem`; tiles in grids use `0.75rem` gaps.

### Navigation
A floating pill on phone, inset `0.875rem` from the bottom: icons with the active tab expanding to icon plus label on an ink pill. The tablet rail carries the same items vertically. The now-playing bar floats above the nav as a second pill and is shared by music and TV; tapping it opens the relevant surface (the music page, or the TV remote in a sheet).

### Sheets
Bottom drawers for a device's full controls: a drag handle, a title in Display, content below, `1.875rem` top radius, lifted with the Sheet shadow over a dimmed scrim.

### Signature: the Lit Tile
A device tile whose off state is a quiet pane and whose on state fills with the Glow Gradient, dark ink and the Lit shadow. It is the strongest use of the One Warm Voice Rule: read the room by scanning for glowing tiles.

### Signature: the TV Remote
A sheet-ready remote: power in the header, a d-pad on a rounded well with a filled OK key, Back and Home as wide keys, a volume rocker and channel rocker as tall pills, and sources as chips. Keys are rounded squares on the base pane; the OK key and play button use the primary fill.

## Do's and Don'ts

### Do:
- **Do** let translucency do the work: panes over the background layer with a 14px blur.
- **Do** use Window Amber only to indicate that something is on, playing or active.
- **Do** keep every touch target at least `2.75rem`, and primary actions pill-shaped.
- **Do** use tabular numerals for times, counts and scores.
- **Do** treat light and dark as peers: check contrast against the worst point of the background in both.
- **Do** take timing, easing and springs from `src/lib/motion.ts` and the CSS motion tokens. Toggles and thumbs use ease-out; nothing overshoots a command that has not been confirmed.
- **Do** give reduced motion a quieter equivalent: a busy spinner becomes a slow fade, not a frozen icon.
- **Do** keep the visible control and the hit area separate when an icon button must look small: the target stays `2.75rem`.

### Don't:
- **Don't** extend or reference Walnut or Modern in new work; they are legacy themes.
- **Don't** put amber on decoration, hover states or branding.
- **Don't** use opaque slabs, hard offset shadows, or zero-blur block shadows.
- **Don't** hide state in color alone; pair it with a label, icon or text.
- **Don't** let a horizontal scroller widen the page; contain it in a bounded row.
- **Don't** set text below `0.8125rem`, or use a bounce or overshoot curve.
- **Don't** nest cards inside cards; separate groups with spacing and headings instead.
