# Landing page assets

## 🟡 Open slot: `rage.jpg`

The Rage Room card has **no photograph**. Drop a file in at `assets/rage.jpg` and it appears
automatically — no code change. Until then the card shows a typographic RAGE panel, which is
styled to look deliberate, so the page ships fine either way.

**Spec**

| | |
|---|---|
| Filename | `rage.jpg` (exact — the `<img>` already points at it) |
| Ratio | **4:3 landscape** (the card crops to `aspect-ratio:4/3`) |
| Size | ~1000×750 is plenty; the card renders at ~580px wide on desktop |
| Format | JPEG, progressive, quality ~78–82 |
| Weight | **keep under ~120KB.** This is a paid-traffic page — every KB is LCP |

After adding it, update the `alt` text in `index.html` to describe the actual image (search for
`DROP-IN SLOT`).

**Why the slot is empty:** every rage-room photo in the client's WordPress media library (44 items,
checked 2026-07-31) shows a **sledgehammer** — the tool Jessica removed from the floor after people
hit her walls with it. Most also show old CRT televisions, which the page's own FAQ says are not
allowed. So none of them could be used.

⚠️ **Do not generate a photorealistic room interior.** We have never photographed this venue, so any
depicted room misrepresents what customers will actually walk into — the same "unrealistic
expectations" problem Jessica raised about the electronics and the canvas. Safe subjects: the
action itself, the gear, or the aftermath, isolated on a plain background. A real photo from
Jessica beats all of them.

## Current files

| File | What it is | Source |
|---|---|---|
| `hero.jpg` | Abstract neon splatter, used as the hero background behind a heavy dark gradient | Client's own artwork (`Layer-83.png` from her WordPress media library) |
| `paint.jpg` | Radiant Wreck card — three people in **real PPE**: white coveralls, goggles, orange booties | Client's own `activities.jpg`. Matches what Bookeo lists as included |
| `logo.png` | Header + footer wordmark | Client |
| `favicon.png` | 64×64 tab icon | Client's `wreck-favicon.png`, downscaled from 500×500 / 203KB |

**Total weight: ~348KB**, down from 2264KB. Keep it that way.

## Caching

`netlify.toml` serves `/assets/*` with `max-age=31536000, immutable`. If you change an asset's
*contents*, change its *filename* too — otherwise the old file is served from cache for a year.
