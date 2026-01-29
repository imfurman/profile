# Minimalist Portfolio (Hugo)

A clean, single-page portfolio for Ruslan Shchur (imfurman). Built with Hugo and ready for GitHub Pages.

## Local development

```bash
hugo server
```

Open the printed local URL and edit content in `content/_index.md`.

## Edit content

- Main content: `content/_index.md`
- Global SEO defaults and site settings: `hugo.toml`
- Styles: `themes/minimal/static/css/main.css`

## Set the custom domain

1. Update `baseURL` in `hugo.toml`.
2. Update `static/CNAME` to your domain (no protocol, single line).
3. Configure the same domain in GitHub Pages settings.

## Add Google Analytics 4

1. Set your GA4 Measurement ID in `hugo.toml` under `params.ga_id`.
2. The GA script is only injected when building with `HUGO_ENV=production` (the GitHub Action already sets this).

## Deployment

Push to `main` and GitHub Actions will build and deploy using GitHub Pages actions.

## Notes

- Single-page layout with anchored sections.
- No external themes; custom theme lives in `themes/minimal`.
- `robots.txt` and `sitemap.xml` are generated automatically by Hugo.
