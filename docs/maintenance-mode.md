# Maintenance Mode Home Replacement

## Overview

Added a dedicated terminal-style maintenance page that can replace the home page when updates are in progress.

## Why / Goals

- Show visitors a clear "work in progress" state during updates.
- Keep the site intentionally styled instead of showing a blank or broken page.
- Provide a simple switch to turn the maintenance page on/off without touching templates.

## Behavior

- When `params.maintenance.enabled = false`, the normal home page renders.
- When `params.maintenance.enabled = true`, the maintenance page renders on `/` instead of the home content.
- The maintenance page displays:
  - Status title and message.
  - Terminal command line with typing animation.
  - Live deployment log lines with sequential "teletype" effect.
  - Sequentially appearing action lines.
  - Closing ETA/status note.

## Data & Files

- `hugo.toml`
  - Added `[params.maintenance]` config block.
- `themes/minimal/layouts/_default/baseof.html`
  - Added conditional rendering for maintenance mode on home.
- `themes/minimal/layouts/partials/maintenance.html`
  - New partial for the maintenance page markup.
- `themes/minimal/static/css/main.css`
  - Added maintenance page styles and animations.

## Interfaces (CLI/API)

No CLI or API surface changes.

## Configuration

Set values in `hugo.toml`:

```toml
[params.maintenance]
  enabled = false
  title = "Work in progress"
  message = "The site is currently being updated. The main page will return shortly."
  prompt = "imfurman@deploy"
  path = "~/work/imfurman.com"
  command = "release --maintenance --safe"
  typing = [
    "boot: loading deployment profile",
    "git pull origin main --ff-only",
    "hugo --minify --gc",
    "bundle: css/main.css",
    "audit: lighthouse --preset=desktop",
    "sync: assets -> edge nodes",
    "healthcheck: / /robots.txt /sitemap.xml",
    "notify: release channel updated"
  ]
  actions = [
    "[ok] Repo synchronized",
    "[ok] Templates compiled",
    "[ok] Static assets fingerprinted",
    "[ok] HTML minification complete",
    "[ok] Link integrity checks passed",
    "[ok] Metadata + OpenGraph validated",
    "[ok] CDN cache warming in progress",
    "[ok] Edge nodes received latest build",
    "[..] Final smoke tests running",
    "[..] Switching traffic to new release",
    "[ok] Deployment journal archived",
    "[ok] Maintenance window closing"
  ]
  eta = "Thank you for your patience. Back very soon."
```

## Usage Examples

Enable maintenance mode:

```toml
[params.maintenance]
  enabled = true
```

Disable maintenance mode:

```toml
[params.maintenance]
  enabled = false
```

## Testing

- Run `hugo` build with `enabled = false` and confirm normal homepage output.
- Run `hugo` build with `enabled = true` and confirm maintenance page output at `/`.
- Validate on desktop/mobile breakpoints and with reduced motion preference.

## Risks / Migration Notes

- If maintenance mode is left enabled accidentally, the real home page remains hidden.
- Existing SEO metadata stays global; only home content replacement behavior changes.
