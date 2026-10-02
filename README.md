# MaintEnhance — self-hosted deployment

> **MaintEnhance** (short form "ME") is the product name used throughout.
> (Versions before v1.8 were called HomeKeep; see CHANGELOG.md.)

> **v2.5 note:** touch screens can now use the planning calendars (tap a card, tap where it goes), and storage is split into a fast `/data` volume (database) and a slower `/files` volume (photos, snapshots, temp files) — see §9 and `.env.example`.
>
> **v2.4 note:** the image, container, volume, repo and database file are now all named `maintenhance` — this is a **fresh-start** release (data from earlier versions is not carried over). Owner Tools is now **Tools** (cards depend on your role). Three optional Owner toggles under Tools → Features add execution-based scheduling and time keeping (Labour assignment with Month/Week/Day views, estimates, crews, hours worked), workforce scheduling (shift templates, schedule and PDF export) and hourly labour assignments. The in-app Help tab serves the training guides from `frontend/public/help/`, with Word copies alongside.
>
> **v2.3 note:** the PM setup wizard now draws on one combined catalogue (Type and sub type filters), the Alarms page has a location filter with flashing beacons, and asset/vendor/part forms can fill in from a pasted link (optional Gemini AI via `GEMINI_API_KEY`; Owner Tools → Features).
>
> **v2.2 note:** branding, location labels and optional features (such as
> Home Assistant alarms) are now set by the Owner inside the app (Owner
> Tools). The earlier "editions" and the `EDITION`/`BRAND_*`/`FEATURE_*`
> environment variables were removed.

A standalone, single-container build of the MaintEnhance household CMMS: a
Node/Express + SQLite backend with real multi-user accounts, serving a
React frontend that's installable as a PWA on Android (or desktop).

This turns the earlier in-chat prototype into something you actually run
on your own hardware — a Raspberry Pi, a home server, a NAS with Docker
support, or a small cloud VM.

## What's inside

```
maintenhance/
├── .github/workflows/
│   └── docker-publish.yml   # CI: builds & pushes the image to Docker Hub on push
├── Dockerfile              # multi-stage build: frontend build → backend runtime
├── docker-compose.yml      # pulls the Docker Hub image — no build step
├── .env.example             # copy to .env and fill in
├── .gitignore
├── LICENSE
├── backend/                 # Express API + SQLite (better-sqlite3)
│   ├── server.js
│   ├── db.js
│   ├── auth.js               # JWT sessions, bcrypt password hashing
│   └── seed.js               # empty starting shape loaded on first setup
└── frontend/                 # React app (Vite), builds to static files
    ├── src/App.jsx            # the full MaintEnhance UI
    ├── src/api.js              # talks to the backend over /api/*
    └── public/manifest.json    # PWA manifest (installable on Android)
```

One container serves everything: the API under `/api/*` and the built
frontend for everything else. Data is stored in a SQLite file inside a
Docker volume, so it survives restarts and rebuilds.

`docker-compose.yml` deliberately has **no `build:` section** — it only
ever pulls a prebuilt image. That means `docker compose up`, and a
Portainer stack built from this file alone (no repo, no Dockerfile,
nothing else needed), always just work, whether the image comes from
Docker Hub or one you built yourself. See "Prebuilding the image"
below if you'd rather build than wait on Docker Hub.

## Branding, terminology & features (v2.2)

The app starts in its original configuration. After you sign in as Owner,
**Owner Tools** has two cards:

- **Branding & terminology:** name, short name, tagline, an optional top-bar
  title, logo (PNG/JPG/SVG/WebP up to 512 KB), four colours (with a contrast
  warning), the six location-level labels (each required, up to 15
  characters, all different), which level is the "site" level, and the word
  used instead of "household". "Reset to defaults" restores the originals.
- **Features:** Home Assistant alarms on/off; "Fill in from a link" on/off; and, if `GEMINI_API_KEY` is set in the Docker environment, a switch to use Gemini AI for it (the link and the page's text are then sent to Google).

Location labels are display-only (stored data uses stable keys), so they can be
changed at any time. All of this is included in the Excel backup (Settings sheet).
Secrets stay in the Docker environment (`JWT_SECRET`, `SMTP_*`).

## 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
  (bundled with Docker Desktop; on Linux, install the `docker-compose-plugin`)
- A machine to run it on — this can be the same computer you're using now

## 2. Publish this repo to GitHub

```bash
cd maintenhance
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/jameshoffman7667/maintenhance.git
git push -u origin main
```

### Continuous builds via GitHub Actions → Docker Hub

`.github/workflows/docker-publish.yml` is already included. On every
push to `main` (and on version tags like `v1.0.0`), it builds the
Dockerfile in this repo and pushes the image to **Docker Hub** —
tagged `latest` plus the commit SHA.

Unlike GitHub Container Registry, Docker Hub needs credentials you set
up yourself:

1. Create a Docker Hub account if you don't have one, at
   [hub.docker.com](https://hub.docker.com).
2. Create an access token: **Account Settings → Security → New Access
   Token**, with **Read & Write** scope. Copy it — you won't see it again.
3. In your GitHub repo: **Settings → Secrets and variables → Actions →
   New repository secret**, and add two secrets:
   - `DOCKERHUB_USERNAME` — your Docker Hub username
   - `DOCKERHUB_TOKEN` — the access token from step 2
4. Push to `main` (or run the workflow manually from the **Actions**
   tab). It'll publish to `docker.io/<DOCKERHUB_USERNAME>/maintenhance:latest`.

`docker-compose.yml` is already set to pull `mybadreligon/maintenhance:latest`.
If your Docker Hub username is different, update the `image:` line in
`docker-compose.yml` to match before deploying.

By default, a new Docker Hub repository is **public**, so no
credentials are needed to pull it. If you'd rather keep it private, see
"If the image is private" under Portainer, below.

## 3. Quick start — running it yourself with Docker Compose

```bash
cd maintenhance
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string, e.g.:
#   openssl rand -hex 32
# PORT defaults to 8040 — change it in .env if that port is already in use.

docker compose up -d
```

This pulls `mybadreligon/maintenhance:latest` (or whatever `image:` you
set) from Docker Hub and starts it — nothing gets built locally. The
first pull downloads the image; after that, starting/stopping is
instant.

Open **http://localhost:8040** — or, from another device on the same
Wi-Fi/LAN, **http://\<this-machine's-LAN-IP\>:8040** (find the IP with
`ip addr` / `ifconfig` on Linux/macOS or `ipconfig` on Windows). If you
set a different `PORT` in `.env`, use that instead of 8040 throughout
this document.

The first time you open it, you'll be asked to create the **Owner**
account. After that, sign in from any device on the network.

## 4. Prebuilding the image

You don't have to wait on Docker Hub or GitHub Actions — you can build
the image yourself and either use it locally or push it up.

**Build it:**
```bash
cd maintenhance
docker build -t maintenhance:latest .
```
(On Windows, run this from PowerShell or Command Prompt with Docker
Desktop running — the command is identical.)

**Use it locally without touching `docker-compose.yml`:** if the image
tag matches what's in the compose file (`mybadreligon/maintenhance:latest`
by default), `docker compose up -d` will use your local build instead
of pulling — Docker always prefers an image it already has:
```bash
docker build -t mybadreligon/maintenhance:latest .
docker compose up -d
```

**Push it to Docker Hub yourself** (useful if you don't want to rely on
GitHub Actions at all):
```bash
docker login
docker build -t <your-dockerhub-username>/maintenhance:latest .
docker push <your-dockerhub-username>/maintenhance:latest
```
Then point `docker-compose.yml`'s `image:` line at that tag.

**Building for a subpath deployment** (e.g. serving at
`example.com/maintenhance/` — see §7): pass `VITE_BASE_PATH` as a build
argument, since it has to be baked into the frontend at build time:
```bash
docker build --build-arg VITE_BASE_PATH=/maintenhance/ -t maintenhance:latest .
```
Leave it off for a normal root deployment (the default).

**Different CPU architecture than your build machine** (e.g. building
on an Intel/AMD laptop but deploying to a Raspberry Pi or other ARM
device) — use `buildx` instead of plain `docker build`:
```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub-username>/maintenhance:latest --push .
```
`--push` is required for multi-platform builds, since Docker can't load
more than one platform into the local image cache at once.

**Getting a locally built image onto a *different* machine** (e.g. a
remote server Portainer manages, when you built on your own laptop):
either push it to a registry as above and pull it there, or transfer it
directly:
```bash
docker save maintenhance:latest -o maintenhance.tar
# copy maintenhance.tar to the other machine, then there:
docker load -i maintenhance.tar
```

## 5. Deploying with Portainer

Since `docker-compose.yml` has no `build:` section, Portainer never
needs your Dockerfile or source tree — either deployment method below
just pulls (or finds locally) the image named in `image:`.

### Option A — Portainer "Repository" stack

1. **Stacks → Add stack**, build method **Repository**.
2. **Repository URL:** your GitHub repo (e.g.
   `https://github.com/jameshoffman7667/maintenhance`).
3. **Compose path:** `docker-compose.yml` (the default).
4. Under **Environment variables**, add:
   - `JWT_SECRET` → a long random string (e.g. output of `openssl rand -hex 32`)
   - `COOKIE_SECURE` → `false` for LAN-only access, `true` if this sits behind HTTPS
   - `PORT` → optional, defaults to `8040` if omitted
5. **Deploy the stack.**

### Option B — paste the compose file directly (Web editor)

If Portainer's "Repository" method isn't available to you, or you'd
rather not connect it to GitHub at all — this is the method that
previously failed with "failed to read dockerfile" if you tried it
with the old build-based compose file. That's fixed now, since there's
nothing to build:

1. **Stacks → Add stack → Web editor**.
2. Paste the contents of `docker-compose.yml` as-is.
3. Add the same `JWT_SECRET` / `COOKIE_SECURE` environment variables as above.
4. **Deploy the stack.**

Either way, to pick up a new image later, open the stack and use
**Pull and redeploy** (or **Update the stack**, depending on your
Portainer version).

### If the image is private

If you kept your Docker Hub repository private, Portainer needs
credentials to pull it:

1. In Portainer: **Registries → Add registry → DockerHub**.
2. Enter your Docker Hub username and an access token (same kind you
   created for GitHub Actions in §2, or a separate one with Read scope).
3. Deploy the stack as above — Portainer authenticates automatically.

Simplest fix, though: keep the repository public and skip this
entirely.

## 6. Household members & administration

Once signed in as Owner, go to the **Owner Tools** page (visible only
to the Owner role) to create accounts for other household members —
Owner, Manager, Executor, or Guest. Each person signs in with their own
username/password. Owner Tools is also where you customise branding, back up and
restore (Excel or a Full backup .zip with photos), and delete a work order
or request by number.

**Passwords (v2.2):** everyone can change their own password and email from
the key icon next to their name. As Owner, use the key button on a member to
set a temporary password (typed or generated; shown once). Accounts you create,
and any account you reset, must choose a new password at next sign-in. If
`SMTP_HOST` and `APP_URL` are both set, the sign-in screen offers "Forgot
password?", which emails a one-hour reset link to the address on the account
(each email can belong to one account only).

**Optional email notifications:** set the `SMTP_*` variables in your
`.env` file (see `.env.example`) to enable a once-a-day digest email
covering overdue work orders, warranties expiring soon, and unreviewed
work requests. With `SMTP_HOST` left blank, nothing is sent — no setup
required. Once SMTP is configured, each member sets their own
notification email and picks which digests they want via the bell
icon next to their name on the members list.

## 7. Using it as an Android/Chrome app (PWA)

On an Android phone, open the site in **Chrome**, then use the menu →
**"Add to Home screen" / "Install app"**. On a Chromium desktop
browser (Chrome, Edge), look for the install icon in the address bar,
or the **Install app** button that appears in MaintEnhance's own top bar
when the browser offers it. Either way, it launches full-screen with
its own icon, no browser chrome — no Play Store listing needed.

Two levels of access:

- **Same Wi-Fi network as the server:** just visit
  `http://<server-LAN-IP>:8040` from the phone. Chrome will generally
  offer to add a home-screen shortcut even over plain HTTP on a private
  network, though some install-prompt features are HTTPS-only.
- **Truly remote (outside your home network):** Android's full PWA
  install behavior — and browsers in general — expect **HTTPS**. See
  the next section.

## 8. Enabling HTTPS for remote access

If you want to use MaintEnhance from outside your home (e.g. household
members checking work requests while out), you need HTTPS and a way
for traffic to reach your server. This repo doesn't bundle a reverse
proxy — pick whichever you're already comfortable with, or use one of
the no-server-config options below.

### Reverse proxy options (pick one)

Any of these can sit in front of the `maintenhance` container and handle
HTTPS. All of them need ports 80/443 forwarded to your Docker host and
a domain (or subdomain) pointed at your home's public IP:

- **[Caddy](https://caddyserver.com/)** — simplest to hand-configure;
  automatic HTTPS via Let's Encrypt with a couple of lines of config.
  Run it as its own container (`caddy:2-alpine`), pointed at
  `maintenhance:8040` (or whatever `PORT` you set).
- **[Nginx Proxy Manager](https://nginxproxymanager.com/)** — a
  web-UI-driven reverse proxy, popular in home-server/Portainer setups;
  handles Let's Encrypt certificates through its UI, no config files.
- **[Traefik](https://traefik.io/traefik/)** — auto-discovers
  containers via Docker labels; a good fit if you're already running
  several services this way.

For a **subpath** deployment (e.g. `example.com/maintenhance/` rather than
a dedicated subdomain) specifically: build the image with
`VITE_BASE_PATH=/maintenhance/` (see §4), and configure your reverse proxy
to strip the `/maintenhance` prefix before forwarding to the container
(Caddy calls this `handle_path`; other proxies have equivalent
"strip prefix" options) — otherwise the app's own asset requests won't
line up with what the proxy is expecting. A dedicated subdomain avoids
this extra step entirely, since nothing needs stripping.

Once HTTPS is in place, set `COOKIE_SECURE=true` in `.env` (or your
Portainer stack's environment variables) — browsers silently refuse to
send secure cookies over plain HTTP, so leaving this on before HTTPS
is live will lock you out of logging in.

### No domain, or don't want to open ports

Use a tunneling service such as [Tailscale](https://tailscale.com/)
(puts your phone and server on a private encrypted network — simplest
for a household) or a
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
pointed at `http://localhost:8040`. Either gives you a stable HTTPS URL
without router configuration or a reverse proxy of your own. Set
`COOKIE_SECURE=true` once traffic arrives over HTTPS either way.

## 9. Data & backups

Storage is split into two volumes (v2.5):

| Volume (container path) | Holds | Put it on |
| --- | --- | --- |
| `maintenhance_data` (`/data`) | the SQLite database `maintenhance.db` and its journal files | fast storage (SSD) |
| `maintenhance_files` (`/files`) | `attachments/` (work-request photos), `backups/` (nightly snapshots), `tmp/` (import staging) | slower storage (disc pool) |

By default both are Docker named volumes. To place them on specific disks,
set `DATA_PATH` and `FILES_PATH` in `.env` (or the Portainer stack variables)
to host folders, e.g. `DATA_PATH=/mnt/ssd/maintenhance` and
`FILES_PATH=/mnt/pool/maintenhance`. Create the folders first. Do not put the
database on a network share (NFS/SMB): SQLite needs a local filesystem.

Running the image without compose? `FILES_DIR` defaults to `DATA_DIR`, so a
single volume still works. `ATTACH_DIR`, `BACKUP_DIR` and `TMP_DIR` can
override individual folders.

Back up both volumes (the database is the important one; the nightly
snapshots are a safe copy of it, so keeping them on the pool also protects
against an SSD failure):

```bash
docker run --rm -v maintenhance_maintenhance_data:/data -v "$PWD":/backup \
  alpine tar czf /backup/maintenhance-data-$(date +%F).tar.gz -C /data .
docker run --rm -v maintenhance_maintenhance_files:/data -v "$PWD":/backup \
  alpine tar czf /backup/maintenhance-files-$(date +%F).tar.gz -C /data .
```

(Volume names are prefixed by your stack or folder name — run
`docker volume ls` to check. With host folders, just back up the folders.)

To restore, reverse the tar commands into fresh volumes before starting the
container.

MaintEnhance also has its own in-app backup (v2.2), independent of the above.
As an Owner, **Owner Tools → Backup & bulk edit** offers:

- **Export to Excel:** all data plus members, alarms, alarm mappings, branding
  settings and logo, and an attachments index. Password hashes and the webhook
  key are left out unless you tick "Include login credentials".
- **Full backup (.zip):** the workbook plus every photo. Restore it with
  "Import from Excel or backup".
- **Import:** you pick which tabs to apply ("Update and add", or "Replace
  tab" with a confirmation). The file is checked first; any errors are shown
  (and downloadable) and nothing is applied.
- **Automatic snapshots:** a database copy about once a day in `backups/` in
  the data volume (`BACKUP_KEEP`, `BACKUP_SNAPSHOTS`). Same disk, so also keep
  a Full backup somewhere else.
- New photos are shrunk in the browser (about 1600 px, JPEG); a one-time button
  shrinks existing ones.

## 10. Updating

**Local Docker Compose:**
```bash
docker compose pull
docker compose up -d
```

**Portainer:** push your changes to GitHub (which triggers the GitHub
Actions build), then in Portainer use **Pull and redeploy** on the
stack to fetch the new image.

**If you're using a locally prebuilt image** instead of Docker Hub,
rebuild it (§4) and run `docker compose up -d` again — Docker will
notice the image changed and recreate the container.

The database volume is untouched by any of the above.

## 11. Security notes

- Always set a real `JWT_SECRET` before exposing this beyond
  `localhost` — the default is intentionally insecure and only meant
  for a first local test.
- Passwords are hashed with bcrypt; sessions are signed JWTs stored in
  an `httpOnly` cookie.
- Sign-in is throttled (8 failed attempts per 15 minutes per address and
  username) and password-reset requests are limited too; limits are held in
  memory and reset on restart. For an internet-facing deployment, still
  consider a reverse proxy with its own protection.
- Changing or resetting a password signs that account out everywhere else.
- This app is scoped to a single household (per the functional spec) —
  every account shares the same asset/location/work-order data. It's
  not designed for multiple unrelated households on one instance.

## 12. Known simplifications vs. the full functional spec

- **Branding (v2.2):** PWA home-screen icons can't be branded yet; only the location hierarchy wording and the word "household" are configurable — other UI copy is fixed.

- **Notifications** are in-app indicators plus an opt-in daily email
  digest (v1.2, requires SMTP configuration — see Section 6) — no push
  or SMS yet. Adding push notifications would mean integrating a
  service like Firebase Cloud Messaging for the Android PWA.
- **Offline support (v1.6)** covers the app shell (loads while offline)
  plus submitting a **Work Request** with photos while offline — it's
  saved on the device and synced automatically once you're back
  online. Everything else (Work Orders, Assets, Locations, Parts, etc.)
  still requires a live connection to view or edit; direct Work Order
  creation (an Owner/Manager action) isn't queued for offline use.
  Sync is triggered by the browser's online/offline events, on app
  load, a manual "Sync now" click, and a 2-minute fallback check — not
  the Background Sync API, which isn't supported everywhere (notably
  iOS Safari), so a sync can be a little delayed if the app isn't open
  when connectivity returns.
- **Photo attachments (v1.6)** are capped at 5 per work request, 8MB
  and images only per file, stored as plain files under `DATA_DIR`
  (see Section 9) — back up that whole directory, not just the SQLite
  file, if you want photos included in your backups.
- There isn't a calendar-export (ICS) feature yet.
- **Seasonal PM triggers** (v1.3) use fixed Northern Hemisphere
  meteorological season boundaries (Mar 1 / Jun 1 / Sep 1 / Dec 1)
  rather than a real climate/weather lookup — nudge the day offset if
  you're in the Southern Hemisphere or want it to track local
  conditions more closely.
- The **PM setup wizard's** (v1.5) climate-zone guess is a small
  built-in state/province lookup table, not a live climate or
  geocoding service — it's shown for you to confirm or correct before
  anything is created, and can be off for addresses it doesn't
  recognize (falls back to "Unknown," letting you pick manually).
- **Sensor alarms (v1.7)** are pushed in from Home Assistant only — there's
  no polling of HA's API, no other smart-home platform is wired up
  (though the `source` field is generic, so another one could be added
  later without a redesign), and there's no rate-limiting on the
  webhook beyond the API key itself, so a misconfigured HA automation
  that fires repeatedly will create repeated alarm rows. Alarms and
  sensor mappings live in their own database tables and aren't
  included in the Owner Tools Excel backup/restore — back up the whole
  `DATA_DIR` volume (Section 9) if you want them covered. The open-alarm
  count badge is polled every 30 seconds while the app is open, not
  pushed to the browser in real time.
- **v1.8 rebrand (HomeKeep → MaintEnhance)** was a product-name change. Two upgrade side effects: the session cookie was renamed,
  so **everyone needs to log back in once** after upgrading to v1.8;
  and the offline work-request queue's local IndexedDB store was also
  renamed, so if a device has requests still queued (not yet synced)
  from before the upgrade, sync them (or go online and let them sync)
  **before** upgrading that device's app — a queue under the old name
  won't be picked up after the rename.
- **Alarms page (v1.8, renamed in v2.3)** — the PM-checklist-triggered and manual
  alarm paths are additive on top of v1.7's Home Assistant webhook;
  everything noted above about alarms not being included in the Excel
  backup/restore, and about the open-alarm badge being polled rather
  than pushed, applies to all three sources equally.
- **PM Wizard starter catalogue editor (v1.8)** only supports Calendar/
  Non-fixed entries (matching what the wizard has always generated) —
  building a Meter- or Seasonal-triggered starter entry isn't
  supported from the editor; create those by hand from Work Orders
  after running the wizard, same as before.
- **Optional features (v2.2).** The Home Assistant alarm integration is switched on or off by the Owner in Owner Tools → Features (no restart needed). Only the webhook/API-key/mapping piece is gated; manual and checklist-raised alarms stay on.
