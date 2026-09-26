# HomeKeep — Changelog

Every entry below corresponds to one delivered `homekeep-docker` build
(and, where noted, an updated functional spec). Versions **v0.1–v0.8**
were pre-release builds. **v1** is the first official release, and is
the point where the zip's top-level folder, the zip filename, and the
functional spec filename all began carrying a matching `-vN` suffix,
with the spec and this changelog included inside the zip itself.

From v1 onward, each entry carries a **Commit short description**
(≤50 characters, including the version number, meant to be pasted as
the Git commit's summary line) and a **Commit extended description**
(≤200 words, also naming the version, the commit body — i.e.
`git commit -m "<short>" -m "<extended>"`).

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
