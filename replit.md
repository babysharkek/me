# Bolt

A clean web proxy interface — just a search bar, quick links, and a working proxy browser. Built with Astro and Fastify using Scramjet + libcurl-transport + baremux.

## Run & Operate

- **Install:** `pnpm install`
- **Build:** `pnpm run build` (runs `scripts/patch-libcurl.mjs` then Astro build)
- **Serve (production):** `PORT=5000 node app.js`
- **Dev server:** `pnpm run dev` (port 3000)
- **Required env vars:** `OPENROUTER_API_KEY` (optional, enables AI chat at `/api/chat`)

## Stack

- **Frontend:** Astro 5, Tailwind CSS v4, DaisyUI v5, Three.js
- **Backend:** Fastify 4 (serves built static files + API routes)
- **Proxy:** Scramjet SW, libcurl-transport (patched), bare-mux v2, wisp-js
- **Runtime:** Node.js 20, pnpm

## Where things live

- `src/pages/index.astro` — Clean homepage: title, search bar, quick links
- `src/pages/browser.astro` — Proxy browser page (proxy={true})
- `src/scripts/encoding.ts` — SW registration + baremux transport setup + URL encode/decode
- `src/scripts/proxy.ts` — Scramjet init + proxy helpers
- `src/scripts/browser.ts` — Tab creation after swReady
- `src/scripts/index.ts` — Search handler → navigates to /browser?url=...
- `public/libcurl/` — Patched libcurl-transport (`index.mjs`) + `libcurl.wasm`
- `public/` — Static assets (sw.js, UV bundles in math/, etc.)
- `scripts/patch-libcurl.mjs` — Build script: patches libcurl-transport to call `load_wasm` before HTTPSession
- `app.js` — Fastify production server (serves dist/ + baremux + wisp WS)
- `astro.config.mjs` — Astro build config with wisp/baremux dev middleware

## Architecture decisions

- **Patched libcurl transport:** The `@mercuryworkshop/libcurl-transport` bundle never calls `libcurl.load_wasm()`, but `libcurl.HTTPSession` constructor immediately calls `check_loaded()`. The patch script inserts a `load_wasm` + `await onload` call into `init()` before `new HTTPSession()` is created. Output goes to `public/libcurl/index.mjs` so it's served as a static asset.
- **WASM in public/:** `libcurl.wasm` is copied from the `libcurl.js@0.7.4` pnpm package into `public/libcurl/` at build time so it's served at `/libcurl/libcurl.wasm` without any special server route.
- **Build then serve:** Astro builds to `dist/`, Fastify serves the static output + handles WebSocket upgrades for the wisp proxy protocol.
- **COOP/COEP headers:** Required for SharedArrayBuffer support — set in both dev (astro plugin) and production (Fastify hook).
- **Port 5000:** Workflow runs `PORT=5000 node app.js`.

## Product

- Clean homepage: title "Bolt", search bar, 6 quick-link buttons (YouTube, TikTok, Discord, Reddit, Twitch, Spotify)
- Proxy browser using Scramjet SW + libcurl transport over wisp WebSocket
- No popups, ads, or Discord notifications
- Navigates directly to `/browser?url=<destination>` on search

## Gotchas

- Must run `pnpm run build` before `node app.js` — the server only serves the `dist/` folder.
- The libcurl patch (`scripts/patch-libcurl.mjs`) must succeed before the Astro build. If the libcurl-transport package updates and the needle string changes, the patch will fail loudly.
- `public/libcurl/index.mjs` and `public/libcurl/libcurl.wasm` are generated files — do not edit manually.
- Wisp WebSocket upgrades are handled at the server level — not compatible with static-only hosting.

## Pointers

- Scramjet docs: https://github.com/MercuryWorkshop/scramjet
- bare-mux docs: https://github.com/MercuryWorkshop/bare-mux
- libcurl-transport: `@mercuryworkshop/libcurl-transport`
