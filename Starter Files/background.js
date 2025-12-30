// background.js
// Author:
// Author URI: https://
// Author Github URI: https://www.github.com/
// Project Repository URI: https://github.com/
// Description: Handles all the browser level activities (e.g. tab management, etc.)
// License: MIT
// background.js (MV3 service worker)

const getLocal = (key) => new Promise((resolve) => chrome.storage.local.get(key, resolve));
const setLocal = (obj) => new Promise((resolve) => chrome.storage.local.set(obj, resolve));

async function resyncAlarmsFrom(bookmarks) {
  // clear old reminder alarms
  const alarms = await chrome.alarms.getAll();
  await Promise.all(
    alarms
      .filter((a) => a.name.startsWith("remind:"))
      .map((a) => chrome.alarms.clear(a.name))
  );

  const now = Date.now();
  for (const [key, rec] of Object.entries(bookmarks || {})) {
    const at = rec?.remindAt;
    if (typeof at === "number" && at > now) {
      chrome.alarms.create(`remind:${key}`, { when: at });
    }
  }
}

async function resyncFromStorage() {
  const res = await getLocal("bookmarks");
  await resyncAlarmsFrom(res.bookmarks || {});
}

// resync on install/startup
chrome.runtime.onInstalled.addListener(resyncFromStorage);
chrome.runtime.onStartup.addListener(resyncFromStorage);

// resync whenever bookmarks change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!changes.bookmarks) return;
  resyncAlarmsFrom(changes.bookmarks.newValue || {});
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("remind:")) return;

  const key = alarm.name.slice("remind:".length);
  const res = await getLocal("bookmarks");
  const map = res.bookmarks || {};
  const rec = map[key];
  if (!rec) return;

  const title = `Review: ${rec.title || "Problem"}`;
  const meta =
    rec.site === "leetcode"
      ? (rec.difficulty || "LeetCode")
      : rec.site === "codeforces"
        ? (rec.rating ? `CF ${rec.rating}` : "Codeforces")
        : "EdgeCase";

  chrome.notifications.create(`notif:${key}`, {
    type: "basic",
    iconUrl: "assets/bookmark.png",
    title,
    message: `${meta}`,
  });

  // one-shot reminder: clear remindAt so it doesn't fire again
  delete map[key].remindAt;
  await setLocal({ bookmarks: map });
});

chrome.notifications.onClicked.addListener(async (notifId) => {
  if (!notifId.startsWith("notif:")) return;
  const key = notifId.slice("notif:".length);

  const res = await getLocal("bookmarks");
  const rec = res.bookmarks?.[key];
  if (rec?.url) chrome.tabs.create({ url: rec.url });

  chrome.notifications.clear(notifId);
});
