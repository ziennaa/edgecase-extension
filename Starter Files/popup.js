const STORAGE_KEY = "bookmarks";
const OPEN_ICON = "assets/open.jpg"; // make sure this file exists

document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("search");
  search.addEventListener("input", () => render());

  render();
});

async function render() {
  const root = document.getElementById("bookmarks");
  root.innerHTML = "";

  const { bookmarks = {} } = await chrome.storage.local.get(STORAGE_KEY);
  const items = Object.values(bookmarks)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const q = (document.getElementById("search").value || "").trim().toLowerCase();
  const filtered = q
    ? items.filter((x) => matchesQuery(x, q))
    : items;

  if (filtered.length === 0) {
    root.innerHTML = `<div style="color: rgba(232,238,252,0.65); font-size: 12px;">No bookmarks yet.</div>`;
    return;
  }

  for (const item of filtered) {
    root.appendChild(makeCard(item));
  }
}

function matchesQuery(item, q) {
  const hay = [
    item.title,
    item.site,
    item.slug,
    item.contestId,
    item.index,
    ...(item.tags || []),
    item.difficulty,
    item.rating,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function makeCard(item) {
  const card = document.createElement("div");
  card.className = "card";

  const top = document.createElement("div");
  top.className = "row";

  // Title as "hyperlink" (but we open via chrome.tabs.create for reliability)
  const title = document.createElement("a");
  title.className = "title-link";
  title.href = "#";
  title.textContent = item.title || item.url || "Untitled";
  title.addEventListener("click", (e) => {
    e.preventDefault();
    openUrl(item.url);
  });

  const right = document.createElement("div");
  right.style.display = "flex";
  right.style.gap = "8px";
  right.style.alignItems = "center";

  const pill = document.createElement("div");
  pill.className = "pill";
  pill.textContent = (item.site || "site").toUpperCase();

  const openBtn = document.createElement("button");
  openBtn.className = "icon-btn";
  openBtn.title = "Open in new tab";
  openBtn.innerHTML = `<img src="${OPEN_ICON}" alt="Open" />`;
  openBtn.addEventListener("click", () => openUrl(item.url));

  right.appendChild(pill);
  right.appendChild(openBtn);

  top.appendChild(title);
  top.appendChild(right);

  // Meta line
  const meta = document.createElement("div");
  meta.className = "meta";

  // left meta: difficulty / rating
  if (item.site === "leetcode") {
    meta.textContent = item.difficulty ? item.difficulty : "unknown";
  } else if (item.site === "codeforces") {
    const left = item.rating ? `${item.rating}` : "unknown";
    const code = item.contestId && item.index ? `${item.contestId}${item.index}` : "";
    meta.textContent = code ? `${left} • ${code}` : left;
  } else {
    meta.textContent = "unknown";
  }

  // Tags
  const tags = document.createElement("div");
  tags.className = "tags";

  const tagArr = (item.tags || []);
  if (tagArr.length === 0) {
    const t = document.createElement("div");
    t.className = "tagchip";
    t.textContent = "Tags: —";
    tags.appendChild(t);
  } else {
    for (const tg of tagArr.slice(0, 6)) {
      const chip = document.createElement("div");
      chip.className = "tagchip";
      chip.textContent = tg;
      tags.appendChild(chip);
    }
    if (tagArr.length > 6) {
      const more = document.createElement("div");
      more.className = "tagchip";
      more.textContent = `+${tagArr.length - 6}`;
      tags.appendChild(more);
    }
  }

  // Actions (Edit/Delete kept for now; we’ll upgrade them in next issue)
  const actions = document.createElement("div");
  actions.className = "actions";

  const edit = document.createElement("button");
  edit.className = "btn";
  edit.textContent = "Edit";
  edit.addEventListener("click", () => {
    // placeholder for next step
    console.log("[edgecase] edit clicked:", item.key);
  });

  const del = document.createElement("button");
  del.className = "btn btn-danger";
  del.textContent = "Delete";
  del.addEventListener("click", async () => {
    await deleteBookmark(item.key);
    render();
  });

  actions.appendChild(edit);
  actions.appendChild(del);

  card.appendChild(top);
  card.appendChild(meta);
  card.appendChild(tags);
  card.appendChild(actions);

  return card;
}

function openUrl(url) {
  if (!url) return;
  chrome.tabs.create({ url });
  window.close(); // makes it feel like a real bookmark click
}

async function deleteBookmark(key) {
  const { bookmarks = {} } = await chrome.storage.local.get(STORAGE_KEY);
  delete bookmarks[key];
  await chrome.storage.local.set({ bookmarks });
}
