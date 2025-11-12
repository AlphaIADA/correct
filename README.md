# ShartFX Front-End Refresh

This repository now ships a redesigned landing page inspired by the clean grid layout from iux.com while keeping every piece of ShartFX marketing copy, media, and links intact. The new experience introduces a gradient hero, modular product grids, a dedicated accounts section, partner highlights, FAQ/testimonial refinements, and a modern contact + compliance footer that links to a standalone terms page.

## Key files

- `public/index.html` – Main page layout with updated sections (hero, products, platforms, accounts, partners, testimonials, FAQ, contact, footer). Each block contains the original ShartFX text content, only re-ordered for the new structure.
- `public/assets/css/theme.css` – Contains Bootstrap base styles plus the custom palette, typography, spacing system, and animations appended at the end of the file under the “Custom ShartFX redesign” heading.
- `public/terms-and-conditions.html` – Centralized page for all risk warnings, disclaimers, and legal boilerplate removed from the landing page.

## Editing colors and typography

All palette tokens and layout overrides live near the bottom of `public/assets/css/theme.css`:

```css
:root {
  --brand-navy: #0d1c3c;   /* primary text + backgrounds */
  --brand-green: #25d366;  /* CTA buttons & WhatsApp cues */
  --brand-slate: #5c6272;  /* body copy */
  --brand-gray: #f5f7fb;   /* card backgrounds */
  --brand-border: rgba(13, 28, 60, 0.08); /* borders/dividers */
}
```

Update these variables to change the global palette, or adjust section-specific rules (e.g., `.hero`, `.card-grid`, `.site-footer`) in the same block. The Inter font is loaded from Google Fonts in both HTML documents; swap the URL there if you prefer a different typeface.

## Running locally

Use any static server to preview the site (for example, `npx serve public`). No build tools are required.
