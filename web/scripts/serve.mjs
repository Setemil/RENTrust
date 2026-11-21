// Serves the built web app (web/dist) on a host such as Railway: `npm run build`, then `npm start`.
// It is a single-page app, so any path that isn't a file (/app/listings, /login…) gets
// index.html and the app's router takes over. Plain Node, no packages.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

// The file a URL path points at, or null when it isn't a file inside dist.
async function fileFor(urlPath) {
  const path = normalize(join(DIST, decodeURIComponent(urlPath)));
  if (path !== DIST && !path.startsWith(DIST + sep)) return null; // blocks ../ tricks
  const info = await stat(path).catch(() => null);
  return info?.isFile() ? path : null;
}

function send(res, path) {
  // Vite puts a content hash in every file name under /assets, so those can be cached for good.
  // index.html must never be cached, or visitors keep loading an old release.
  const cache = path.includes(`${sep}assets${sep}`) ? "public, max-age=31536000, immutable" : "no-cache";
  res.writeHead(200, {
    "Content-Type": TYPES[extname(path)] ?? "application/octet-stream",
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  createReadStream(path).pipe(res);
}

createServer(async (req, res) => {
  try {
    const urlPath = new URL(req.url ?? "/", "http://localhost").pathname;
    const file = await fileFor(urlPath);
    if (file) return send(res, file);
    // A missing file with an extension (an old asset, a typo) is a real 404, not the app.
    if (extname(urlPath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    send(res, join(DIST, "index.html"));
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
  }
}).listen(PORT, () => console.log(`Serving web/dist on port ${PORT}`));
