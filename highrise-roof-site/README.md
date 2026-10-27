# Highrise Roofing NYC

Static site for [Highrise Roofing](https://highriseroof.com/), a Brooklyn roofing contractor serving all five NYC boroughs. Concept: "Built above the ordinary."

Open `index.html` through any static server (for example `python3 -m http.server`), or publish this folder with GitHub Pages. No build step.

## Scenes

1. **Entrance** – a real-time 3D home in soft daylight that fades into the page; scrolling moves the camera up toward the roof, the pointer adds parallax.
2. **Explore** – drag to orbit, scroll or pinch to zoom, pick labelled roof components (ridge, valley, chimney flashing, skylight, gutters and more).
3. **How it's built** – a cut roof section on a plinth separates into eight layers; pick one to isolate it and read what it does.
4. **Finishes** – eight shingle, standing-seam metal and slate finishes; the roof changes with a ridge-to-eave wipe.
5. **Residential / commercial** – tabbed service paths.
6. **Estimate** – a three-step guided form with a progress indicator.

## Files

- `index.html` – content (business info from highriseroof.com and its contact page)
- `styles.css` – warm cream canvas, white cards, warm-black ink, a yellow accent used only as small strokes; Fraunces 300 display serif, IBM Plex Mono for all UI text
- `site.js` – data (hotspots, finishes), tabs, guided form, motion toggle; talks to the 3D scene through `hr:*` events
- `scene.js` – renderer, lighting, camera path, interaction, hotspots, finish wipe
- `house.js`, `assembly.js`, `textures.js` – the house, the layered roof section and procedural materials
- `vendor/` – three.js r160 (MIT, see `vendor/three-LICENSE.txt`)

## Accessibility

Every 3D interaction has a button equivalent in the panel next to it (component list, layer list, finish swatches, orbit and zoom buttons). Motion is off by default for `prefers-reduced-motion` and can be paused with the button at the bottom left. Without WebGL the page still reads top to bottom.

## Before launch

The estimate form validates and shows a summary. Set `data-endpoint` on `#estimate-form` to a form service (Formspree, Basin, etc.) so requests are delivered.
