const ICON_ID = "add-bookmark-button";
const bookmarkImgURL = chrome.runtime.getURL("assets/bookmark.png");
console.log("[edgecase] content.js loaded on:", location.href);
boot();
function boot(){
    mount();
    const obs = new MutationObserver(() => mount());
    obs.observe(document.documentElement, { childList: true, subtree: true});
}
function mount(){
    if(document.getElementsById(ICON_ID)) return;
    if(location.hostname.includes("codeforces.com")){
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
    
    img.addEventListener("click", () => {
        console.log("Bookmark clicked:", location.href);
    });
    img.addEventListener("error", ()=>{
        console.error("[edgecase] icon failed to load:", bookmarkImgURL);
    })
    img.addEventListener("click")
    return img;
}
function mountOnCodeforces(){
    const titleEl =
    document.querySelector(".problem-statement .header .title");
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
    }
    const fallbackTitle = findVisibleTitleLike(/^\s*\d\.\s+/);
    if(!fallbackTitle) return;
    fallbackTitle.appendChild(makeIcon());
}
function getLeetCodeTitle(){
    const cy = document.querySelector('[data-cy="question-title');
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