import fs from "fs";
import path from "path";

const INPUT_DIR = path.resolve("data/companywise");
const OUT_FILE = path.resolve("companies_map.json");

const TEXT_EXT = new Set([".md", ".txt", ".csv", ".tsv", ".json", ".html"]);

const TIME_BUCKETS = new Set([
  "all",
  "thirty-days",
  "thirtyday",
  "30-days",
  "three-months",
  "six-months",
  "more-than-six-months",
  "more-than-6-months",
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function uniq(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const t = String(x || "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function extractSlugs(text) {
  const slugs = [];

  const re1 = /leetcode\.com\/problems\/([a-z0-9-]+)\/?/gi;
  for (const m of text.matchAll(re1)) slugs.push(m[1]);

  const re2 = /\/problems\/([a-z0-9-]+)\/?/gi;
  for (const m of text.matchAll(re2)) slugs.push(m[1]);

  return uniq(slugs);
}

function getCompanyFromPath(filePath) {
  const rel = path.relative(INPUT_DIR, filePath);
  const parts = rel.split(path.sep);

  const base = path.basename(filePath, path.extname(filePath));
  const baseLower = base.toLowerCase();

  // skip junk files
  if (baseLower === "readme" || baseLower === "index") return null;

  // case 1: inside a bucket folder => bucket/<company>.md
  if (parts.length >= 2 && TIME_BUCKETS.has(parts[0].toLowerCase())) {
    if (TIME_BUCKETS.has(baseLower)) return null; // avoid all.md etc
    return baseLower; // keep lowercase consistent
  }

  // case 2: top-level bucket files like all.md, three-months.md => ignore
  if (parts.length === 1 && TIME_BUCKETS.has(baseLower)) return null;

  // fallback: treat filename as company
  if (TIME_BUCKETS.has(baseLower)) return null;
  return baseLower;
}

if (!fs.existsSync(INPUT_DIR)) {
  console.error(`[build] INPUT_DIR not found: ${INPUT_DIR}`);
  process.exit(1);
}

const files = walk(INPUT_DIR).filter((f) => TEXT_EXT.has(path.extname(f).toLowerCase()));

const map = {}; // slug -> [companies]
let totalPairs = 0;

for (const f of files) {
  let text;
  try {
    text = fs.readFileSync(f, "utf8");
  } catch {
    continue;
  }

  const company = getCompanyFromPath(f);
  if (!company) continue;

  const slugs = extractSlugs(text);
  if (!slugs.length) continue;

  for (const slug of slugs) {
    map[slug] ??= [];
    map[slug].push(company);
    totalPairs++;
  }
}

for (const slug of Object.keys(map)) {
  map[slug] = uniq(map[slug]).sort((a, b) => a.localeCompare(b));
}

const out = {
  generatedAt: Date.now(),
  source: "snehasishroy/leetcode-companywise-interview-questions",
  map,
};

fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2), "utf8");

console.log(`[build] wrote ${OUT_FILE}`);
console.log(`[build] slugs: ${Object.keys(map).length}, pairs: ${totalPairs}`);
