# Pending changes (not yet in a released version)

Ideas logged here since the last release. When you say "create a new version,"
all of these get implemented together, the version is bumped, and this file
is cleared back to empty.

Current release: v2.2

## Planned for v2.3 (UI and integrations)
Items 1, 2, 3, 4, 12 below, plus the link-prefill toggle in Owner Tools -> Features.

## Decisions confirmed 2026-09-30
- Beacon (item 2): shown at the location level of the alarm and cascades upward through every parent level above it.
- Catalogue (item 4): one combined file with a Type column (home, facilities, etc.); catalogue picker filters by Type and by sub type (category, e.g. HVAC, Lawn & garden).
- Link prefill fields: name, manufacturer, model, description, price; Gemini gets only URL and page text, only if key present and Owner toggle on.

## Log

1. Left navigation bar always uses the light-mode (darker blue) colour, in both light and dark themes.
2. (v2.3) Alarms: add a location filter (like Work Orders, Assets, etc.); beside each location in the filter, show a red flashing beacon-light symbol at the location level of an active alarm, cascading upward through all parent levels above it.
3. Rename "Alarm Dashboard" to just "Alarms" (nav, page title, docs, spec).
4. (v2.3) Merge the Home (~143) and facilities (~163) PM template drafts into ONE catalogue file with a Type column (home, facilities, etc.) plus the existing category (sub type, e.g. HVAC, Lawn & garden). The catalogue picker/wizard filters by Type and by sub type; new deployments get the combined catalogue (picker defaults to Home); existing catalogues are not overwritten. Type is a column in the PM Wizard Catalog Excel sheet and editor. Drafts are typical starting frequencies, not real schedules.
12. Link-based pre-population for assets, vendors and parts: paste a link and the form fields fill in from it, improved with AI via a Gemini API key. The key is an optional Docker environment variable (`GEMINI_API_KEY`, passed through `docker-compose.yml` and documented in `.env.example`), read server-side only, never sent to the browser, and only used if provided; without it, a plain page-metadata fallback is used. Every pre-populated field shows a semi-transparent "x" at its right side to clear that value. Build notes: server-side fetch needs SSRF protection and a timeout; page content is sent to Google when the AI option is on; add an Owner toggle (Owner Tools -> Features) to turn it off.

## Logged for future (not scheduled)
- Generate PWA icons from the uploaded logo.
- Off-device automated backup of the data volume (restic/rclone/rsync).
