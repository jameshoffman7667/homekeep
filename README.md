# HomeKeep — self-hosted deployment

A standalone, single-container build of the HomeKeep household CMMS: a
Node/Express + SQLite backend with real multi-user accounts, serving a
React frontend that's installable as a PWA on Android (or desktop).

This turns the earlier in-chat prototype into something you actually run
on your own hardware — a Raspberry Pi, a home server, a NAS with Docker
support, or a small cloud VM.

## What's inside

```
homekeep/
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
│   └── seed.js               # sample household loaded on first setup
└── frontend/                 # React app (Vite), builds to static files
    ├── src/App.jsx            # the full HomeKeep UI
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

## 1. Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
  (bundled with Docker Desktop; on Linux, install the `docker-compose-plugin`)
- A machine to run it on — this can be the same computer you're using now

## 2. Publish this repo to GitHub

```bash
cd homekeep
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/jameshoffman7667/homekeep.git
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
   tab). It'll publish to `docker.io/<DOCKERHUB_USERNAME>/homekeep:latest`.

`docker-compose.yml` is already set to pull `mybadreligon/homekeep:latest`.
If your Docker Hub username is different, update the `image:` line in
`docker-compose.yml` to match before deploying.

By default, a new Docker Hub repository is **public**, so no
credentials are needed to pull it. If you'd rather keep it private, see
"If the image is private" under Portainer, below.

## 3. Quick start — running it yourself with Docker Compose

```bash
cd homekeep
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string, e.g.:
#   openssl rand -hex 32
# PORT defaults to 8040 — change it in .env if that port is already in use.

docker compose up -d
```

This pulls `mybadreligon/homekeep:latest` (or whatever `image:` you
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
cd homekeep
docker build -t homekeep:latest .
```
(On Windows, run this from PowerShell or Command Prompt with Docker
Desktop running — the command is identical.)

**Use it locally without touching `docker-compose.yml`:** if the image
tag matches what's in the compose file (`mybadreligon/homekeep:latest`
by default), `docker compose up -d` will use your local build instead
of pulling — Docker always prefers an image it already has:
```bash
docker build -t mybadreligon/homekeep:latest .
docker compose up -d
```

**Push it to Docker Hub yourself** (useful if you don't want to rely on
GitHub Actions at all):
```bash
docker login
docker build -t <your-dockerhub-username>/homekeep:latest .
docker push <your-dockerhub-username>/homekeep:latest
```
Then point `docker-compose.yml`'s `image:` line at that tag.

**Building for a subpath deployment** (e.g. serving at
`example.com/homekeep/` — see §7): pass `VITE_BASE_PATH` as a build
argument, since it has to be baked into the frontend at build time:
```bash
docker build --build-arg VITE_BASE_PATH=/homekeep/ -t homekeep:latest .
```
Leave it off for a normal root deployment (the default).

**Different CPU architecture than your build machine** (e.g. building
on an Intel/AMD laptop but deploying to a Raspberry Pi or other ARM
device) — use `buildx` instead of plain `docker build`:
```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t <your-dockerhub-username>/homekeep:latest --push .
```
`--push` is required for multi-platform builds, since Docker can't load
more than one platform into the local image cache at once.

**Getting a locally built image onto a *different* machine** (e.g. a
remote server Portainer manages, when you built on your own laptop):
either push it to a registry as above and pull it there, or transfer it
directly:
```bash
docker save homekeep:latest -o homekeep.tar
# copy homekeep.tar to the other machine, then there:
docker load -i homekeep.tar
```

## 5. Deploying with Portainer

Since `docker-compose.yml` has no `build:` section, Portainer never
needs your Dockerfile or source tree — either deployment method below
just pulls (or finds locally) the image named in `image:`.

### Option A — Portainer "Repository" stack

1. **Stacks → Add stack**, build method **Repository**.
2. **Repository URL:** your GitHub repo (e.g.
   `https://github.com/jameshoffman7667/homekeep`).
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
username/password. Owner Tools is also where you export/import the
full household to Excel and delete a work order or request by number.

## 7. Using it as an Android/Chrome app (PWA)

On an Android phone, open the site in **Chrome**, then use the menu →
**"Add to Home screen" / "Install app"**. On a Chromium desktop
browser (Chrome, Edge), look for the install icon in the address bar,
or the **Install app** button that appears in HomeKeep's own top bar
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

If you want to use HomeKeep from outside your home (e.g. household
members checking work requests while out), you need HTTPS and a way
for traffic to reach your server. This repo doesn't bundle a reverse
proxy — pick whichever you're already comfortable with, or use one of
the no-server-config options below.

### Reverse proxy options (pick one)

Any of these can sit in front of the `homekeep` container and handle
HTTPS. All of them need ports 80/443 forwarded to your Docker host and
a domain (or subdomain) pointed at your home's public IP:

- **[Caddy](https://caddyserver.com/)** — simplest to hand-configure;
  automatic HTTPS via Let's Encrypt with a couple of lines of config.
  Run it as its own container (`caddy:2-alpine`), pointed at
  `homekeep:8040` (or whatever `PORT` you set).
- **[Nginx Proxy Manager](https://nginxproxymanager.com/)** — a
  web-UI-driven reverse proxy, popular in home-server/Portainer setups;
  handles Let's Encrypt certificates through its UI, no config files.
- **[Traefik](https://traefik.io/traefik/)** — auto-discovers
  containers via Docker labels; a good fit if you're already running
  several services this way.

For a **subpath** deployment (e.g. `example.com/homekeep/` rather than
a dedicated subdomain) specifically: build the image with
`VITE_BASE_PATH=/homekeep/` (see §4), and configure your reverse proxy
to strip the `/homekeep` prefix before forwarding to the container
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

All data lives in the `homekeep_data` Docker volume (a single SQLite
file). To back it up:

```bash
docker run --rm -v homekeep_homekeep_data:/data -v "$PWD":/backup \
  alpine tar czf /backup/homekeep-backup-$(date +%F).tar.gz -C /data .
```

(Volume name may be prefixed differently depending on your project
folder name — run `docker volume ls` to check.)

To restore, reverse the tar command into a fresh volume before starting
the container.

HomeKeep also has its own in-app backup, independent of the above: as
an Owner, use **Owner Tools → Backup & bulk edit** to export the whole
household to an Excel file, or re-import one.

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
- There's no rate-limiting on the login endpoint. For an internet-facing
  deployment, put it behind a reverse proxy that offers basic
  protection (Cloudflare, Nginx Proxy Manager, Traefik with a
  rate-limit middleware) or add one directly, such as
  `express-rate-limit`.
- This app is scoped to a single household (per the functional spec) —
  every account shares the same asset/location/work-order data. It's
  not designed for multiple unrelated households on one instance.

## 12. Known simplifications vs. the full functional spec

- **Notifications** are in-app only (the bell icon) — no email/SMS/push
  yet. Adding push notifications would mean integrating a service like
  Firebase Cloud Messaging for the Android PWA.
- **Offline support** is limited to the app shell loading while
  offline; work order/request data still requires a live connection.
- There isn't a calendar-export (ICS) feature yet.

These are reasonable next additions if you want to keep building on
this — the backend's REST API (`/api/*` in `server.js`) is a
straightforward place to extend.
