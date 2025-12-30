
const store = {
    get: (key) => new Promise((resolve) => chrome.storage.local.get(key, resolve)),
    set: (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve)),
  };
  
  const els = {
    list: document.getElementById("bookmarks"),
    search: document.getElementById("search"),
    overlay: document.getElementById("modalOverlay"),
    modal: document.getElementById("editModal"),
    closeModal: document.getElementById("closeModal"),
    cancelEdit: document.getElementById("cancelEdit"),
    saveEdit: document.getElementById("saveEdit"),
    statusSelect: document.getElementById("statusSelect"),
    tagsInput: document.getElementById("tagsInput"),
    remindSelect: document.getElementById("remindSelect"),
  };
  
  let allEntries = [];     // [{key, record}]
  let editingKey = null;
  
  const KNOWN_STATUSES = new Set(["unsolved", "revise", "solved", "didnt-understand"]);
const customField = document.getElementById("customStatusField");
const customInput = document.getElementById("customStatusInput");

function normStatus(s) {
  return (s || "").trim();
}

  boot();
  
  function boot() {
    els.search.addEventListener("input", render);
  
    els.overlay.addEventListener("click", closeEdit);
    els.closeModal.addEventListener("click", closeEdit);
    els.cancelEdit.addEventListener("click", closeEdit);
    els.saveEdit.addEventListener("click", saveEdit);
  
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeEdit();
    });
  
    // event delegation for card buttons
    els.list.addEventListener("click", onListClick);
    els.statusSelect.addEventListener("change", () => {
        const isCustom = els.statusSelect.value === "__custom__";
        customField.classList.toggle("hidden", !isCustom);
        if (isCustom) customInput.focus();
      });
      
  
    refresh();
  }
  
  async function refresh() {
    const res = await store.get("bookmarks");
    const map = res.bookmarks || {};
  
    allEntries = Object.entries(map)
      .map(([key, record]) => ({ key, record }))
      .sort((a, b) => (b.record.updatedAt || 0) - (a.record.updatedAt || 0));
  
    render();
  }
  
  function render() {
    const q = (els.search.value || "").trim().toLowerCase();
  
    const filtered = !q
  ? allEntries
  : allEntries.filter(({ record }) => {
      const title = (record.title || "").toLowerCase();
      const status = (record.status || "").toLowerCase();
      const tags = (record.tags || []).join(" ").toLowerCase();
      const companies = (record.companies || []).join(" ").toLowerCase();
      const site = (record.site || "").toLowerCase();

      return (
        title.includes(q) ||
        tags.includes(q) ||
        companies.includes(q) ||
        status.includes(q) ||
        site.includes(q)
      );
    });

  
    els.list.innerHTML = filtered.map(renderCard).join("");
  
    if (filtered.length === 0) {
      els.list.innerHTML = `<div style="color: rgba(232,238,252,0.65); padding: 10px 6px;">No bookmarks found.</div>`;
    }
  }
//function renderCard({ key, record }) {
//  const site = (record.site || "unknown").toUpperCase();
//  const title = escapeHtml(record.title || "Untitled");
//  const status = record.status || "unknown";
//
//  const meta = buildMeta(record);
//
//  const tags = Array.isArray(record.tags) ? record.tags : [];
//  const tagsHtml = tags.length
//    ? tags.slice(0, 6).map(t =>
//        `<button type="button" class="tagchip" data-action="filterTag" data-tag="${escapeAttr(t)}">${escapeHtml(t)}</button>`
//      ).join("")
//    : `<span class="tagchip">Tags: —</span>`;
//
//  const companies = Array.isArray(record.companies) ? record.companies : [];
//  const companiesHtml = companies.length
//    ? companies.slice(0, 6).map(c =>
//        `<button type="button" class="tagchip companychip" data-action="filterCompany" data-company="${escapeAttr(c)}">${escapeHtml(c)}</button>`
//      ).join("")
//      + (companies.length > 6 ? `<span class="tagchip companychip">+${companies.length - 6}</span>` : "")
//    : "";
//
//  const dotColor = statusColor(status);
//
//  return `
//    <div class="card" data-key="${escapeAttr(key)}">
//      <div class="cardTop">
//        <div style="min-width:0;">
//          <h2 class="cardTitle">${title}</h2>
//          <div class="meta">
//            <span class="statusDot" style="background:${dotColor};"></span>
//            <span>${escapeHtml(prettyStatus(status))}</span>
//            <span> • </span>
//            <span>${escapeHtml(meta)}</span>
//          </div>
//
//          <div class="tagsRow">${tagsHtml}</div>
//          ${companiesHtml ? `<div class="tagsRow">${companiesHtml}</div>` : ""}
//        </div>
//
//        <div class="pills">
//          <span class="pill">${site}</span>
//          <button class="openBtn" data-action="open" title="Open">
//            ${externalLinkSvg()}
//          </button>
//        </div>
//      </div>
//
//      <div class="actions">
//        <button class="btn" data-action="edit">Edit</button>
//        <button class="btn danger" data-action="delete">Delete</button>
//      </div>
//    </div>
//  `;
//}
  
  
  function renderCard({ key, record }) {
    const siteLabel = (record.site || "unknown").toUpperCase();
    const title = escapeHtml(record.title || "Untitled");
    const status = record.status || "unknown";
  
    const meta = buildMeta(record);
  
    const tagsArr = Array.isArray(record.tags) ? record.tags : [];
    const tagsHtml = tagsArr.length
      ? tagsArr.slice(0, 6).map(t =>
          `<button type="button" class="tagchip" data-action="filterTag" data-tag="${escapeAttr(t)}">${escapeHtml(t)}</button>`
        ).join("")
      : `<span class="tagchip">Tags: —</span>`;
  
    const companiesArr = Array.isArray(record.companies) ? record.companies : [];
    const companiesHtml = companiesArr.length
      ? companiesArr.slice(0, 6).map(c =>
          `<button type="button" class="tagchip companychip" data-action="filterCompany" data-company="${escapeAttr(c)}">${escapeHtml(c)}</button>`
        ).join("") +
        (companiesArr.length > 6 ? `<span class="tagchip companychip">+${companiesArr.length - 6}</span>` : "")
      : "";
  
    const dotColor = statusColor(status);
  
    return `
      <div class="card" data-key="${escapeAttr(key)}">
        <div class="cardTop">
          <div style="min-width:0;">
            <h2 class="cardTitle">${title}</h2>
            <div class="meta">
              <span class="statusDot" style="background:${dotColor};"></span>
              <span>${escapeHtml(prettyStatus(status))}</span>
              <span> • </span>
              <span>${escapeHtml(meta)}</span>
            </div>
  
            <div class="tagsRow">${tagsHtml}</div>
            ${companiesHtml ? `<div class="tagsRow">${companiesHtml}</div>` : ""}
          </div>
  
          <div class="pills">
            <span class="pill">${siteLabel}</span>
            <button class="openBtn" data-action="open" title="Open">
              ${externalLinkSvg()}
            </button>
          </div>
        </div>
  
        <div class="actions">
          <button class="btn" data-action="edit">Edit</button>
          <button class="btn danger" data-action="delete">Delete</button>
        </div>
      </div>
    `;
  }
  
  
  function buildMeta(r) {
    if (r.site === "leetcode") {
      // difficulty might be null right now; we’ll fix scraping next
      return (r.difficulty || "unknown");
    }
    if (r.site === "codeforces") {
      const id = [r.contestId, r.index].filter(Boolean).join("");
      const rating = r.rating ? `${r.rating}` : "unknown";
      return id ? `${rating} • ${id}` : rating;
    }
    return "unknown";
  }
  
  function onListClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
  
    const card = e.target.closest(".card");
    if (!card) return;
  
    const key = card.getAttribute("data-key");
    const entry = allEntries.find(x => x.key === key);
    if (!entry) return;
  
    const action = btn.getAttribute("data-action");
    if (action === "filterTag") {
        const tag = btn.getAttribute("data-tag") || "";
        els.search.value = tag;
        render();
        return;
      }
      if (action === "filterCompany") {
        const c = btn.getAttribute("data-company") || "";
        els.search.value = c;
        render();
        return;
      }
      
  
    if (action === "open") {
      chrome.tabs.create({ url: entry.record.url });
      return;
    }
  
    if (action === "delete") {
      deleteBookmark(key);
      return;
    }
  
    if (action === "edit") {
      openEdit(key, entry.record);
      return;
    }
  }
  
  async function deleteBookmark(key) {
    const res = await store.get("bookmarks");
    const map = res.bookmarks || {};
    delete map[key];
    await store.set({ bookmarks: map });
    await refresh();
  }
  
  function openEdit(key, record) {
    editingKey = key;
  
    const st = normStatus(record.status || "unsolved");
    if (KNOWN_STATUSES.has(st)) {
      els.statusSelect.value = st;
      customField.classList.add("hidden");
      customInput.value = "";
    } else {
      els.statusSelect.value = "__custom__";
      customField.classList.remove("hidden");
      customInput.value = st || "";
    }
  
    els.tagsInput.value = (record.tags || []).join(", ");
  
    els.overlay.classList.remove("hidden");
    els.modal.classList.remove("hidden");
    const now = Date.now();
const at = record.remindAt;
if (typeof at === "number" && at > now) {
  const days = Math.round((at - now) / 86400000);
  els.remindSelect.value = ["1","3","7","14"].includes(String(days)) ? String(days) : "";
} else {
  els.remindSelect.value = "";
}

  }
  
  
  function closeEdit() {
    editingKey = null;
    els.overlay.classList.add("hidden");
    els.modal.classList.add("hidden");
  }
  
  async function saveEdit() {
    try {
      if (!editingKey) return;
  
      let status = els.statusSelect.value;
      if (status === "__custom__") {
        status = normStatus(customInput.value);
        if (!status) status = "unsolved";
      }
  
      const tags = els.tagsInput.value
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
  
      const remindDays = els.remindSelect.value;
      let remindAt = null;
      if (remindDays) remindAt = Date.now() + Number(remindDays) * 86400000;
  
      const res = await store.get("bookmarks");
      const map = res.bookmarks || {};
      const existing = map[editingKey];
      if (!existing) return closeEdit();
  
      map[editingKey] = {
        ...existing,
        status,
        tags,
        companies: Array.isArray(existing.companies) ? existing.companies : [],
        remindAt,
        updatedAt: Date.now(),
      };
  
      await store.set({ bookmarks: map });
      closeEdit();
      await refresh();
    } catch (err) {
      console.error("[edgecase] saveEdit failed:", err);
    }
  }
  
  
  
  
  function statusColor(s) {
    switch (s) {
      case "solved": return "rgba(122,255,195,0.9)";
      case "revise": return "rgba(79,140,255,0.95)";
      case "didnt-understand": return "rgba(255,93,93,0.95)";
      case "unsolved": return "rgba(232,238,252,0.55)";
      default: return "rgba(232,238,252,0.35)"; // custom/unknown
    }
  }
  
  
  function prettyStatus(s) {
    if (!s) return "unknown";
    if (s === "didnt-understand") return "Didn’t understand";
    if (s === "unsolved") return "Unsolved";
    if (s === "revise") return "Revise";
    if (s === "solved") return "Solved";
    // Custom: just title-case-ish
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  
  
  function externalLinkSvg() {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path d="M14 5h5v5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M10 14L19 5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M19 14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"
          stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
  }
  
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  function escapeAttr(s) {
    return escapeHtml(s).replaceAll("`", "&#096;");
  }
  