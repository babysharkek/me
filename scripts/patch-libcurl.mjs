import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Source: the original libcurl-transport bundle
const { libcurlPath } = await import("@mercuryworkshop/libcurl-transport");
const srcBundle = join(libcurlPath, "index.mjs");

// Find libcurl.wasm
const pnpmWasm = join(root, "node_modules", ".pnpm", "libcurl.js@0.7.4", "node_modules", "libcurl.js", "libcurl.wasm");
const fallbackWasm = join(dirname(dirname(libcurlPath)), "node_modules", "libcurl.js", "libcurl.wasm");
let wasmSrc = null;
for (const p of [pnpmWasm, fallbackWasm]) {
    if (existsSync(p)) { wasmSrc = p; break; }
}

// Output directory
const outDir = join(root, "public", "libcurl");
mkdirSync(outDir, { recursive: true });

// Patch the bundle: add load_wasm call before new libcurl.HTTPSession
let src = readFileSync(srcBundle, "utf8");

const needle = `    libcurl.set_websocket(this.wisp);
    this.session = new libcurl.HTTPSession({`;
const replacement = `    libcurl.set_websocket(this.wisp);
    if (!libcurl.ready) {
      const wasmUrl = new URL("/libcurl/libcurl.wasm", location.origin).href;
      libcurl.load_wasm(wasmUrl);
      await new Promise((resolve) => { libcurl.onload = resolve; });
    }
    this.session = new libcurl.HTTPSession({`;

if (!src.includes(needle)) {
    console.error("ERROR: Could not find patch target in libcurl-transport bundle.");
    console.error("The bundle may have changed. Check needle string.");
    process.exit(1);
}

src = src.replace(needle, replacement);
writeFileSync(join(outDir, "index.mjs"), src, "utf8");
console.log("✓ Patched index.mjs written to public/libcurl/index.mjs");

// Copy WASM
if (wasmSrc) {
    copyFileSync(wasmSrc, join(outDir, "libcurl.wasm"));
    console.log("✓ libcurl.wasm copied to public/libcurl/libcurl.wasm");
} else {
    console.error("WARN: Could not find libcurl.wasm source — proxy may not work.");
}
