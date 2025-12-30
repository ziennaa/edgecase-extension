// content.js
// Author:
// Author URI: https://
// Author Github URI: https://www.github.com/
// Project Repository URI: https://github.com/
// Description: Handles all the webpage level activities (e.g. manipulating page data, etc.)
// License: MIT
// content.js
// content.js
// content.js
// content.js
// content.js
const ICON_ID = "add-bookmark-button";
const bookmarkImgURL = chrome.runtime.getURL("assets/bookmark.png");
console.log("[edgecase] content.js loaded on:", location.href);
const store = {
    get: (key) => new Promise((resolve) => chrome.storage.local.get(key, resolve)),
    set: (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve)),
  };
  
  async function handleBookmarkClick(e) {
    e.preventDefault();
    e.stopPropagation();
  
    const data = collectProblemData();
    if (!data) return;
  
    const now = Date.now();
  
    // Load existing map and upsert
    const res = await store.get("bookmarks");
    const bookmarks = res.bookmarks || {};
  
    const existing = bookmarks[data.key];
    const record = {
      ...existing,        // keep old tags/status if you want
      ...data,            // overwrite with latest scraped title/url
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
  
    bookmarks[data.key] = record;
    await store.set({ bookmarks });
  
    console.log("[edgecase] saved:", record);
  }
  

boot();
function boot(){
    mount();
    const obs = new MutationObserver(() => mount());
    obs.observe(document.documentElement, { childList: true, subtree: true});
}
function mount(){
    if (document.getElementById(ICON_ID)) return;
    if (location.hostname.includes("codeforces.com")){
    mountOnCodeforces();
    }else if(location.hostname.includes("leetcode.com")){
        mountOnLeetCode();
    }
}
function makeIcon(){
    const img = document.createElement("img");
    img.id = ICON_ID;
    img.src  = bookmarkImgURL;
    img.alt = "Boookmark";
    img.title = "Bookmark this problem";
    img.style.width = "18px";
    img.style.height = "18px";
    img.style.marginLeft = "8px";
    img.style.verticalAlign = "middle";
    img.style.cursor = "pointer";
    img.style.display = "inline-block";
    
    //img.addEventListener("click", () => {
    //    console.log("Bookmark clicked:", location.href);
    //});

    img.addEventListener("error", ()=>{
        console.error("[edgecase] icon failed to load:", bookmarkImgURL);
    });
    img.addEventListener("click", handleBookmarkClick);
    return img;
}
function mountOnCodeforces(){
    const titleEl =
    document.querySelector(".problem-statement .header .title") ||
    document.querySelector(".problem-statement .title");
    if(!titleEl) return;
    titleEl.appendChild(makeIcon());
}
function mountOnLeetCode(){
    const titleEl = getLeetCodeTitle();
    if(titleEl){
        titleEl.appendChild(makeIcon());
        return;
    }
    const statusEl = findTopBadge(["Solved", "Attempted"]);
    if(statusEl){
        statusEl.appendChild(makeIcon());
        return;
    }
    const fallbackTitle = findVisibleTitleLike(/^\s*\d+\.\s+/);
    if(!fallbackTitle) return;
    fallbackTitle.appendChild(makeIcon());
}
function getLeetCodeTitle(){
    const cy = document.querySelector('[data-cy="question-title"]');
    if(cy){
        return cy.querySelector("a,h1,h2,h3,h4") || cy;
    }
    const slugMatch = location.pathname.match(/^\/problems\/([^/]+)/);
    if(slugMatch){
        const slug = slugMatch[1];
        const link = document.querySelector(`a[href^="/problems/${slug}/"]`);
        if (link) return link.querySelector("h1,h2,h3,h4,div,span") || link;
    }
    const heads = Array.from(document.querySelectorAll("h1,h2,h3,h4"));
    for (const h of heads) {
      const r = h.getBoundingClientRect();
      if (r.top >= 0 && r.top <= 260 && r.width > 200 && r.height > 10) return h;
    }
    return null;
}
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
  
function findVisibleTitleLike(regex){
    const els = Array.from(document.querySelectorAll("h1,h2,h3,h4,div,span"));
    for(const el of els){
        const t = (el.textContent || "").trim();
        if(!regex.test(t)) continue;

        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.top > 260) continue;
        if (r.width < 100 || r.height < 10) continue;
        const st = getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden") continue;

        return el;
    }
    return null;
}
function collectProblemData() {
    if (location.hostname.includes("leetcode.com")) return collectLeetCodeData();
    if (location.hostname.includes("codeforces.com")) return collectCodeforcesData();
    return null;
  }
  
  function collectLeetCodeData() {
    const m = location.pathname.match(/^\/problems\/([^/]+)/);
    if (!m) return null;
    const slug = m[1];
  
    const rawTitle = (getLeetCodeTitle()?.textContent || "").trim();
    const title = rawTitle.replace(/^\s*\d+\.\s+/, "").trim() || slug;
  
    //const difficulty = findTopBadge(["Easy", "Medium", "Hard"])?.textContent.trim() || null;
    //const status = findTopBadge(["Solved", "Attempted", "Todo"])?.textContent.trim().toLowerCase() || "unknown";

    return {
      key: `lc:${slug}`,
      site: "leetcode",
      url: `https://leetcode.com/problems/${slug}/`,
      slug,
      title,
      difficulty: null,   // optional but very useful
      status: "unknown",       // optional
      tags: []      // fill later from UI
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
  
    return {
      key: id ? `cf:${id.contestId}:${id.index}` : `cf:${url}`,
      site: "codeforces",
      url,
      contestId: id?.contestId || null,
      index: id?.index || null,
      title,
      rating: null,  // fill later if you want
      status: "unknown",
      tags: []
    };
  }
  
  function parseCodeforcesId() {
    let m = location.pathname.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/);
    if (m) return { contestId: m[1], index: m[2] };
    m = location.pathname.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/);
    if (m) return { contestId: m[1], index: m[2] };
    return null;
  }
  