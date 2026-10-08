# Illustrated portrait

## Overview
A white, single-page profile centered on the user-supplied transparent illustration of Ruslan seated on a stool. Skills sit to its left on wider screens and below it on phones; contacts stay in the footer. Outdated projects remain removed.

## Why / Goals
Make the supplied illustration the focal point and preserve its appearance exactly, with minimal copy and a quiet white layout.

## Behavior
- The portrait is an ordinary responsive image with descriptive alt text.
- Its aspect ratio and transparent background are preserved; the whole illustration stays visible.
- The page no longer loads a 3D scene, pointer tracking, backflip, or animation controls.
- Image, skills and contact links work without JavaScript and WebGL.
- The portrait is eager-loaded at high priority; explicit dimensions reserve its aspect ratio.
- Above 1050px, the header, portrait area and footer share a centered container capped at 1080px. Skills are positioned within that container, keeping them close to the portrait on large screens. Phone and tablet layouts are unchanged.

## Data & Files
- `content/_index.md`: identity, skill groups, and contact URLs.
- `themes/minimal/layouts/index.html`: semantic page and portrait image.
- `themes/minimal/static/images/ruslan-portrait.png`: the supplied 1122 × 1402 PNG, copied without pixel changes (888,415 bytes).
- `themes/minimal/static/css/main.css`: responsive layout and existing maintenance styling.
- `public/`: generated production output, tracked as in the existing repository.

The older `avatar.js`, `character-model.js`, GLBs, Three.js files, preparation script and poster remain available for a future return to 3D. The homepage does not import or request them.

## Interfaces (CLI/API)
No portrait JavaScript, backend or external image service. The image is served from the same site. Standard Hugo builds require no npm or Python installation.

## Configuration
Replace `images/ruslan-portrait.png` and update its image dimensions and alt text in the home template when changing the illustration. Adjust `.portrait-stage` and `.portrait-image` in `main.css` for sizing. Skills and contacts remain ordinary HTML. Existing domain, analytics and maintenance settings remain in `hugo.toml`.

## Usage Examples
```sh
hugo server
hugo --minify --gc --cleanDestinationDir
```
Edit the four `skills.groups` entries or contact URLs in `content/_index.md`.

## Testing
- Build with Hugo and run `git diff --check`.
- Verify the portrait loads, retains transparency and is fully visible at desktop and phone widths.
- Check that skills and contact links do not overlap the portrait or overflow the viewport.
- Verify generated HTML contains no canvas, avatar module, backflip button or pause control.
- Compare the bundled PNG with the supplied file to confirm it is unchanged.

## Risks / Migration Notes
This is a static illustration, so the previous 3D gaze and backflip are intentionally absent. The image is now a site asset, as requested. The existing external fonts and analytics behavior remains. A local build does not publish changes; GitHub Pages deployment still runs on pushes to `main`.
