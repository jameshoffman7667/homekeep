# HomeKeep — Changelog

Every entry below corresponds to one delivered `homekeep-docker` build
(and, where noted, an updated functional spec). Starting with this
release, both the zip and the functional spec file carry a `-vN` suffix
matching the version below. The **Commit message** line under each
entry is meant to be pasted as-is as the Git commit message for that
release.

---

## v9

**Commit message:** `Make the app usable on phones: off-canvas nav drawer and responsive layouts`

- Added a real mobile navigation pattern: the sidebar now opens as an
  off-canvas drawer with a tap-to-close backdrop on screens ≤860px,
  instead of pushing page content aside; it starts closed by default
  on phone-sized screens
- Made every multi-column layout in the app (Assets, Work Orders and
  Work Requests filter/detail panes, Schedule, the Work Orders kanban
  board, the dashboard stat cards, PM/BOM detail grids, forms) collapse
  to a single column below 860px, so nothing gets squeezed or clipped
  on a phone screen
- Kept the Schedule month calendar at a true 7-day-wide grid on mobile
  (shrunk padding/type instead of collapsing it, since a calendar needs
  its 7 columns to make sense)
- Made popups (add/edit dialogs) open as a bottom sheet that fills the
  screen width on phones, and raised tap targets (buttons, inputs,
  selects) to a touch-friendly minimum height
- No backend or data changes in this release

## v8

**Commit message:** `Add version-numbered releases and a project changelog`

- Introduced version-numbered filenames for every future delivery —
  this release is `homekeep-docker-v8.zip` and
  `Home_CMMS_Functional_Specification-v8.md`
- Added this changelog, backfilled with an entry for every version
  delivered so far (v1–v7)
- Bumped the in-app footer version string to match

---

## v7

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

## v6

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

## v5

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

## v4

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

## v3

**Commit message:** `Make the container port configurable via environment variable`

- `PORT` is now a single environment variable read by
  `docker-compose.yml`, the `Dockerfile` default, and the backend's
  own fallback, instead of being hardcoded to 8080

## v2

**Commit message:** `Add GitHub Actions CI and Portainer deployment docs`

- Added `.github/workflows/docker-publish.yml` to build and publish
  the image automatically on push
- Updated `docker-compose.yml` to pull the published image by default,
  with a local `build:` fallback
- Added `LICENSE` and `.gitignore`, and documented both Portainer
  deployment methods (Git-repository stack and pasted Web-editor
  stack) in `README.md`

## v1

**Commit message:** `Package HomeKeep as a standalone Docker deployment with PWA support`

- Converted the original in-chat React prototype into a real
  deployable app: Node/Express + SQLite backend with username/password
  accounts, served alongside the built React frontend from a single
  Docker image
- Added a PWA manifest, service worker, and generated app icon so the
  app installs on Android and Chromium desktop browsers
- First delivery of `homekeep-docker.zip`, with `docker-compose.yml`,
  `Dockerfile`, and a `README.md` covering local setup
