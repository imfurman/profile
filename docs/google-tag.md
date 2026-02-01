# Google Tag (gtag.js)

## Overview
Adds the Google tag (gtag.js) snippet to every page so analytics can be collected site-wide.

## Why / Goals
Provide a single, consistent Google Analytics tag across all pages without manual per-page edits.

## Behavior
The gtag snippet is injected immediately after the opening <head> element in the base layout, so every rendered page includes the tag.

## Data & Files
- Layout: `themes/minimal/layouts/_default/baseof.html`

## Interfaces (CLI/API)
None.

## Configuration
- Measurement ID: `G-8W73VYNJNX`

## Usage Examples
Build or serve the site and verify the tag appears in the page source.

## Testing
- Run the site locally and confirm the snippet is present in the rendered HTML.

## Risks / Migration Notes
- Do not add another Google tag elsewhere or it will double-count pageviews.
