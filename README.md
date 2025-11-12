# ShartFX Front-End Refresh

This repository now ships a redesigned landing page inspired by the clean grid layout from iux.com while keeping every piece of ShartFX marketing copy, media, and links intact. The new experience introduces a gradient hero, modular product grids, a dedicated accounts section, partner highlights, FAQ/testimonial refinements, and a modern contact + compliance footer that links to a standalone terms page. Dedicated `login.html` and `signup.html` screens were added with Google Identity Services (GIS) support and lightweight form handling that posts requests directly to Google Sheets.

## Key files

- `public/index.html` – Main page layout with updated sections (hero, products, platforms, accounts, partners, testimonials, FAQ, contact, footer). Each block contains the original ShartFX text content, only re-ordered for the new structure.
- `public/social.html` – Legacy social-trading page with refreshed branding, nav links to the new auth screens, and the shared footer/terms link.
- `public/assets/css/theme.css` – Contains Bootstrap base styles plus the custom palette, typography, spacing system, and animations appended at the end of the file under the “Custom ShartFX redesign” heading.
- `public/login.html` & `public/signup.html` – Auth forms that reuse the site styling, expose the GIS button, and show the required disclosure about optional passwords.
- `public/assets/js/auth.js` – Shared helper used by both auth pages. Handles GIS initialization, form submission, JSON payload creation, toast feedback, and redirects.
- `public/terms-and-conditions.html` – Centralized page for all risk warnings, plus the requested Risk Warning / Data & Privacy / KYC/AML / Complaints / Contact sections.
- `Code.gs` – Google Apps Script handler that appends submissions to a “Users” sheet.

## Editing colors, typography & breakpoints

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

Update these variables to change the global palette, or adjust section-specific rules (e.g., `.hero`, `.card-grid`, `.site-footer`) in the same block. The Inter font is loaded from Google Fonts in both HTML documents; swap the URL there if you prefer a different typeface. Responsive breakpoints sit at the end of the same CSS file inside the `@media (max-width: 767.98px)` query—extend or duplicate this block to fine-tune tablet/desktop stacking.

## Connecting the auth forms to Google Sheets & GIS

1. **Google Sheet**  
   - Create a new Google Sheet.  
   - Add a tab named **Users** with headers (row 1) exactly as follows:  
     `Timestamp | SourcePage | FullName | Email | Phone | Country | Referral | GoogleID | GoogleName | GoogleEmail | GoogleAvatar | UserAgent | IP | RawJSON`

2. **Apps Script deployment**  
   - From the Sheet, open **Extensions → Apps Script**, remove any boilerplate, and paste the contents of `Code.gs`.  
   - Click **Deploy → New deployment → Web app**, set *Who has access* to “Anyone”, and copy the generated Web App URL.

3. **Wire the Web App URL**  
   - In both `public/login.html` and `public/signup.html`, replace the placeholder string in `const APPS_SCRIPT_WEBAPP_URL = 'PASTE_YOUR_URL_HERE';` with the Web App URL from step 2.

4. **Create a Google OAuth Web client ID**  
   - In Google Cloud Console, create a new “Web application” OAuth client (use the live domain + `http://localhost` during development).  
   - Copy the Client ID and replace `const GOOGLE_CLIENT_ID = 'PASTE_YOUR_GOOGLE_CLIENT_ID';` in both auth pages.

5. **Test the flow**  
   - Load `/signup.html` or `/login.html`, submit a manual form and a Google sign-in, and verify new rows appear in the Users sheet with timestamps plus the metadata captured by `assets/js/auth.js`.

## Running locally

Use any static server to preview the site (for example, `npx serve public`). No build tools are required.
