# ---- Stage 1: build the frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
# Leave unset for a normal root deployment. Set to something like
# "/homekeep/" (leading AND trailing slash) to build the app for serving
# under a subpath behind a reverse proxy — see README.md.
ARG VITE_BASE_PATH=/
ENV VITE_BASE_PATH=$VITE_BASE_PATH
RUN npm run build

# ---- Stage 2: backend + built frontend, single runnable image ----
FROM node:20-slim AS runtime

# build-essential + python3 let native modules (better-sqlite3) compile
# from source if no prebuilt binary matches the image's platform.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/package.json ./
RUN npm install --omit=dev

COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

# SQLite database lives here — mount a volume at this path so data
# survives container rebuilds/restarts (see docker-compose.yml).
ENV DATA_DIR=/data
RUN mkdir -p /data

# Default port if none is supplied at runtime. docker-compose.yml passes
# PORT as an environment variable at `docker compose up` time, which
# overrides this — that's the normal way to change it. This ARG only
# matters if you build/run the image directly without compose and want
# a different built-in default (--build-arg PORT=3000).
ARG PORT=8080
ENV PORT=$PORT
EXPOSE $PORT

CMD ["node", "server.js"]
