# EdgeCase Extension

A lightweight Chrome/Edge extension that lets you **bookmark LeetCode + Codeforces problems** directly from the problem page, then manage them in a clean popup UI with **status**, **tags**, **company chips**, and **reminders**.

## Features
- One-click bookmark button on:
  - LeetCode problem pages (`/problems/...`)
  - Codeforces problem statements
-  Tags (comma separated) + quick tag filtering (click a chip)
-  Status tracking:
  - Unsolved / Revise / Solved / Didn’t understand
  - Optional custom status
- Company chips for LeetCode problems (offline mapping)
-  “Remind me in” (1/3/7/14 days) stored per bookmark
-  Search across title / tags / companies / site / status
-  Uses `chrome.storage.local` (no accounts, no backend)

## How it works (high level)
- `content.js` injects a small bookmark icon into LeetCode/Codeforces pages.
- When clicked, it scrapes problem metadata (title, difficulty/status/tags, rating, etc.) and stores a record in `chrome.storage.local`.
- `popup.html + popup.js` renders bookmarks and provides an edit modal to update tags/status/reminders.
- Company data is loaded from a local `companies_map.json` built from a public dataset.


