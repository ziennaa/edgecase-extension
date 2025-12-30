const bookmarksEl = document.getElementById("bookmarks");

const store = {
  get: (key) => new Promise((resolve) => chrome.storage.local.get(key, resolve)),
  set: (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve)),
};

init();

function init() {
  render();

  // Live update popup if bookmarks change (e.g., click icon on page)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (!changes.bookmarks) return;
    render();
  });
}

async function render() {
  const res = await store.get("bookmarks");
  const map = res.bookmarks || {};
  const items = Object.values(map);

  // Sort: newest first
  items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  bookmarksEl.innerHTML = "";

  if (items.length === 0) {
    bookmarksEl.innerHTML = `<div class="empty">No bookmarks yet. Click the icon on a problem page.</div>`;
    return;
  }

  for (const item of items) {
    bookmarksEl.appendChild(makeCard(item));
  }
}

function makeCard(item) {
  const card = document.createElement("div");
  card.className = "card";

  const titleRow = document.createElement("div");
  titleRow.className = "titleRow";

  const title = document.createElement("div");
  title.className = "cardTitle";
  title.textContent = item.title || item.url;

  const site = document.createElement("div");
  site.className = "badge";
  site.textContent = (item.site || "").toUpperCase();

  titleRow.appendChild(title);
  titleRow.appendChild(site);

  const meta = document.createElement("div");
  meta.className = "meta";

  // LeetCode: show difficulty/status; Codeforces: show contest/index if present
  const parts = [];
  if (item.difficulty) parts.push(item.difficulty);
  if (item.status) parts.push(item.status);
  if (item.contestId && item.index) parts.push(`${item.contestId}${item.index}`);

  meta.textContent = parts.join(" • ") || item.url;

  const tags = document.createElement("div");
  tags.className = "tags";
  tags.textContent = (item.tags && item.tags.length)
    ? `Tags: ${item.tags.join(", ")}`
    : "Tags: —";

  const actions = document.createElement("div");
  actions.className = "actions";

  const openBtn = document.createElement("button");
  openBtn.className = "btn";
  openBtn.textContent = "Open";
  openBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: item.url });
  });

  const editBtn = document.createElement("button");
  editBtn.className = "btn secondary";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", async () => {
    const currentTags = (item.tags || []).join(", ");
    const input = prompt("Enter tags (comma separated):", currentTags);
    if (input === null) return;

    const newTags = input
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    await updateBookmark(item.key, { tags: newTags });
  });

  const delBtn = document.createElement("button");
  delBtn.className = "btn danger";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", async () => {
    await deleteBookmark(item.key);
  });

  actions.appendChild(openBtn);
  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  card.appendChild(titleRow);
  card.appendChild(meta);
  card.appendChild(tags);
  card.appendChild(actions);

  return card;
}

async function updateBookmark(key, patch) {
  const res = await store.get("bookmarks");
  const map = res.bookmarks || {};
  if (!map[key]) return;

  map[key] = {
    ...map[key],
    ...patch,
    updatedAt: Date.now(),
  };

  await store.set({ bookmarks: map });
}

async function deleteBookmark(key) {
  const res = await store.get("bookmarks");
  const map = res.bookmarks || {};
  if (!map[key]) return;

  delete map[key];
  await store.set({ bookmarks: map });
}
