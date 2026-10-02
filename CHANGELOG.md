# MaintEnhance (formerly HomeKeep) — Changelog

Every entry below corresponds to one delivered docker build — `homekeep-docker`
through v1.7, `maintenhance-docker` from v1.8 onward (see the v1.8 entry
below) — and, where noted, an updated functional spec. Versions **v0.1–v0.8**
were pre-release builds. **v1** is the first official release, and is
the point where the zip's top-level folder and the zip filename began
carrying a matching `-vN` suffix, with the spec and this changelog
included inside the zip itself. From v1 onward, the functional spec
file (`Home_CMMS_Functional_Specification.md`) carries no version
suffix of its own — it lives in the GitHub repo and is versioned by
Git history instead.

From v1 onward, each entry carries a **Commit short description**
(≤50 characters, including the version number, meant to be pasted as
the Git commit's summary line) and a **Commit extended description**
(≤200 words, also naming the version, the commit body — i.e.
`git commit -m "<short>" -m "<extended>"`).

---

## v2.1

**Commit short description:** `v2.1: Edition config, branding & terminology`

**Commit extended description:**
v2.1 extends v2's componentization with a per-deployment **edition layer**, driven by the facilities-edition decisions. `EDITION` (home | facilities) selects a preset in `backend/branding.config.js`; an optional `DATA_DIR/branding.config.js` and env vars (`BRAND_*`, `ORG_NOUN`, `LOCATION_LEVEL_LABELS`, `SITE_LEVEL_INDEX`) override it. Branding (name, logo, colours) is served at runtime from a public `/api/config`, so one image serves every fork; `/manifest.json` is now dynamic. Location hierarchy labels are configurable (Facilities: Organization, Site, Structure/Zone, Sub-zone, Area, Sub-area) but stored under stable keys, so relabelling later is display-only and Excel import accepts either. The Facilities edition turns Home Assistant off by default, and `SEED_CATALOG_FILE` loads facility PM templates as data on first run. Roles are unchanged. Adds `editions/facilities/` (env example, checklist, draft catalogue). PWA icons stay default.

## v2

**Commit short description:** `v2: Componentization (feature-flag layer)`

**Commit extended description:**
v2 delivers the componentization work deferred from v1.8: a per-
deployment feature-flag layer (`backend/features.js`) so different
MaintEnhance "editions" — the stock Home edition, a client/facility
edition — can enable only the subset of features they
need, from one codebase, with no code branch. Flags are env vars read
once at startup (`FEATURE_HA_ALARMS` for now, documented in
`.env.example` and `docker-compose.yml`) rather than an in-app Owner
setting, since which features a deployment offers is a decision made
once when it's stood up, not something end users toggle daily. The
Home Assistant alarm integration (webhook, API key, entity mapping —
v1.7) is the first componentized feature: routes it owns now 404 when
its flag is off, exactly as if they didn't exist, and the matching
setup UI disappears from the Alarm Dashboard. Nothing is deleted when a
component is turned off — historical Home-Assistant-sourced alarms and
saved mappings stay in the database and reappear if it's re-enabled.
The rest of the Alarm Dashboard (PM-checklist-triggered and manually-
raised alarms, both v1.8) is **not** part of this component and stays
on in every edition — it isn't Home-Assistant-specific. This is meant
to establish the pattern future componentized features follow.

## v1.8

**Commit short description:** `v1.8: MaintEnhance rebrand + Alarm Dashboard`

**Commit extended description:**
v1.8 rebrands the app from HomeKeep to **MaintEnhance** (short form
"ME") — across the UI, login screen, notification emails, and Excel
backup — and clears the old furnace/HVAC demo seed data entirely, so a
fresh deployment starts empty. Internally, the `household` SQLite
table becomes `app_data` (a guarded migration preserves data) and the
session cookie is renamed too, so everyone re-logs-in once after
upgrading. The former Alarms tab becomes the **Alarm Dashboard**:
alongside Home Assistant's webhook alerts (v1.7), it now also catches
a numeric PM checklist reading outside its configured expected range
(auto-raised, deduped per work order/step) and supports raising an
alarm by hand via "Create alarm." The PM Wizard's starter-maintenance
catalogue — previously hardcoded — is now editable from Owner Tools
(add/edit/remove, plus its own Excel backup/restore tab), so a
household or client edition can tune the suggested list without a code
change. This release intentionally excludes the feature-flag/
componentization layer discussed for client editions —
everything above is a normal, always-on part of the base app;
componentizing it into optional, toggleable pieces is scoped for a
future v2 release.

## v1.7

**Commit short description:** `v1.7: Home Assistant alarm integration`

**Commit extended description:**
v1.7 is the fifth and final "Bigger bets" release. HomeKeep can now
receive sensor-triggered alarms pushed from Home Assistant — a leak, a
smoke/CO alert, a freezer running warm — through a new API-key-authed
webhook (`POST /api/alarms`). Home Assistant does its own threshold,
debounce, and duration logic via its automation engine and only POSTs
when it's decided something is actually wrong; HomeKeep doesn't
re-implement any of that. Alarms land in a new "Alarms" tab (Owner/
Manager only) as their own queue, upstream of Work Requests — not
every sensor trip should become a work item. Each open alarm can be
acknowledged as a false alarm (with a reason, to help tune noisy
sensors), turned into a new Work Request with the details pre-filled,
or linked onto an existing Work Order as evidence. An entity-id-to-
asset/location mapping table means a repeat alert from the same
sensor auto-links from then on. The `source` field is modeled
generically (`home_assistant` today) so another push source could plug
into the same queue later without a redesign. The tab also surfaces
the webhook URL, a regenerable API key, and a ready-to-paste Home
Assistant `rest_command` example. Alarms and their mappings are stored
in their own SQLite tables, not the household JSON document — they're
operational/audit data, not household records, and (like v1.6's
photo files) aren't included in the Excel backup/restore.

## v1.6

**Commit short description:** `v1.6: Offline work-request sync + photos`

**Commit extended description:**
v1.6 is the fourth of five "Bigger bets" releases, and the first to
touch the backend. Work requests can now carry up to 5 photos,
attached from the phone's camera or library — a new `/api/attachments`
endpoint stores them on disk (under the same mounted data volume as
the SQLite database) and the household JSON blob only ever references
their ids, never the image bytes. More importantly, submitting a work
request now works with no connection at all: if the app is offline (or
a submission's upload fails partway through), the request and its
photos are saved to the device via IndexedDB instead of being lost,
and a "N pending sync" indicator appears in the top bar. Once the
device is back online — detected automatically, or via a manual "Sync
now" click — each queued request is uploaded and submitted for real,
in order, with failures kept in the queue (flagged in red) for the
next sync attempt rather than silently dropped. This is scoped to Work
Requests specifically (the entry point every household role, not just
Owners/Managers, already uses to report something that needs
attention) rather than direct Work Order creation, which stays an
Owner/Manager planning action; photos carry over automatically if a
request is later converted into a work order.

## v1.5

**Commit short description:** `v1.5: Address/climate-seeded PM wizard`

**Commit extended description:**
v1.5 is the third of five "Bigger bets" releases. A Property-level
location now carries an address, year built, and climate zone, and
gets a new "PM setup wizard" action (the wand icon next to it in
Location Hierarchy). Step one collects the address and year built and
guesses a climate zone from it — a simple built-in state/province
lookup, not a real climate API, always shown for the household to
confirm or override. Step two presents a curated starter list of ~13
common recurring maintenance items (HVAC filter, gutters, water
heater, furnace/AC service, sump pump, winterizing spigots, and more),
pre-checked based on that climate zone, so a Cold-zone household sees
furnace service and pipe winterizing checked while a Hot-Humid one
sees AC service and pest inspection instead. Finishing the wizard
creates a normal, fully editable PM Base for each checked item —
nothing about the wizard is special afterward; it's just a faster way
to seed a sensible starting list instead of building one from scratch.
The wizard can be re-run any time, and existing PM Bases are untouched
by it.

---

## v1.4

**Commit short description:** `v1.4: PM checklist builder`

**Commit extended description:**
v1.4 is the second of five "Bigger bets" releases. A PM Base can now
carry a **checklist template** — an ordered set of steps, each a Task
(check off), Numeric reading (with an optional expected min/max and
unit, auto-flagged in/out of spec), Photo required (tracked as an
acknowledgment checkbox for now — actual photo attachment is planned
for the offline-sync release), or Pass/Fail. The template is built and
reordered from the PM Base's own detail view, same as its trigger
configuration, and is copied fresh onto every PM occurrence the base
generates from then on.

Filling in the checklist on a live PM work order is treated like
adding a comment rather than editing the record: any user with write
access — including an Executor, who otherwise gets a read-only view of
a work order's other fields — can check off steps, log readings, and
mark pass/fail while doing the work, and each change saves
immediately. The filled-in checklist stays on the completed work order
permanently, turning a PM from a single checkbox into a real
inspection record. Existing PM Bases and occurrences are unaffected —
a PM Base with no checklist template behaves exactly as before.

---

## v1.3

**Commit short description:** `v1.3: Meter & seasonal PM triggers`

**Commit extended description:**
v1.3 is the first of five "Bigger bets" releases, split out one version
at a time. It extends PM Base templates with a **trigger type**
alongside the existing calendar mode: **Meter** (usage-based) and
**Seasonal** (tied to a season rather than a fixed date). Assets gain
an optional meter unit and current reading (e.g. "247 hours"), logged
from the asset's detail page; a meter-based PM Base tracks an interval
against that reading (e.g. every 250 hours) and generates its next
work order automatically the moment the logged reading crosses the
threshold — no PM sits scheduled ahead of time the way calendar PM
does. Seasonal PM Bases run every year around the start of a chosen
season (Northern Hemisphere meteorological boundaries: Mar 1 / Jun 1 /
Sep 1 / Dec 1), shiftable by a day offset for things like "before
heating season" or "first hard frost" that don't fall on the same
calendar date every year.

This was deliberately done as a schema change now, before more PM
schedules exist under the old calendar-only model — later versions
build on the same PM Base record rather than needing a migration.
Existing calendar-mode PM Bases are unaffected; the new trigger type
defaults to "calendar" everywhere it's read.

---

## v1.2

**Commit short description:** `v1.2: Warranties, QR labels, failure codes`

**Commit extended description:**
v1.2 ships the "quick wins" batch of the pending-changes log. Assets
gain a manual/manufacturer-page link and an "is this a major asset?"
flag; major assets get a printable QR label (generated client-side)
that deep-links straight to that asset's record — scanning it, or
opening the link directly, jumps to the asset detail view and offers
a one-tap "New work order" action, which now also exists as a button
on every asset's page regardless of QR use. Corrective and Unplanned
work orders gained optional Failure code (a fixed list: Wear, Leak,
Electrical, Mechanical, User Error, Install Defect, Unknown, Other)
and free-text Root cause fields, both included in Excel backup/restore
round-tripping and shown on the work order's detail view.

v1.2 also adds an entirely opt-in daily email digest: with an SMTP
server configured via environment variables, each household member
can set a notification email and choose which of three digests they
want (overdue work orders, warranties expiring soon, unreviewed work
requests) from a new bell icon next to their entry in Owner Tools.
With no SMTP host configured, nothing changes — the server logs once
at startup that notifications are disabled.

---

## v1.1

**Commit short description:** `v1.1: Add light/dark theme support`

**Commit extended description:**
v1.1 adds a dark theme. Every color in the app was already routed
through one design-token object (`C`); that object now resolves to
CSS custom properties instead of hard-coded hex values, with a light
and a dark palette defined for those properties, so existing
component styles needed no per-component dark-mode logic.

By default the app follows the device/browser's `prefers-color-scheme`
setting automatically — no action needed. A theme button in the top
bar (next to the install-app button) lets the user override that:
tapping it cycles Auto → Light → Dark → Auto, with a matching
monitor/sun/moon icon, and the choice is remembered in the browser via
localStorage so it persists across visits without needing an account
setting.

The dark palette keeps the same navy/orange/olive/rust/gold/teal
accent identity as light mode, just rebalanced for contrast on a dark
charcoal-green background instead of the light sage one, so status
colors, tags, and priority badges stay recognizable in either theme.

A few surfaces hard-coded to white (input fields, the "open link"
button, calendar day cells, quantity +/- buttons) now use the
theme-aware panel color instead, so they no longer stay white in dark
mode.

No backend or data changes in this release.

---

## v1 — official release

**Commit short description:** `v1: Make the app mobile-friendly`

**Commit extended description:**
v1 is HomeKeep's first official release, following the v0.1–v0.8
pre-release builds, and focuses on mobile usability. The app had no
responsive CSS: fixed-width inline styles meant the sidebar
permanently ate a third of a phone screen and multi-column layouts
got crushed. This adds a responsive pass at an 860px breakpoint, with
no backend or data changes.

Navigation: the sidebar is now an off-canvas drawer on phones instead
of pushing content aside — closed by default below 860px, opens over
the content with a tap-to-close backdrop, and auto-closes on tapping
a menu item.

Layout: every multi-column grid collapses to one column below 860px —
Assets, Work Orders/Requests, the Schedule filter pane, the kanban
board, dashboard stat cards, PM/BOM detail grids, and multi-column
forms. Auto-fill card grids (Parts Catalogue, Vendors) already reflow
and needed no change.

Calendar: the Schedule month view keeps its true 7-day grid on mobile
(padding/font shrink instead), since it needs all 7 columns to make
sense.

Popups: add/edit dialogs open as a full-width bottom sheet on phones
instead of a small centered box.

Touch: buttons, inputs, and selects get a comfortable minimum tap
height, and inputs use a larger font to avoid iOS's zoom-on-focus
behavior.

## v0.8

**Commit message:** `Add version-numbered releases and a project changelog`

- Introduced version-numbered filenames for every future delivery —
  this release is `homekeep-docker-v0.8.zip` and
  `Home_CMMS_Functional_Specification-v0.8.md`
- Added this changelog, backfilled with an entry for every version
  delivered so far (v0.1–v0.7)
- Bumped the in-app footer version string to match

---

## v0.7

**Commit message:** `Remove bundled Caddy; publish to Docker Hub; pure image-based compose deploy`

- Removed the bundled Caddy reverse proxy (`Caddyfile`, the `caddy`
  service, and its volumes) — HTTPS/reverse-proxy setup is now
  documented as "bring your own" (Caddy, Nginx Proxy Manager, Traefik,
  or a tunnel), rather than shipped by default
- Removed the `build:` section from `docker-compose.yml` entirely —
  the stack now only ever pulls a prebuilt image, which is what fixes
  Portainer's "failed to read dockerfile" error when deploying from a
  pasted compose file with no accompanying source tree
- Switched CI publishing from GitHub Container Registry to **Docker
  Hub** (`.github/workflows/docker-publish.yml`), requiring
  `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` repo secrets
- Rewrote `README.md` accordingly, including a new "Prebuilding the
  image" section (local build, tagging, pushing, multi-arch builds,
  and moving an image to a machine with no registry access)

## v0.6

**Commit message:** `Restrict PM Base concurrency, lock down Executor edit rights, fix 500 error on non-Owner user creation`

- **Bug fix:** the 500 error when adding any user other than Owner —
  root cause was a stale SQLite `CHECK` constraint left over from
  before the role system expanded; added a real migration that
  rebuilds the `users` table and preserves existing accounts
- PM Base templates now cap at one Open/In Progress child work order
  at a time; a new occurrence is never generated while another from
  the same base is still active
- Field editing on a work order (including PM Base, now editable for
  the first time) is Owner/Manager only; an Executor opening the same
  work order gets a read-only view and can only change status
  (excluding Verified) and add comments
- Added **Save & Close** alongside **Save changes** on work order and
  PM Base detail views
- Locations page rebuilt as a collapsible tree with Expand/Collapse
  all, with a distinct icon per location level
- Added a work-order-type filter to the Work Orders page

## v0.5

**Commit message:** `Add household roles, Parts Catalogue, PM Base scheduling, and a redesigned dashboard`

- Expanded and renamed roles: Owner, **Manager** (new — Owner-level
  rights, but can only delete records they created, and can't reach
  Owner Tools), Executor (renamed from Household Member), **Guest**
  (new — read-only)
- New **Parts Catalogue** (renamed from Inventory): permanent part
  numbers, manufacturer/manufacturer-part-number/cost/link fields
- Work orders and work requests can now have parts attached/suggested,
  with a location- and BOM-scoped part search and quantities
- Priorities renamed to High/Medium/Low, added to work orders (not
  just requests), with filters on both screens
- Added Executor assignment on work orders, drawn from Owner/Manager/
  Executor accounts
- **PM Base**: a new work-order type acting as a template for
  recurring maintenance — Non-fixed (frequency-based) or Fixed
  (annual calendar dates) — auto-generating numbered PM occurrences
- Verified work orders older than 30 days move into a searchable
  archive, linked from the Verified column header
- Work requests gained a required-by date, a suggested work order
  type, and suggested parts
- Dashboard redesigned: clickable stat cards that jump to a filtered
  view, an Upcoming Work Orders panel, and a 7-day look-ahead strip
- Added unsaved-changes protection (Save/Discard/Cancel) to the major
  forms, collapsible location filters with Expand/Collapse all, an
  info icon with a Purpose/Workflow/Permissions/Features summary on
  every page, a red-bold-asterisk convention for required fields, and
  delete-from-popup for work orders/requests
- New **Owner Tools** page: member management, Excel backup/restore,
  and delete-by-number for work orders and requests
- Functional spec rewritten to reflect all of the above (v2.0/2.1)

## v0.4

**Commit message:** `Allow editing submitted work requests; support subpath deployment behind a reverse proxy`

- Work requests can now be edited (by their submitter, or by an Owner)
  while still awaiting review
- Added `VITE_BASE_PATH` build-time support so the frontend can be
  built for a subpath deployment (e.g. `example.com/homekeep/`)
  instead of only the domain root — fixed the absolute-path asset/API
  references that would otherwise break under a subpath
- Documented both a dedicated-subdomain and a subpath deployment path
  behind Caddy, plus step-by-step instructions for packaging the PWA
  as an Android APK via Bubblewrap/PWABuilder

## v0.3

**Commit message:** `Make the container port configurable via environment variable`

- `PORT` is now a single environment variable read by
  `docker-compose.yml`, the `Dockerfile` default, and the backend's
  own fallback, instead of being hardcoded to 8080

## v0.2

**Commit message:** `Add GitHub Actions CI and Portainer deployment docs`

- Added `.github/workflows/docker-publish.yml` to build and publish
  the image automatically on push
- Updated `docker-compose.yml` to pull the published image by default,
  with a local `build:` fallback
- Added `LICENSE` and `.gitignore`, and documented both Portainer
  deployment methods (Git-repository stack and pasted Web-editor
  stack) in `README.md`

## v0.1

**Commit message:** `Package HomeKeep as a standalone Docker deployment with PWA support`

- Converted the original in-chat React prototype into a real
  deployable app: Node/Express + SQLite backend with username/password
  accounts, served alongside the built React frontend from a single
  Docker image
- Added a PWA manifest, service worker, and generated app icon so the
  app installs on Android and Chromium desktop browsers
- First delivery of `homekeep-docker.zip`, with `docker-compose.yml`,
  `Dockerfile`, and a `README.md` covering local setup
