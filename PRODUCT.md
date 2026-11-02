# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A household using one home. Family members open Casa on their own phones, and there is a shared wall or table tablet. They use it in the middle of living: standing in a room, across a room, hands busy, often glancing rather than reading.

## Product Purpose

Casa is the household's dashboard for its Home Assistant home. It exists so anyone in the house can control the home in a tap or two and run music in every room without opening Home Assistant. Success is that a light, fan, TV, lock or thermostat changes before the person has stopped to think about the app.

## Positioning

A purpose-built front end for one specific home: its rooms, its devices and its Music Assistant speakers are wired in by name, instead of a generic card grid a user has to assemble.

## Operating Context

- Backed by a Home Assistant instance (hass-react over the HA websocket) and Music Assistant for playback, queue and speaker grouping. Frigate supplies doorbell events and clips.
- Ships as a PWA (Cloudflare Workers) and as a Tauri app, including an Android build with background location reporting and GitHub-based updates.
- Navigation: Home, Rooms, Climate, Music, Security. A persistent now-playing bar covers music, and TV when it is playing (tapping it opens the TV remote).
- Devices are configured in `src/config/dashboard.ts`; room structure follows that config rather than discovery.

## Capabilities and Constraints

- Quick control is the primary job: lights, fans, ceiling fan and light kits, locks, thermostat, TV remote (Android TV through a `remote.*` entity), vacuum.
- Music in every room is the second job: Music Assistant search, queue and speaker selection, including an "Everywhere" player.
- Security is secondary but real: doorbell popup with live view and browsable event history, cameras, door and leak sensors.
- Touch targets are at least 44px (`--spacing-touch`).
- Wide viewports are tablet tiers of the same layout; there is no separate desktop design.
- Exact Home Assistant entity IDs, such as the TV's remote entity, are partly assumed and corrected as the owner confirms them.

## Brand Commitments

The product is named Casa and keeps its existing name and app icon. The owner has said the previous named themes are no longer relevant and the design system should be re-recorded.

## Evidence on Hand

Real device and room configuration in `src/config/dashboard.ts`, the live Home Assistant instance, and the running app. There are no testimonials, user research or analytics; do not fabricate any.

## Product Principles

1. One or two taps for anything done daily; depth lives behind the tap.
2. Readable at arm's length and across a room, on a phone or a wall tablet.
3. Reflect real state honestly: show unavailable, off and offline plainly, and never imply a command worked before it did.
4. The home's own vocabulary wins: use the names people in the house actually use for rooms and devices.
5. Controls take over where the work is: the now-playing bar and remote appear when media plays, not as destinations to hunt for.
