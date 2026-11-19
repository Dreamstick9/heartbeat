// "Update now": gets the newest pull requests and commits straight from GitHub's public API,
// in the visitor's browser, in the same shape tools/sync.js writes to data.json.
// Nobody is signed in, so GitHub allows 60 requests an hour per network, and the whole team on
// one Wi-Fi shares them. One update costs 2 requests, and the button rests after every attempt.

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const LABEL = "Update now";
const LAST_KEY = "heartbeat-update-v1";

// ---------- fetching ----------
const fail = (kind, message, extra) => Object.assign(new Error(message), { kind }, extra);

async function github(path, fetchImpl) {
  let res;
  try {
    res = await fetchImpl("https://api.github.com" + path, { headers: { Accept: "application/vnd.github+json" } });
  } catch (cause) {
    throw fail("network", "Couldn't reach GitHub.", { cause });
  }
  if (res.status === 409) return []; // empty repository
  if (!res.ok) {
    if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
      const resetAt = new Date(Number(res.headers.get("x-ratelimit-reset")) * 1000);
      throw fail("rate", "GitHub's hourly limit is used up.", { status: res.status, resetAt });
    }
    throw fail("http", `GitHub answered ${res.status}.`, { status: res.status });
  }
  try {
    return await res.json();
  } catch (cause) {
    throw fail("network", "GitHub's answer was cut off.", { cause });
  }
}

async function pages(path, fetchImpl, max = 10) {
  const out = [];
  for (let p = 1; p <= max; p++) {
    const batch = await github(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${p}`, fetchImpl);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

export async function fetchLive(cfg, { now = () => new Date(), fetchImpl = fetch } = {}) {
  const start = new Date(cfg.startDate + "T00:00:00Z").getTime();
  const since = new Date(start - 2 * DAY_MS).toISOString();
  const [pullsRaw, commitsRaw] = await Promise.all([
    pages(`/repos/${cfg.repo}/pulls?state=all&sort=created&direction=desc`, fetchImpl),
    pages(`/repos/${cfg.repo}/commits?since=${encodeURIComponent(since)}`, fetchImpl),
  ]);
  // Keep these two in step with tools/sync.js: the page reads both sources the same way.
  const pulls = pullsRaw.map((p) => ({
    number: p.number, title: p.title, url: p.html_url, ref: p.head && p.head.ref,
    login: ((p.user && p.user.login) || "").toLowerCase(), state: p.state,
    merged: !!p.merged_at, createdAt: p.created_at, mergedAt: p.merged_at,
  }));
  const commits = commitsRaw
    .map((c) => ({ login: ((c.author && c.author.login) || "").toLowerCase(), date: c.commit && c.commit.author && c.commit.author.date }))
    .filter((c) => c.login && c.date);
  return { repo: cfg.repo, pulls, commits, at: now() };
}

// ---------- the button ----------
// One record per button. Mounting again (the page re-renders) reuses its click listener and its
// timer instead of stacking new ones, and an update that is still running is not lost.
const mounts = new WeakMap();
const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

// When the last attempt was, and until when GitHub said to wait (0 if it didn't). Saved so a
// reload can't skip the wait, and kept here too in case localStorage is blocked.
let last = { at: 0, resetAt: 0 };
function loadLast() {
  try {
    const v = JSON.parse(localStorage.getItem(LAST_KEY));
    const at = Number(v && v.at);
    if (at > last.at) last = { at, resetAt: Number(v.resetAt) || 0 };
  } catch { /* storage blocked: the copy above still works until a reload */ }
  return last;
}
function saveLast(v) {
  last = v;
  try { localStorage.setItem(LAST_KEY, JSON.stringify(v)); } catch { /* storage blocked: fine */ }
}

function setText(node, text) {
  if (node.textContent !== text) node.textContent = text;
}
// `brief` lines ("Updated just now", the limit notice) are cleared once the button is ready again.
function say(m, text, brief = false) {
  m.text = text;
  m.brief = brief;
  setText(m.statusEl, text);
}

function describe(err, cfg) {
  if (err.kind === "rate") return "GitHub's hourly limit is used up. Try again in a few minutes.";
  if (err.kind === "network") return "Couldn't reach GitHub. Check your connection and try again.";
  if (err.kind === "http" && err.status === 404) return `GitHub can't find ${cfg.repo}. Check the name in config.js.`;
  if (err.kind === "http") return `GitHub answered with an error (${err.status}). Wait a minute and try again.`;
  return "Something went wrong while updating. Reload the page and try again.";
}

// Sets the button's label and disabled state from the clock, and calls itself again while waiting.
function refresh(m) {
  clearTimeout(m.timer);
  const nowMs = Date.now();
  const saved = loadLast();
  const cooldown = (m.ctx.cooldownSeconds ?? 60) * 1000;
  // Times saved by a clock that has since been changed are ignored, so they can't lock the button.
  const at = saved.at > nowMs ? 0 : saved.at;
  const resetAt = saved.resetAt - nowMs > HOUR_MS ? 0 : saved.resetAt;
  const left = Math.max(at + cooldown, resetAt) - nowMs;
  const counting = !m.busy && left > 0 && left <= cooldown;

  m.button.disabled = m.busy || left > 0;
  setText(m.button, counting ? `${LABEL} (${Math.ceil(left / 1000)}s)` : LABEL);
  if (m.busy) return;
  if (resetAt > nowMs) {
    // Rounded up to the minute, so "try again at 4:15" is never a few seconds too early.
    const back = new Date(Math.ceil((nowMs + left) / 60000) * 60000);
    say(m, `GitHub's hourly limit is used up. Try again at ${fmtTime.format(back)}.`, true);
  }
  if (left > 0) m.timer = setTimeout(() => refresh(m), left % 1000 || 1000);
  else if (m.brief) say(m, "");
}

async function update(m) {
  refresh(m); // another tab may have updated a moment ago
  if (m.button.disabled) return;
  m.busy = true;
  refresh(m);
  say(m, "Updating…");
  let data, err;
  try {
    data = await fetchLive(m.ctx.cfg, { now: m.ctx.now, fetchImpl: m.ctx.fetchImpl });
  } catch (e) {
    err = e;
  }
  m.busy = false;
  // Saved before onData runs: the page may re-render and mount this button again from inside it.
  saveLast({ at: Date.now(), resetAt: (err && err.kind === "rate" && Number(err.resetAt)) || 0 });
  if (!err) {
    try { m.ctx.onData(data); } catch (e) { err = e; console.error(e); }
  }
  say(m, err ? describe(err, m.ctx.cfg) : "Updated just now", !err);
  refresh(m);
}

export function mountUpdate(button, statusEl, ctx) {
  let m = mounts.get(button);
  if (!m) {
    m = { button, busy: false, timer: 0, text: "", brief: false };
    mounts.set(button, m);
    button.addEventListener("click", () => update(m));
  }
  m.statusEl = statusEl;
  m.ctx = ctx;
  if (!statusEl.hasAttribute("role")) statusEl.setAttribute("role", "status");
  if (!statusEl.hasAttribute("aria-live")) statusEl.setAttribute("aria-live", "polite");
  if (m.text) setText(statusEl, m.text); // the page may have rebuilt the status line
  refresh(m);
}
