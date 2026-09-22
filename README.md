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
│   └── docker-publish.yml   # CI: builds & pushes the image to ghcr.io on push
├── Dockerfile              # multi-stage build: frontend build → backend runtime
├── docker-compose.yml      # pulls the GHCR image (or builds locally) + optional HTTPS profile
├── Caddyfile                # reverse proxy config, only used with --profile https
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

`docker-compose.yml` is already set to pull `ghcr.io/jameshoffman7667/homekeep:latest`
— that's the image name the GitHub Actions workflow below publishes to
for this repo, so no editing needed unless you fork it under a
different owner/repo name (in which case, update that `image:` line to
match, all lowercase).

### Continuous builds via GitHub Actions

`.github/workflows/docker-publish.yml` is already included. On every
push to `main` (and on version tags like `v1.0.0`), it builds the
Dockerfile in this repo and pushes the image to the **GitHub Container
Registry** (`ghcr.io`) — tagged `latest` plus the commit SHA. No setup
needed beyond pushing to GitHub; it uses the repo's built-in
`GITHUB_TOKEN`.

By default, new packages on GHCR are **private**. If you want Portainer
(or anyone else) to pull the image without authenticating, go to your
GitHub profile → **Packages** → the `homekeep` package → **Package
settings** → change visibility to **Public**. Otherwise, see the
"private image" note in the Portainer section below.

## 3. Quick start — running it yourself with Docker Compose

```bash
cd homekeep
cp .env.example .env
# Edit .env and set JWT_SECRET to a long random string, e.g.:
#   openssl rand -hex 32
# PORT defaults to 8040 — change it in .env if that port is already in use.

docker compose up -d --build
```

`--build` builds locally from the Dockerfile the first time; once the
GitHub Actions workflow has published an image, plain `docker compose
up -d` will pull it from GHCR instead.

The first build takes a few minutes (installing dependencies, compiling
`better-sqlite3`, building the frontend). After that, it starts in seconds.

Open **http://localhost:8040** — or, from another device on the same
Wi-Fi/LAN, **http://\<this-machine's-LAN-IP\>:8040** (find the IP with
`ip addr` / `ifconfig` on Linux/macOS or `ipconfig` on Windows). If you
set a different `PORT` in `.env`, use that instead of 8040 throughout
this document.

The first time you open it, you'll be asked to create the **Owner**
account. After that, sign in from any device on the network.

## 4. Deploying with Portainer

Once the image is published to GHCR (step 2), Portainer just needs to
know where to pull it from — it doesn't need to build anything itself.

### Option A — Portainer "Repository" stack (recommended)

1. In Portainer, go to **Stacks → Add stack**.
2. Choose **Repository** as the build method.
3. **Repository URL:** your GitHub repo URL (e.g.
   `https://github.com/jameshoffman7667/homekeep`).
4. **Compose path:** `docker-compose.yml` (the default).
5. Under **Environment variables**, add:
   - `JWT_SECRET` → a long random string (e.g. output of `openssl rand -hex 32`)
   - `COOKIE_SECURE` → `false` for LAN-only access, `true` if this stack sits behind HTTPS
   - `PORT` → optional, defaults to `8040` if omitted; set this if that port is already in use on the host
6. Click **Deploy the stack**. Portainer pulls
   `ghcr.io/jameshoffman7667/homekeep:latest` (the value you set in
   `docker-compose.yml`) and starts the container.

To pick up new pushes later, open the stack in Portainer and use
**Pull and redeploy** (or **Update the stack**, depending on your
Portainer version) to fetch the latest image from GHCR.

> If your Portainer edition/version doesn't expose the "Repository"
> build method, use **Option B** below instead — it works everywhere.

### Option B — paste the compose file directly (Web editor)

1. **Stacks → Add stack → Web editor**.
2. Paste the contents of this repo's `docker-compose.yml` (with
   `ghcr.io/jameshoffman7667/homekeep:latest` already edited to your real image name).
3. Add the same `JWT_SECRET` / `COOKIE_SECURE` environment variables as
   above.
4. Deploy. This method never touches your Git repo — you'll need to
   re-paste the file if you change it.

### If the GHCR image is private

Portainer needs credentials to pull a private GHCR image:

1. Create a GitHub [Personal Access Token](https://github.com/settings/tokens)
   with at least `read:packages` scope.
2. In Portainer, go to **Registries → Add registry → Custom registry**,
   set the URL to `ghcr.io`, and use your GitHub username + that token
   as the credentials.
3. Deploy the stack as above — Portainer will authenticate
   automatically when pulling.

Simplest fix, though: make the package public (see step 2 above) and
skip registry credentials entirely.

## 5. Adding household members

Once signed in as Owner, click **Members** in the top bar to create
accounts for other household members (Owner or Household Member role).
Each person signs in with their own username/password — this replaces
the old prototype's demo role-switcher with real accounts and real
permissions, matching the functional spec.

## 6. Using it as an Android app (PWA)

On an Android phone, open the site in **Chrome**, then use the menu →
**"Add to Home screen" / "Install app"**. It launches full-screen with
its own icon, no browser chrome, and a home-screen icon — no Play Store
listing needed.

Two levels of access:

- **Same Wi-Fi network as the server:** just visit
  `http://<server-LAN-IP>:8040` from the phone. Chrome will generally
  offer to add a home-screen shortcut even over plain HTTP on a private
  network, though some install-prompt features are HTTPS-only.
- **Truly remote (outside your home network):** Android's full PWA
  install behavior — and browsers in general — expect **HTTPS**. See the
  next section.

## 7. Enabling HTTPS for remote access

If you want to use HomeKeep from outside your home (e.g. household
members checking work requests while out), you need HTTPS and a way for
traffic to reach your server.

### Option A — dedicated (sub)domain, e.g. `homekeep.hoffmanhouse.ca`

The simplest path — no frontend rebuild needed, works with the default
image as-is.

1. In your DNS provider, add an A (and/or AAAA) record for
   `homekeep.hoffmanhouse.ca` pointing at your home's public IP (or use a
   dynamic-DNS service if your IP isn't static).
2. On your router, forward ports 80 and 443 to the machine running Docker.
3. In `Caddyfile`, uncomment **Pattern A** and set it to your subdomain:
   ```
   homekeep.hoffmanhouse.ca {
       reverse_proxy homekeep:{$PORT}
   }
   ```
4. In `.env`, set `COOKIE_SECURE=true`.
5. Start everything, including the reverse proxy:
   ```bash
   docker compose --profile https up -d --build
   ```
   Caddy automatically requests and renews a free HTTPS certificate via
   Let's Encrypt — no manual certificate handling.

### Option B — a subpath on an existing domain, e.g. `hoffmanhouse.ca/homekeep`

This is what you want if `hoffmanhouse.ca` already hosts (or will host)
other things and you'd rather not use a subdomain. It needs one extra
step compared to Option A: **a single-page app has to be told it's being
served from a subpath**, or it tries to load its files from the domain
root and breaks (blank page, missing icons, failed logins). This repo's
build already supports this via the `VITE_BASE_PATH` setting — you just
need to turn it on and rebuild.

**Step by step:**

1. **Point DNS at your home server.** In your DNS provider (wherever
   `hoffmanhouse.ca` is registered/managed), add an A record (and AAAA if
   you have an IPv6 address) for `hoffmanhouse.ca` — or the subdomain
   you're actually using for your main site — pointing at your home's
   public IP address. If your ISP doesn't give you a static IP, use a
   dynamic-DNS updater instead of a plain A record.

2. **Forward ports on your router.** Forward external ports **80** and
   **443** to the internal IP address of the machine running Docker.
   Both are required — port 80 for the initial Let's Encrypt
   verification, port 443 for HTTPS traffic itself.

3. **Build the image with the subpath baked in.** In `.env`, add:
   ```
   VITE_BASE_PATH=/homekeep/
   ```
   (leading *and* trailing slash matter). Then build — note `build`,
   not just `up`, so the frontend actually gets rebuilt with this setting:
   ```bash
   docker compose build homekeep
   ```

4. **Configure Caddy for the subpath.** Edit `Caddyfile`: uncomment
   **Pattern B** and set your real domain:
   ```
   hoffmanhouse.ca {
       handle_path /homekeep/* {
           reverse_proxy homekeep:{$PORT}
       }
       # ...anything else you host at hoffmanhouse.ca goes here...
   }
   ```
   `handle_path` strips the `/homekeep` prefix before forwarding to the
   container, so the app (now built knowing it lives under `/homekeep/`)
   and the container agree on where things are.

5. **Set `COOKIE_SECURE=true`** in `.env`, since this will now be served
   over HTTPS.

6. **Start everything:**
   ```bash
   docker compose --profile https up -d
   ```
   (You already built the image with the right base path in step 3, so
   no `--build` needed here — just don't run a plain `docker compose
   build` again without `VITE_BASE_PATH` set, or it'll silently rebuild
   back to a root-path image.)

7. **Verify:** visit `https://hoffmanhouse.ca/homekeep/` in a browser.
   Caddy will obtain a certificate automatically on first request (this
   can take a few seconds). Check `docker compose logs caddy` if it
   doesn't come up right away.

**If you later want to remove the subpath and go back to root or a
subdomain:** just unset `VITE_BASE_PATH` (or set it back to `/`) and
run `docker compose build homekeep` again — nothing else in the app
needs to change either way.

**If you're deploying this via Portainer** (see §4) rather than plain
Docker Compose on the command line: the image published to GHCR is
always built with the default root path, so a subpath deployment needs
Portainer to build the image itself rather than pull it. When adding
the stack, set the build method to build from the Dockerfile (not just
pull `image:`), and add `VITE_BASE_PATH=/homekeep/` as a build argument
if your Portainer version exposes that option — otherwise, build the
image once on the command line as in step 3 above, push it to your own
registry, and point Portainer's `image:` at that instead.

### Option C — no domain, or don't want to open ports

Use a tunneling service such as [Tailscale](https://tailscale.com/) (puts
your phone and server on a private encrypted network — simplest for a
household) or a
[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
pointed at `http://localhost:8040`. Either gives you a stable HTTPS URL
without router configuration. Set `COOKIE_SECURE=true` once traffic
arrives over HTTPS either way.

## 8. Data & backups

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

## 9. Updating

**Local Docker Compose:**
```bash
git pull            # if you're tracking this in version control
docker compose up -d --build
```

**Portainer:** push your changes to GitHub (which triggers the GitHub
Actions build), then in Portainer use **Pull and redeploy** on the
stack to fetch the new image.

The database volume is untouched by rebuilds either way.

## 10. Security notes

- Always set a real `JWT_SECRET` before exposing this beyond
  `localhost` — the default is intentionally insecure and only meant
  for a first local test.
- Passwords are hashed with bcrypt; sessions are signed JWTs stored in
  an `httpOnly` cookie.
- There's no rate-limiting on the login endpoint. For an internet-facing
  deployment, put it behind Caddy/Cloudflare (both provide basic
  protection) or add a rate limiter such as `express-rate-limit`.
- This app is scoped to a single household (per the functional spec) —
  every account shares the same asset/location/work-order data. It's
  not designed for multiple unrelated households on one instance.

## 11. Known simplifications vs. the full functional spec

- **Notifications** are in-app only (the bell icon) — no email/SMS/push
  yet. Adding push notifications would mean integrating a service like
  Firebase Cloud Messaging for the Android PWA.
- **Offline support** is limited to the app shell loading while
  offline; work order/request data still requires a live connection.
- There isn't a calendar-export (ICS) feature yet.

These are reasonable next additions if you want to keep building on
this — the backend's REST API (`/api/*` in `server.js`) is a
straightforward place to extend.
