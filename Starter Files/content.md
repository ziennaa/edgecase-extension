```
const ICON_ID = "add-bookmark-button";
```
we're giving unique id 
so we can check that if we have already added this icon or not
basically it avoids duplicates

```
const bookmarkImgURL = chrome.runtime.getURL("assets/bookmark.png");
```
so that it shows on the screen for user X

leetcode sites => spa => single page application
so basically when we click on a new problem
page doesn't reload
only parts of page change using js
so this doesn't happen
page reload → content script runs again
instead
same page → DOM changes → js replaces content

so if i had done it normal way
bookmark icon gets deleted when lc re runs/renders

```
boot(); 
```
simply start the script
```
mount();
```
add bookmark icon right now
what happens?
page loads
insert icon immediately

const obs = new MutationObserver(() => mount());
mutationobserver => tell me when page changes
lc => add elements => removes element => re render
so whenever any change happens call mount()

obs.observe(document.documentElement, { childList: true, subtree: true });
tells observer what to watch
when elements added
eatch for any dom changes

```
function mount() {
  if (document.getElementById(ICON_ID)) return;
```
if bookmark icon already on page then ignore
mutationobserver calls ```mount()``` many times
without this many icons can be added which no one wants

```
  if (location.hostname.includes("codeforces.com")) {
    mountOnCodeforces();
  } else if (location.hostname.includes("leetcode.com")) {
    mountOnLeetCode();
  }
}
```
for cf -> it detects cf site
and simillarly for lc
cuz cf -> stable dom
lc -> react spa

```
function makeIcon(){
  const img = document.createElement("img");
  img.style.width = "18px";
img.style.height = "18px";
img.style.marginLeft = "8px";
img.style.verticalAlign = "middle";
img.style.cursor = "pointer";
img.style.display = "inline-block";
img.addEventListener("click", () => {
  console.log("Bookmark clicked:", location.href);
});
img.addEventListener("error", () => {
  console.error("[edgecase] Icon failed to load:", bookmarkImgURL);
});

```

creates icon n styling
event listener
when user clicks => log the problem url => save to storage
error handling 
if  -> image path wrong => permission missing
immediately noticed in console

```
mountOnCodeforces()
```
```
function mountOnCodeforces() {
  const titleEl =
    document.querySelector(".problem-statement .header .title") ||
    document.querySelector(".problem-statement .title");
      if (!titleEl) return;
  titleEl.appendChild(makeIcon());
}

```
document.querySelector => selected problem statement title
append icon

```
mountOnLeetCode()
```
lc => react => no stable class names as dom changes frequently 
const statusEl = findTopBadge(["solved", "attempted"])
why -> solved / attempted badge -> always at top
found -> attach icon here
if this works
```
const titleEl = getLeetCodeTitle();

```
=> find lc title element
```
if (titleEl) {
  titleEl.appendChild(makeIcon());
  return;
}
```
if title found => done n return 
but if
```
const statusEl = findTopBadge(["Solved", "Attempted"]);
```
add here

```
getLeetCodeTitle()
```
find lc title
```
const cy = document.querySelector('[data-cy="question-title"]');

```
data-cy ? internal testing attribute used by lc
if container exist
=? prefer real heading or link inside
```
const slugMatch = location.pathname.match(/^\/problems\/([^/]+)/);
```
find the link that point to problem
```
const link = document.querySelector(
  `a[href^="/problems/${slug}/"]`
);
if (link)
  return link.querySelector("h1,h2,h3,h4,div,span") || link;
```