[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/kochak05/kochak05-kochak05-gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/kochak05/kochak05-kochak05-gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

# Vice Cover Studio

An offline web app that turns your photos and a caption into poster-style
cover art, and exports it as a PNG to share. Built for the make.fun bounty
"Make GTA 6 Cover Art".

## How it works

1. Add photos from your machine (or load the two built-in samples).
2. Pick a layout: hero split, four panels, or sunset strip.
3. Click a photo, then click a panel to put it there. Drag a panel to move
   its photo, use the zoom slider to crop it.
4. Write the headline and subline, pick the headline colour and size.
5. Pick a colour grade (Sunset, Neon night, Palm dusk, Clean) and an export
   size: 1080 × 1080, 1080 × 1350 or 1920 × 1080.
6. Export PNG — the cover is drawn on a canvas at the exact size and
   downloaded. Nothing is uploaded anywhere; photos never leave your machine.

## Run it

    node serve.ts

then open http://localhost:8080. No build step, no network requests: every
script, style, font and sample photo is a file under `app/`.

## Files

- `app/index.html`, `app/style.css` — the editor page.
- `app/src/app.js` — the editor wiring: uploads, panel picking, drag-to-pan,
  caption, grade and export controls.
- `app/src/cover.js` — the canvas renderer: panels, colour grades, vignette
  and the bold caption lettering.
- `app/fonts/` — Bebas Neue and Anton, both under the SIL Open Font License
  (license texts beside them).
- `app/samples/` — two image-model-made sample photos, free to use.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — the cover (first by name) and the editor at work.

Everything here is original: no game logos, artwork or fonts are used.
