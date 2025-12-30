# edgecase extension 
### codeforces + leetcode bookmarks [chrome extension]

A lightweight chrome extension that lets you **bookmark LeetCode + Codeforces problems** directly from the problem page, then manage them in a clean popup UI with **status**, **tags**, **company chips**, and **reminders**.

## what it does

### bookmark problems : Codeforces + LeetCode
- works on:
  - `leetcode.com/problems/...`
  - `codeforces.com/problemset/problem/...` and `codeforces.com/contest/.../problem/...`
- saves:
  - title, url, site
  - LeetCode: slug + difficulty 
  - Codeforces: contestId/index + rating 

## features
- one click bookmark button on:
  - leetcode problem pages (`/problems/...`)
  - codeforces problem statements
-  tags (comma separated) + filtering
-  status tracking:
  - Unsolved / Revise / Solved / Didn’t understand
  - optional custom status
- company tags for LeetCode problems (offline mapping)
-  “Remind me in” (1/3/7/14 days) stored per bookmark
-  search across title / tags / companies / site / status
-  uses `chrome.storage.local` (no accounts, no backend)

### who is this for
- programmers doing LeetCode + Codeforces
- students preparing for interviews 
- people tired of scattered bookmarks / notion pages
### typical workflow
1. open a problem on leetcode or codeforces
2. click the blue ➕ bookmark icon
3. add tags / status / reminder
4. later, open the popup to filter by:
   - company
   - status (Revise / Unsolved / custom too!) 
   - tags


## how it works 
- `content.js` injects a small bookmark icon into leetcode/codeforces pages.
- when clicked, it scrapes problem metadata (title, difficulty/status/tags, rating, etc.) and stores a record in `chrome.storage.local`.
- `popup.html + popup.js` renders bookmarks and provides an edit modal to update tags/status/reminders.
- company data is loaded from a local `companies_map.json` built from a public dataset.
- source for companies dataset is public [ as per 2025 novemeber ](https://github.com/snehasishroy/leetcode-companywise-interview-questions)
  
### screenshot - the blue plus icon is for adding it to popup!
- <img width="200" height="300" alt="image" src="https://github.com/user-attachments/assets/d3d12b63-4f27-49de-96aa-d8091900f05b" />
- <img width="200" height="300" alt="image" src="https://github.com/user-attachments/assets/ada4c0cd-4c48-4441-8ff2-8b969d2fa70c" />
- <img width="200" height="300" alt="image" src="https://github.com/user-attachments/assets/a91335ca-6df4-45e3-94f6-f3ce1c780cf4" />



## install (local / dev)
1. clone this repo  
2. open chrome:
   - chrome: `chrome://extensions`
3. enable **developer mode**
4. click **load unpacked**
5. select the extension folder (the one containing `manifest.json`)



## how companies mapping works

this repo includes:
- `scripts/build_companies_map.mjs` it generates `companies_map.json`
- the extension reads `companies_map.json` at runtime, no API calls

### dataset used
company list comes from a public repo:
`snehasishroy/leetcode-companywise-interview-questions`

i don’t ship their repo data inside this project. i keep it locally and generate the json.


if you want to regenerate mapping locally:
1. clone dataset repo into `data/companywise/` (ignored by git)
2. run:
   - `node scripts/build_companies_map.mjs`
3. it generates:
   - `companies_map.json`

## privacy
- everything is stored locally in chrome (`chrome.storage.local`)
- no account, no tracking, no analytics
- no external api calls required for normal usage



## why i built this?
- i kept bookmarking in random places for leetcode and codeforces
- somedays in leetcode, somedays in a doc,sometimes notion and sometimes even a notebook.
- it came to a point where it became a mess!
-  when it came to revsion or keeping track, i had no clue what i had even solved or missed out on :(
- so i made this bookmark
- this is present in all problem pages of leetcode and codeforces
- and with one press it gets added in bookmarks
- along with tags and reminders
- and for leetcode it even presents company -> got through public dataset see more in credits
- so when preparing for interviews and test it filters out easily and i don't need to search or make new roadmaps daily!

  
## project structure
```
Starter Files/
  content.js        # injects bookmark icon + scraping
  popup.html        # ui
  popup.js          # list/search/edit/save logic
  popup.css         # styling
  manifest.json
scripts/
  build_companies_map.mjs
companies_map.json  # generated
```
---
### limitations / known edgecases 
- leetcode is a spa, so the conentent script re-run mounts using ```MutationObserver```
- ui changes may change or break some selectors
- reminders currently stores timestamp, doesn't trigger OS notifications yet
  

### credits
- source for dataset : snehasishroy/leetcode-companywise-interview-questions
- not affiliated with dataset author. this project only uses it to build an offline companies map

--- 
### built by Manya Kalra [github](https://github.com/ziennaa)

