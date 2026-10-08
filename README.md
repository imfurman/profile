# Interactive Profile (Hugo)

A minimal white profile for Ruslan Shchur (imfurman), centered on the supplied transparent illustration of Ruslan seated on a stool. Skills sit beside the character on wider screens and below it on phones; contacts stay in the footer. Built with Hugo for GitHub Pages.

## Local development

```bash
hugo server
```

Open the printed local URL and edit content in `content/_index.md`.

## Edit content

- Main content: `content/_index.md`
- Global SEO defaults and site settings: `hugo.toml`
- Styles: `themes/minimal/static/css/main.css`
- Portrait image: `themes/minimal/static/images/ruslan-portrait.png`
- Layout and accessibility details: [docs/interactive-portrait.md](docs/interactive-portrait.md)

## Set the custom domain

1. Update `baseURL` in `hugo.toml`.
2. Update `static/CNAME` to your domain (no protocol, single line).
3. Configure the same domain in GitHub Pages settings.

## Add Google Analytics 4

1. Set your GA4 Measurement ID in `hugo.toml` under `params.ga_id`.
2. The GA script is only injected when building with `HUGO_ENV=production` (the GitHub Action already sets this).

## Maintenance mode (replace home page)

Use `params.maintenance.enabled` in `hugo.toml` as a switch:

- `false` - show the normal home page.
- `true` - show the terminal-style "work in progress" page instead of the home page.

You can customize text and terminal lines in the same `params.maintenance` block (`title`, `message`, `command`, `typing`, `actions`, `eta`).

## Deployment

Push to `main` and GitHub Actions will build and deploy using GitHub Pages actions.

## Notes

- Single-page layout with accessible HTML skills and contacts.
- The portrait is a regular image; it needs no JavaScript or WebGL.
- The supplied PNG is preserved without image changes, including its transparency.
- The earlier 3D files remain in the repository for possible reuse and are not loaded by the homepage.
- No external themes; custom theme lives in `themes/minimal`.
- `robots.txt` and `sitemap.xml` are generated automatically by Hugo.
