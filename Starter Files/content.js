// content.js
let companiesData = null;
let companiesLoadPromise = null;

function ensureCompaniesLoaded() {
  if (companiesLoadPromise) return companiesLoadPromise;

  const url = chrome.runtime.getURL("companies_map.json");
  companiesLoadPromise = fetch(url)
    .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    .then((j) => {
      companiesData = j;
      return j;
    })
    .catch((err) => {
      console.warn("[edgecase] companies_map.json not loaded:", err);
      companiesData = { map: {} };
      return companiesData;
    });

  return companiesLoadPromise;
}

const ICON_ID = "add-bookmark-button";
const bookmarkImgURL = chrome.runtime.getURL("assets/bookmark.png");

console.log("[edgecase] content.js loaded on:", location.href);

// Safe storage wrapper (prevents crash if permissions/context glitch)
const store = {
    get: (key) =>
      new Promise((resolve, reject) => {
        try {
          chrome.storage.local.get(key, (res) => {
            const err = chrome.runtime?.lastError;
            if (err) return reject(err);
            resolve(res);
          });
        } catch (e) {
          reject(e);
        }
      }),
  
    set: (obj) =>
      new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set(obj, () => {
            const err = chrome.runtime?.lastError;
            if (err) return reject(err);
            resolve();
          });
        } catch (e) {
          reject(e);
        }
      }),
  };
  

boot();

function boot() {
  mount();
  // LeetCode is SPA, so we re-mount when DOM changes
  const obs = new MutationObserver(() => mount());
  obs.observe(document.documentElement, { childList: true, subtree: true });
}

function mount() {
  if (document.getElementById(ICON_ID)) return;

  if (location.hostname.includes("codeforces.com")) mountOnCodeforces();
  else if (location.hostname.includes("leetcode.com")) mountOnLeetCode();
}

function makeIcon() {
  const img = document.createElement("img");
  img.id = ICON_ID;
  img.src = bookmarkImgURL;
  img.alt = "Bookmark";
  img.title = "Bookmark this problem";

  img.style.width = "18px";
  img.style.height = "18px";
  img.style.marginLeft = "8px";
  img.style.verticalAlign = "middle";
  img.style.cursor = "pointer";
  img.style.display = "inline-block";

  img.addEventListener("error", () => {
    console.error("[edgecase] icon failed to load:", bookmarkImgURL);
  });

  img.addEventListener("click", handleBookmarkClick);
  return img;
}

async function handleBookmarkClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (!chrome?.storage?.local) {
    console.error(
      "[edgecase] chrome.storage.local unavailable. Check manifest permissions: ['storage']."
    );
    return;
  }
  if (location.hostname.includes("leetcode.com")) {
    await ensureCompaniesLoaded();
  }
  

  const data = collectProblemData();
  if (!data) {
    console.warn("[edgecase] not a supported problem page:", location.href);
    return;
  }

  const now = Date.now();
  let res;
try {
  res = await store.get("bookmarks");
} catch (err) {
  const msg = String(err?.message || err);
  if (msg.includes("Extension context invalidated")) {
    console.warn("[edgecase] Extension was reloaded. Hard refresh this tab and try again.");
  } else {
    console.error("[edgecase] storage.get failed:", err);
  }
  return;
}

  const bookmarks = res.bookmarks || {};

  const existing = bookmarks[data.key] || {};
  // IMPORTANT:
  // - do NOT wipe user's custom tags/status when clicking bookmark again
  // - union tags (existing + scraped)
  const mergedTags = uniqStrings([...(existing.tags || []), ...(data.tags || [])]);
  const mergedCompanies = uniqStrings([
    ...(existing.companies || []),
    ...(data.companies || []),
  ]);
  
  const record = {
    ...existing,
    ...data,

    // keep user edits if already set
    status:
      existing.status && existing.status !== "unknown"
        ? existing.status
        : data.status || "unknown",

    tags: mergedTags,
    companies: mergedCompanies,
    // don't overwrite good values with null
    difficulty: data.difficulty || existing.difficulty || null,
    rating: data.rating ?? existing.rating ?? null,

    createdAt: existing.createdAt || now,
    updatedAt: now,
  };

  bookmarks[data.key] = record;
  try {
    await store.set({ bookmarks });
  } catch (err) {
    const msg = String(err?.message || err);
    if (msg.includes("Extension context invalidated")) {
      console.warn("[edgecase] Extension was reloaded. Hard refresh this tab and try again.");
    } else {
      console.error("[edgecase] storage.set failed:", err);
    }
    return;
  }
  

  console.log("[edgecase] saved:", record);
}

function mountOnCodeforces() {
  const titleEl =
    document.querySelector(".problem-statement .header .title") ||
    document.querySelector(".problem-statement .title");

  if (!titleEl) return;
  titleEl.appendChild(makeIcon());
}

function mountOnLeetCode() {
    // only on actual problem pages
    if (!location.pathname.startsWith("/problems/")) return;
  
    const host = getLeetCodeTitleHost();
    if (!host) return; // wait for SPA to render; MutationObserver will retry
  
    host.appendChild(makeIcon());
  }
  

/* ----------------------- SCRAPERS ----------------------- */

function collectProblemData() {
  if (location.hostname.includes("leetcode.com")) return collectLeetCodeData();
  if (location.hostname.includes("codeforces.com")) return collectCodeforcesData();
  return null;
}

function collectLeetCodeData() {
  const m = location.pathname.match(/^\/problems\/([^/]+)/);
  if (!m) return null;
  const slug = m[1];
  const companies = Array.isArray(companiesData?.map?.[slug])
  ? companiesData.map[slug]
  : [];

  const rawTitle = (getLeetCodeTitle()?.textContent || "").trim();
  const titleFromDom = rawTitle.replace(/^\s*\d+\.\s+/, "").trim();

  const titleFromDoc = (document.title || "")
    .replace(/\s*-\s*LeetCode\s*$/i, "")
    .trim();

  const title = titleFromDom || titleFromDoc || slug;

  const difficulty = scrapeLeetCodeDifficulty(); // Easy/Medium/Hard (best effort)
  const status = scrapeLeetCodeStatus();         // solved/revise/unsolved (best effort)
  const tags = scrapeLeetCodeTags();             // optional

  return {
    key: `lc:${slug}`,
    site: "leetcode",
    url: `https://leetcode.com/problems/${slug}/`,
    slug,
    title,
    difficulty: difficulty || null,
    status,
    tags,
    companies,
  };
}

function collectCodeforcesData() {
  const id = parseCodeforcesId();

  const titleEl =
    document.querySelector(".problem-statement .header .title") ||
    document.querySelector(".problem-statement .title");

  const title = (titleEl?.textContent || "").trim() || "Codeforces Problem";

  const url = id
    ? `https://codeforces.com/problemset/problem/${id.contestId}/${id.index}`
    : location.href;

  const rating = scrapeCodeforcesRating(); // e.g. 800, 1200...
  const tags = scrapeCodeforcesTags();     // optional

  return {
    key: id ? `cf:${id.contestId}:${id.index}` : `cf:${url}`,
    site: "codeforces",
    url,
    contestId: id?.contestId || null,
    index: id?.index || null,
    title,
    rating: rating ?? null,
    status: "unknown",
    tags,
  };
}

/* ----------------------- LeetCode helpers ----------------------- */

function getLeetCodeTitleHost() {
    // Most stable in LeetCode UI
    const cy = document.querySelector('[data-cy="question-title"]');
    if (cy) return cy; // this is the title container -> perfect to append inside
  
    // Some layouts use other test ids
    const testId =
      document.querySelector('[data-testid="question-title"]') ||
      document.querySelector('[data-test="question-title"]');
    if (testId) return testId;
  
    // Fallback: anchor based on slug in URL
    const slug = getLeetCodeSlugFromPath();
    if (slug) {
      const link = document.querySelector(`a[href^="/problems/${slug}/"]`);
      if (link) return link;
    }
  
    return null;
  }
  function getLeetCodeTitle() {
    const host = getLeetCodeTitleHost();
    if (!host) return null;
  
    // Prefer the actual title text element inside the host
    return host.querySelector("a,h1,h2,h3,h4") || host;
  }
  
  
  function getLeetCodeSlugFromPath() {
    const m = location.pathname.match(/^\/problems\/([^/]+)/);
    return m ? m[1] : null;
  }
  

function scrapeLeetCodeDifficulty() {
  const direct =
    document.querySelector('[data-cy="question-difficulty"]') ||
    document.querySelector('[data-testid="question-difficulty"]');

  const t0 = (direct?.textContent || "").trim();
  if (isDifficulty(t0)) return t0;

  // fallback: chip near top
  const t1 = findTopText(["Easy", "Medium", "Hard"], 340);
  if (isDifficulty(t1)) return t1;

  return null;
}

function scrapeLeetCodeStatus() {
  const badge = findTopText(["Solved", "Attempted"], 340);
  if (badge === "Solved") return "solved";
  if (badge === "Attempted") return "revise";
  return "unsolved";
}

function scrapeLeetCodeTags() {
  const nodes = Array.from(
    document.querySelectorAll('a[href^="/tag/"], a[href*="/tag/"]')
  );

  const tags = nodes
    .map((a) => (a.textContent || "").trim())
    .filter((t) => t && t.length <= 40);

  return uniqStrings(tags);
}

/* ----------------------- Codeforces helpers ----------------------- */

function parseCodeforcesId() {
  let m = location.pathname.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
  if (m) return { contestId: m[1], index: m[2] };

  m = location.pathname.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
  if (m) return { contestId: m[1], index: m[2] };

  return null;
}

function scrapeCodeforcesRating() {
  // Usually in right sidebar: "Problem rating: 800"
  const sideboxes = Array.from(document.querySelectorAll(".roundbox.sidebox"));
  for (const box of sideboxes) {
    const txt = box.textContent || "";
    const m = txt.match(/Problem rating:\s*(\d+)/i);
    if (m) return parseInt(m[1], 10);
  }

  // fallback: whole page
  const txt = document.body?.textContent || "";
  const m = txt.match(/Problem rating:\s*(\d+)/i);
  if (m) return parseInt(m[1], 10);

  return null;
}

function scrapeCodeforcesTags() {
  const nodes = Array.from(
    document.querySelectorAll(".roundbox.sidebox .tag-box")
  );

  const tags = nodes
    .map((n) => (n.textContent || "").trim())
    .filter((t) => t && !/^\d+$/.test(t));

  return uniqStrings(tags);
}

/* ----------------------- Generic helpers ----------------------- */

function findTopBadge(words) {
  const els = Array.from(document.querySelectorAll("div,span"));
  for (const el of els) {
    const t = (el.textContent || "").trim();
    if (!words.includes(t)) continue;

    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > 260) continue;
    if (r.width < 10 || r.height < 10) continue;

    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") continue;

    return el;
  }
  return null;
}

function findVisibleTitleLike(regex) {
  const els = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span"));
  for (const el of els) {
    const t = (el.textContent || "").trim();
    if (!regex.test(t)) continue;

    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > 260) continue;
    if (r.width < 100 || r.height < 10) continue;

    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") continue;

    return el;
  }
  return null;
}

function findTopText(words, topMax = 260) {
  const els = Array.from(document.querySelectorAll("div,span"));
  for (const el of els) {
    const t = (el.textContent || "").trim();
    if (!words.includes(t)) continue;

    const r = el.getBoundingClientRect();
    if (r.top < 0 || r.top > topMax) continue;
    if (r.width < 10 || r.height < 10) continue;

    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") continue;

    return t;
  }
  return null;
}

function isDifficulty(t) {
  return t === "Easy" || t === "Medium" || t === "Hard";
}

function uniqStrings(arr) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    const t = (s || "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
