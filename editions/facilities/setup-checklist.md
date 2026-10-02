# Setup checklist — a facilities deployment

This is not a code fork: it is the same image with an edition config.
Roles stay Owner / Manager / Executor / Guest.

1. **Env** – copy `.env.facilities.example` to `.env` (or the Portainer
   stack env). Set `JWT_SECRET`; set `COOKIE_SECURE=true` once on HTTPS.
2. **Confirm branding** – name, `BRAND_SHORT_NAME` (≤12 chars, the
   installed-app label), tagline, colours.
3. **Logo** – put `logo.png` in the data volume at `/data/branding/logo.png`
   (`BRAND_LOGO_URL=/branding/logo.png`). The sidebar is dark navy: use a
   light/transparent logo.
4. **Catalogue as data** – review `pm-wizard-catalog.draft.json`, edit to
   your real tasks/frequencies, and copy it into the data volume as
   `/data/pm-wizard-catalog.json` **before first-run setup** (only a
   brand-new database is seeded; later edit the catalogue in-app or via Excel).
5. **Start**, open the app, create the Owner account.
6. **Verify**: sidebar shows your name/logo; Locations offers
   Organization → Site → Structure/Zone → Sub-zone → Area → Sub-area; the
   wizard wand appears on Site nodes; Owner Tools has no Home Assistant
   section; `/api/alarms/webhook-key` returns 404.
7. **Build the location tree** – Organization → Sites (buildings, parks,
   cemeteries, downtown, etc.) → zones below.
8. **Run the PM wizard** on each Site.
9. **Add users** with the existing four roles.

Known limits: PWA home-screen icons remain the default set;
`/manifest.json` name/theme follow branding. Relabelling levels later is
display-only and safe.
