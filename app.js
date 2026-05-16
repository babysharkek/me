import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { join } from "node:path";
import { hostname } from "node:os";
import { server as wisp } from "@mercuryworkshop/wisp-js/server";

// Block ad networks, trackers, and popup-redirect domains at the TCP level
wisp.options.hostname_blacklist = [
    /googlesyndication\.com$/,
    /doubleclick\.net$/,
    /google-analytics\.com$/,
    /googletagmanager\.com$/,
    /googletagservices\.com$/,
    /amazon-adsystem\.com$/,
    /adsystem\.amazon\.com$/,
    /scorecardresearch\.com$/,
    /comscore\.com$/,
    /chartbeat\.com$/,
    /criteo\.com$/,
    /criteo\.net$/,
    /rubiconproject\.com$/,
    /pubmatic\.com$/,
    /openx\.net$/,
    /openx\.com$/,
    /adnxs\.com$/,
    /adsrvr\.org$/,
    /outbrain\.com$/,
    /taboola\.com$/,
    /moatads\.com$/,
    /quantserve\.com$/,
    /quantcast\.com$/,
    /casalemedia\.com$/,
    /contextweb\.com$/,
    /sovrn\.com$/,
    /lijit\.com$/,
    /sharethrough\.com$/,
    /triplelift\.com$/,
    /indexexchange\.com$/,
    /33across\.com$/,
    /spotx\.tv$/,
    /spotxchange\.com$/,
    /adroll\.com$/,
    /connect\.facebook\.net$/,
    /bidswitch\.net$/,
    /omtrdc\.net$/,
    /demdex\.net$/,
    /bluekai\.com$/,
    /mediamath\.com$/,
    /yieldmo\.com$/,
    /advertising\.com$/,
    /undertone\.com$/,
    /springserve\.com$/,
    /lotame\.com$/,
    /krxd\.net$/,
    /rlcdn\.com$/,
    /adtago\.s3\.amazonaws\.com$/,
    /mathtag\.com$/,
    /exelate\.com$/,
    /exelator\.com$/,
    /smartadserver\.com$/,
    /sascdn\.com$/,
    /eyeota\.net$/,
    /adform\.net$/,
    /adformnet\.com$/,
    /360yield\.com$/,
    /aniview\.com$/,
    /inmobi\.com$/,
    /stickyads\.tv$/,
    /yandex\.ru\/an\//,
    /pagead2\.googlesyndication\.com$/,
    /adservice\.google\./,
];
import { readFileSync, writeFileSync, existsSync } from "node:fs";

try { process.loadEnvFile(); } catch { /* .env not present or Node is too old */ }

const __dirname = process.cwd();
const publicPath = join(__dirname, "dist");

const fastify = Fastify({
    logger: true,
});

fastify.addHook("onSend", async (request, reply, payload) => {
    reply.header("Cross-Origin-Opener-Policy", "same-origin");
    reply.header("Cross-Origin-Embedder-Policy-Report-Only", "require-corp");
    return payload;
});
fastify.server.on("upgrade", (req, socket, head) => {
    socket.setKeepAlive(true, 30000);
    socket.setTimeout(0);
    wisp.routeRequest(req, socket, head);
});

fastify.server.on("connection", (socket) => {
    socket.setKeepAlive(true, 30000);
    socket.setTimeout(0);
});


await fastify.register(fastifyStatic, {
    root: publicPath,
    prefix: "/"
});

fastify.addContentTypeParser('application/javascript', { parseAs: 'string' }, (req, body, done) => {
    done(null, body);
});

await fastify.register(fastifyStatic, {
    root: baremuxPath,
    prefix: "/baremux/",
    decorateReply: false
});


fastify.get("/", (request, reply) => {
    return reply.sendFile("index.html");
});


const AUTH_FILE = join(__dirname, "data", "auth.json");

fastify.get("/api/me", async (request, reply) => {
    const cookieHeader = request.headers.cookie || "";
    const tokenMatch = cookieHeader.match(/(?:^|; )bolt_token=([^;]*)/);
    if (!tokenMatch) return reply.code(401).send({ error: "Not authenticated" });
    const token = decodeURIComponent(tokenMatch[1]);

    if (!existsSync(AUTH_FILE)) return reply.code(500).send({ error: "Auth data missing" });
    let auth;
    try { auth = JSON.parse(readFileSync(AUTH_FILE, "utf8")); }
    catch { return reply.code(500).send({ error: "Failed to read auth" }); }

    const entry = auth.find(e => Array.isArray(e.devices) && e.devices.includes(token));
    if (!entry) return reply.code(401).send({ error: "Token not recognized" });

    return reply.send({
        name: entry.name,
        currentDevice: entry.devices.indexOf(token) + 1,
        totalDevices: entry.devices.length,
        maxDevices: 3
    });
});

fastify.post("/api/login", async (request, reply) => {
    const { key } = request.body || {};
    if (!key) return reply.code(400).send({ error: "Key required." });

    if (!existsSync(AUTH_FILE)) {
        return reply.code(500).send({ error: "Auth data missing." });
    }

    let auth;
    try {
        auth = JSON.parse(readFileSync(AUTH_FILE, "utf8"));
    } catch {
        return reply.code(500).send({ error: "Failed to read auth data." });
    }

    const entry = auth.find(e => e.key === key);
    if (!entry) {
        return reply.code(401).send({ error: "Invalid key." });
    }

    // Migrate legacy format: claimed boolean → devices array
    if (!Array.isArray(entry.devices)) {
        entry.devices = entry.claimed ? ["legacy"] : [];
        delete entry.claimed;
    }

    const MAX_DEVICES = 3;
    if (entry.devices.length >= MAX_DEVICES) {
        return reply.code(403).send({
            error: `Max devices (${MAX_DEVICES}) reached for this key. Contact your admin to reset a device slot.`,
            maxDevices: true
        });
    }

    const token = crypto.randomUUID();
    entry.devices.push(token);

    try {
        writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
    } catch {
        return reply.code(500).send({ error: "Failed to save auth state." });
    }

    const maxAge = 30 * 24 * 60 * 60; // 30 days
    const deviceNum = entry.devices.length;
    reply.raw.setHeader("set-cookie", [
        `bolt_user=${encodeURIComponent(entry.name)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
        `bolt_token=${token}; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
    ]);
    return reply.send({ name: entry.name, device: deviceNum });
});

fastify.post("/api/chat", async (request, reply) => {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return reply.status(500).send({ error: "API key not configured on server." });
    }

    const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": request.headers["origin"] ?? "",
            "X-Title": "Bolt AI",
        },
        body: JSON.stringify(request.body),
    });

    const data = await upstream.json();
    return reply.status(upstream.status).send(data);
});

fastify.post("/api/deepreset", async (request, reply) => {
    const cookieNames = ["session", "auth-token", "refresh-token"];

    for (const name of cookieNames) {
        reply.header(
            "Set-Cookie",
            `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 UTC; HttpOnly; SameSite=Lax`
        );
    }

    reply.header("Clear-Site-Data", '"cache", "cookies", "storage"');

    return reply.status(200).send({ ok: true });
});


fastify.setNotFoundHandler((request, reply) => {
    return reply.send("404 Not Found");
});


function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    fastify.close();
    process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);


let port = parseInt(process.env.PORT || "8080");
if (isNaN(port)) port = 8080;

try {
    const address = await fastify.listen({ port, host: "0.0.0.0" });
    console.log("Listening on:");
    console.log(`\thttp://localhost:${port}`);
    console.log(`\thttp://${hostname()}:${port}`);

    const serverAddress = fastify.server.address();
    console.log(
        `\thttp://${serverAddress.family === "IPv6" ? `[${serverAddress.address}]` : serverAddress.address}:${serverAddress.port}`
    );
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}
