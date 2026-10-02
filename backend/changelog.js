// v2.6.1: reads CHANGELOG.md (shipped inside the image) so the app can show its
// version history and email "app updates" digests.
const fs = require("fs");
const path = require("path");
const pkg = require("./package.json");

const version = pkg.version.replace(/\.0$/, ""); // 2.6.0 -> 2.6, 2.6.1 stays
const vParts = (v) => String(v).replace(/^v/i, "").split(".").map((n) => parseInt(n, 10) || 0);
function cmp(a, b) {
  const x = vParts(a), y = vParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
}

let cache = null;
function load() {
  if (cache) return cache;
  let text = "";
  for (const p of [path.join(__dirname, "CHANGELOG.md"), path.join(__dirname, "..", "CHANGELOG.md")]) {
    try { text = fs.readFileSync(p, "utf8"); break; } catch (e) { /* try next */ }
  }
  const entries = [];
  const re = /^## (v[\w.]+)[^\n]*\n([\s\S]*?)(?=^## v|^---\s*$|(?![\s\S]))/gm;
  let m;
  while ((m = re.exec(text))) {
    const v = m[1].replace(/^v/, "");
    let body = m[2];
    const short = (/\*\*Commit short description:\*\*\s*`([^`]*)`/.exec(body) || [])[1] || "";
    const ext = (/\*\*Commit extended description:\*\*\s*\n?([\s\S]*)/.exec(body) || [])[1];
    body = (ext !== undefined ? ext : body.replace(/\*\*Commit short description:\*\*[^\n]*\n/, "")).trim();
    entries.push({ version: v, title: short, text: body });
  }
  entries.sort((a, b) => cmp(b.version, a.version));
  cache = entries;
  return entries;
}
// Entries newer than `since` (all of them if since is empty), newest first.
const entriesSince = (since) => load().filter((e) => !since || cmp(e.version, since) > 0);

module.exports = { version, entries: load, entriesSince, cmp };
