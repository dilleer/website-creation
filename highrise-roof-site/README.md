# Highrise Roofing NYC

Static site for [Highrise Roofing](https://highriseroof.com/), a Brooklyn roofing contractor serving all five NYC boroughs.

Open `index.html` through any static server (for example `python3 -m http.server`), or publish this folder with GitHub Pages. No build step.

- `index.html` – page content (business info taken from highriseroof.com and its contact page)
- `styles.css` – dark ink + lime accent system adapted from the DESIGN-3 reference
- `site.js` – roof system data, layer list, borough picker, form validation, motion toggle
- `scene.js` – three.js hero house (roof lifts on scroll) and the 3D roof-layer explorer
- `vendor/three.module.min.js` – three.js r160 (MIT, see `vendor/three-LICENSE.txt`)

Accessibility: axe (WCAG 2.0/2.1/2.2 A and AA) passes with no violations at 1440 px, 640 px (200% zoom), 390 px and 320 px. Animations pause with the hero button and are off by default for `prefers-reduced-motion`; the 3D model rotates with buttons or arrow keys as well as by dragging.

The estimate form validates and then opens the visitor's email app addressed to info@highriseroof.com. Hook it up to a form service before launch.
