// Heartbeat: reads the browser's date, shows each person's tasks for the day, and tracks
// PRs and commits straight from GitHub. Everything it keeps (GitHub data, tasks marked done)
// lives in this browser's localStorage. Nothing here writes to GitHub.
import cfg from "./config.js?v=5";
import PLAN from "./plan.js?v=5";

(function () {
  "use strict";

  const DAYS = 10;
  const LETTERS = ["A", "B", "C", "D"];
  const DAY_MS = 86400000;
  const params = new URLSearchParams(location.search);

  // ---------- small helpers ----------
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return n;
  }
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked: fine */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const START = parseYmd(cfg.startDate);
  const dateOfDay = (n) => new Date(START.getTime() + (n - 1) * DAY_MS);
  const dayOf = (d) => Math.round((midnight(d) - START) / DAY_MS) + 1;
  const fmtLong = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtShort = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });
  const fmtDay = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
  const fmtTime = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
  function ago(date, now) {
    const s = Math.max(0, (now - date) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
  }
  const normId = (raw) => "KL-" + String(parseInt(raw, 10)).padStart(2, "0");
  const taskIdsIn = (text) => [...String(text || "").matchAll(/\bKL[-_ ]?(\d{1,2})\b/gi)].map((m) => normId(m[1]));

  // ---------- team ----------
  const team = cfg.team.slice(0, 4).map((m, i) => ({ ...m, i, letter: LETTERS[i], login: (m.github || "").trim().replace(/^@/, "").toLowerCase() }));
  const byLogin = new Map(team.filter((m) => m.login).map((m) => [m.login, m]));
  const repoSet = /^[\w.-]+\/[\w.-]+$/.test(cfg.repo || "") && !/^OWNER\//.test(cfg.repo);
  const idsSet = team.every((m) => m.login);

  // ---------- the clock ----------
  // ?demo or ?demo=6 shows made-up activity as if it were that day of the plan.
  const demoDay = params.has("demo") ? Math.min(DAYS, Math.max(1, parseInt(params.get("demo"), 10) || 6)) : 0;
  const realNow = new Date();
  const now = demoDay ? new Date(dateOfDay(demoDay).getTime() + 20 * 3600000) : realNow;
  const todayN = dayOf(now);
  const clampDay = (n) => Math.min(DAYS, Math.max(1, n));
  let selDay = clampDay(todayN);

  // ---------- data ----------
  // GitHub data is cached in localStorage for cacheMinutes; marks stay in localStorage for good.
  const CACHE_KEY = `heartbeat-cache-v2:${cfg.repo}`;
  const MARKS_KEY = `heartbeat-marks-v1:${cfg.repo}`;
  let gh = { status: "idle", mode: "local", pulls: [], commits: [], marks: new Map(), at: null, error: "" };
  const loadMarks = () => new Map(Object.entries(store.get(MARKS_KEY) || {}));
  const saveMarks = (marks) => store.set(MARKS_KEY, Object.fromEntries(marks));

  async function github(path) {
    const res = await fetch("https://api.github.com" + path, { headers: { Accept: "application/vnd.github+json" } });
    if (res.status === 409) return []; // empty repository
    if (!res.ok) {
      if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
        const reset = new Date(Number(res.headers.get("x-ratelimit-reset")) * 1000);
        throw new Error(`GitHub's hourly limit is used up. It resets at ${fmtTime.format(reset)}.`);
      }
      if (res.status === 404) throw new Error(`GitHub can't find ${cfg.repo}. Check the name in config.js.`);
      throw new Error(`GitHub answered ${res.status}.`);
    }
    return res.json();
  }
  async function pages(path, max = 5) {
    const out = [];
    for (let p = 1; p <= max; p++) {
      const batch = await github(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${p}`);
      out.push(...batch);
      if (batch.length < 100) break;
    }
    return out;
  }

  async function loadData(force) {
    if (demoDay) { gh = { status: "demo", mode: "demo", ...makeDemo(), marks: new Map(), at: now, error: "" }; return render(); }
    const marks = loadMarks();
    if (!repoSet) { gh = { ...gh, status: "unconfigured", marks }; return render(); }
    const cached = store.get(CACHE_KEY);
    if (!force && cached && Date.now() - cached.at < (cfg.cacheMinutes || 10) * 60000) {
      gh = { status: "ok", mode: "local", pulls: cached.pulls, commits: cached.commits, marks, at: new Date(cached.at), error: "" };
      return render();
    }
    gh = { ...gh, status: "loading", marks };
    render();
    try {
      const since = new Date(START.getTime() - 2 * DAY_MS).toISOString();
      const [pullsRaw, commitsRaw] = await Promise.all([
        pages(`/repos/${cfg.repo}/pulls?state=all&sort=created&direction=desc`),
        pages(`/repos/${cfg.repo}/commits?since=${encodeURIComponent(since)}`),
      ]);
      const pulls = pullsRaw.map((p) => ({
        number: p.number, title: p.title, url: p.html_url, ref: p.head && p.head.ref,
        login: (p.user && p.user.login || "").toLowerCase(), state: p.state,
        merged: !!p.merged_at, createdAt: p.created_at, mergedAt: p.merged_at,
      }));
      const commits = commitsRaw.map((c) => ({
        login: (c.author && c.author.login || "").toLowerCase(),
        date: c.commit && c.commit.author && c.commit.author.date,
      })).filter((c) => c.login && c.date);
      store.set(CACHE_KEY, { at: Date.now(), pulls, commits });
      gh = { status: "ok", mode: "local", pulls, commits, marks, at: new Date(), error: "" };
    } catch (e) {
      const stale = store.get(CACHE_KEY);
      gh = { status: "error", mode: "local", pulls: stale ? stale.pulls : [], commits: stale ? stale.commits : [], marks,
        at: stale ? new Date(stale.at) : null, error: e.message || "Couldn't reach GitHub." };
    }
    render();
  }

  function setMark(taskId, done) {
    const marks = loadMarks(); // re-read in case another tab changed it
    if (done) marks.set(taskId, new Date().toISOString()); else marks.delete(taskId);
    saveMarks(marks);
    gh.marks = marks;
    render();
  }

  // Made-up but stable activity for previewing the page before the repo exists.
  function makeDemo() {
    const rand = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
    const logins = team.map((m, i) => m.login || `teammate-${LETTERS[i].toLowerCase()}`);
    const pulls = [], commits = [];
    let num = 1;
    for (const t of PLAN) {
      if (t.day > demoDay) continue;
      const r = rand(t.id);
      const login = logins[t.who];
      const at = new Date(dateOfDay(t.day).getTime() + (11 + Math.floor(r * 9)) * 3600000);
      if (t.day < demoDay && r < 0.86) {
        pulls.push({ number: num++, title: `${t.id}: ${t.title.toLowerCase()}`, url: "#", ref: t.id.toLowerCase(), login, state: "closed", merged: true, createdAt: at.toISOString(), mergedAt: new Date(at.getTime() + 3 * 3600000).toISOString() });
        for (let k = 0; k < 1 + Math.floor(r * 4); k++) commits.push({ login, date: new Date(at.getTime() - k * 1800000).toISOString() });
      } else if (t.day === demoDay && r < 0.5) {
        pulls.push({ number: num++, title: `${t.id}: ${t.title.toLowerCase()}`, url: "#", ref: t.id.toLowerCase(), login, state: "open", merged: false, createdAt: at.toISOString(), mergedAt: null });
        commits.push({ login, date: at.toISOString() });
      }
    }
    if (!team.some((m) => m.login)) team.forEach((m, i) => { m.login = logins[i]; byLogin.set(m.login, m); });
    pulls.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { pulls, commits };
  }

  // ---------- derived state ----------
  function derive() {
    // Only PRs opened from two days before day 1 count, for tasks and for the leaderboard alike.
    const windowStart = new Date(START.getTime() - 2 * DAY_MS);
    const pulls = gh.pulls.filter((pr) => new Date(pr.createdAt) >= windowStart);
    const status = new Map(); // task id -> { s: "done" | "review", pr }
    for (const pr of pulls) {
      if (pr.state === "closed" && !pr.merged) continue;
      for (const id of new Set([...taskIdsIn(pr.title), ...taskIdsIn(pr.ref)])) {
        const prev = status.get(id);
        if (pr.merged) { if (!prev || prev.s !== "done") status.set(id, { s: "done", pr }); }
        else if (!prev) status.set(id, { s: "review", pr });
      }
    }
    for (const [id, at] of gh.marks) {
      const prev = status.get(id);
      if (!prev || prev.s !== "done") status.set(id, { s: "done", manual: true, at });
    }
    const planById = new Map(PLAN.map((t) => [t.id, t]));
    const stats = team.map((m) => ({ m, merged: 0, open: 0, commits: 0, days: new Set(), taskPts: 0, tasks: 0 }));
    const statOf = (login) => { const m = byLogin.get(login); return m ? stats[m.i] : null; };
    for (const pr of pulls) {
      const s = statOf(pr.login);
      if (!s) continue;
      if (pr.merged) s.merged++; else if (pr.state === "open") s.open++;
      s.days.add(ymd(new Date(pr.createdAt)));
    }
    for (const c of gh.commits) { const s = statOf(c.login); if (s) { s.commits++; s.days.add(ymd(new Date(c.date))); } }
    for (const [id, st] of status) {
      const t = planById.get(id);
      if (!t || st.s !== "done") continue;
      const s = st.manual ? stats[t.who] : statOf(st.pr.login); // a marked task counts for its owner
      if (s) { s.tasks++; s.taskPts += t.pts; }
    }
    for (const s of stats) s.score = s.taskPts * 10 + s.merged * 5 + s.open * 2 + s.commits + s.days.size * 3;
    return { status, stats };
  }

  function prompt(t) {
    const time = ["about an hour", "one to two hours", "two to three hours"][t.pts - 1];
    const deps = t.deps.map((d) => { const x = PLAN.find((p) => p.id === d); return x ? `${d} (${x.title})` : d; });
    return [
      `I'm a B.Tech CS student on a 4-person team building "Kreg Lite", an uptime monitor: Node.js + Express (MVC folders), Prisma ORM, PostgreSQL, JWT auth, and an optional React frontend. A scheduler checks each monitored URL every few seconds, saves every result, opens an incident after 3 failures in a row, and serves uptime stats with SQL.`,
      ``,
      `My task today (${t.id}): ${t.title}`,
      `What I need to do: ${t.todo}`,
      `It's done when: ${t.done}`,
      deps.length ? `It builds on work that's already merged: ${deps.join(", ")}.` : ``,
      ``,
      `Please:`,
      `1. Explain these concepts simply, with a tiny example for each: ${t.concepts}.`,
      `2. Tell me which files I'll create or change in an Express MVC project (routes, controllers, services, prisma) and what goes in each.`,
      `3. Give me a step-by-step plan I can finish in ${time}.`,
      `4. List the 3 mistakes students make most often on this.`,
      `Don't write the whole solution for me. When you're done, ask me 3 short questions to check I understood.`,
    ].filter((l, i, a) => !(l === `` && a[i - 1] === ``)).join("\n");
  }

  async function copy(text, btn) {
    const done = (msg) => { btn.textContent = msg; setTimeout(() => { btn.textContent = "Copy"; }, 1600); };
    try { await navigator.clipboard.writeText(text); done("Copied"); }
    catch {
      const pre = btn.closest("details").querySelector("pre");
      btn.closest("details").open = true;
      const r = document.createRange(); r.selectNodeContents(pre);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      done("Selected, press Ctrl+C");
    }
  }

  function avatar(m, size) {
    const box = el("div", { class: "avatar", "aria-hidden": "true" }, m.letter);
    if (m.login && !/^teammate-/.test(m.login)) {
      const img = el("img", { src: `https://github.com/${encodeURIComponent(m.login)}.png?size=${size * 2}`, alt: "", loading: "lazy", width: size, height: size });
      img.addEventListener("error", () => img.remove());
      box.textContent = ""; box.append(img);
    }
    return box;
  }
  const memberName = (m) => m.name || `Teammate ${m.letter}`;

  // ---------- render ----------
  function render() {
    const { status, stats } = derive();

    // header
    $("today-date").textContent = fmtLong.format(now);
    $("today-day").textContent = todayN < 1 ? `Starts in ${1 - todayN} day${1 - todayN === 1 ? "" : "s"}` : todayN > DAYS ? "Finished" : `Day ${todayN} of ${DAYS}`;
    const sync = $("sync");
    sync.className = "sync" + (gh.status === "error" ? " err" : "");
    sync.textContent = {
      idle: "", loading: "Syncing…", unconfigured: "Not connected",
      demo: "Demo data", ok: gh.at ? `Synced ${ago(gh.at, new Date())}` : "Synced",
      error: "Sync failed",
    }[gh.status];

    // banner
    const banner = $("banner"); banner.replaceChildren();
    if (gh.status === "demo") {
      banner.append(el("div", { class: "banner demo" },
        el("p", {}, el("strong", { text: `Demo data, as if it were day ${demoDay}. ` }), "None of these PRs are real."),
        el("p", {}, el("a", { href: location.pathname, text: "Back to real data" }))));
    } else if (!repoSet || !idsSet) {
      const missing = [!repoSet && "the repo name", !idsSet && "all four GitHub IDs"].filter(Boolean).join(" and ");
      banner.append(el("div", { class: "banner" },
        el("p", {}, el("strong", { text: "Tracking is off. " }), `Add ${missing} to config.js and reload. The daily tasks below already work.`),
        el("p", {}, el("a", { href: "?demo=6", text: "Preview with demo data" }))));
    } else if (gh.status === "error") {
      banner.append(el("div", { class: "banner" }, el("p", {}, el("strong", { text: "Couldn't update from GitHub. " }), gh.error, gh.at ? ` Showing data from ${ago(gh.at, new Date())}.` : "")));
    }

    // overall + day strip
    const doneAll = PLAN.filter((t) => status.get(t.id)?.s === "done").length;
    $("overall").replaceChildren(el("div", { class: "meter" }, el("i", { style: `width:${(doneAll / PLAN.length) * 100}%` })), `${doneAll} / ${PLAN.length} tasks done`);
    const days = $("days"); days.replaceChildren();
    for (let d = 1; d <= DAYS; d++) {
      const ts = PLAN.filter((t) => t.day === d);
      const dn = ts.filter((t) => status.get(t.id)?.s === "done").length;
      days.append(el("button", {
        class: "day" + (d === todayN ? " is-today" : "") + (d === selDay ? " is-sel" : ""), type: "button", role: "tab",
        "aria-selected": String(d === selDay), "aria-label": `Day ${d}, ${fmtShort.format(dateOfDay(d))}, ${dn} of ${ts.length} done`,
        onclick: () => { selDay = d; render(); },
      }, el("b", { text: `Day ${d}` }), el("span", { text: fmtDay.format(dateOfDay(d)) }), el("div", { class: "mini" }, el("i", { style: `width:${ts.length ? (dn / ts.length) * 100 : 0}%` }))));
    }

    // member cards
    $("work-h").textContent = selDay === todayN ? `Today · day ${selDay}` : `Day ${selDay} · ${fmtShort.format(dateOfDay(selDay))}`;
    $("to-today").disabled = selDay === clampDay(todayN);
    $("prev-day").disabled = selDay <= 1;
    $("next-day").disabled = selDay >= DAYS;
    const members = $("members"); members.replaceChildren();
    for (const m of team) {
      const ts = PLAN.filter((t) => t.day === selDay && t.who === m.i);
      const pts = ts.reduce((a, t) => a + t.pts, 0);
      const card = el("article", { class: "member", "aria-label": memberName(m) },
        el("div", { class: "member-head" }, avatar(m, 36),
          el("div", {}, el("div", { class: "member-name", text: memberName(m) }),
            el("div", { class: "member-gh", text: m.login && !/^teammate-/.test(m.login) ? `@${(m.github || m.login).trim().replace(/^@/, "")}` : "GitHub ID not set" })),
          el("div", { class: "member-load", text: `${pts} pt${pts === 1 ? "" : "s"}` })));
      if (!ts.length) card.append(el("p", { class: "empty", text: "Nothing today. Help a teammate." }));
      for (const t of ts) {
        const st = status.get(t.id);
        const statusEl = st && st.manual
          ? el("span", { class: "status done", title: `Marked done ${fmtShort.format(new Date(st.at))}`, text: "Done" })
          : st
          ? el("a", { class: "status " + st.s, href: st.pr.url, target: "_blank", rel: "noopener", text: st.s === "done" ? `Merged #${st.pr.number}` : `In review #${st.pr.number}` })
          : el("span", { class: "status", text: "To do" });
        const markBtn = gh.mode === "demo" ? null
          : st && st.manual ? el("button", { class: "mark", type: "button", text: "Undo", onclick: () => setMark(t.id, false) })
          : !st || st.s !== "done" ? el("button", { class: "mark", type: "button", text: "Mark done", onclick: () => setMark(t.id, true) })
          : null;
        const pr = prompt(t);
        const copyBtn = el("button", { class: "copy", type: "button", text: "Copy", onclick: (e) => { e.preventDefault(); copy(pr, copyBtn); } });
        card.append(el("div", { class: "task" },
          el("div", { class: "task-top" }, el("span", { class: "tid", text: t.id }), statusEl, markBtn,
            el("span", { class: "pts", text: `${t.pts} pt${t.pts === 1 ? "" : "s"}` })),
          el("div", { class: "task-title", text: t.title }),
          el("p", { class: "kv" }, el("b", { text: "Do" }), t.todo),
          el("p", { class: "kv muted" }, el("b", { text: "Done when" }), t.done),
          t.deps.length ? el("div", { class: "deps" }, "Needs", t.deps.map((d) => { const s = status.get(d); return el("span", { class: "dep " + (s ? s.s : ""), title: s ? (s.s === "done" ? "done" : "in review") : "not done yet", text: d }); })) : null,
          t.lectures.length ? el("div", { class: "lectures" }, el("b", { text: "Rewatch" }), t.lectures.map((l) => el("span", { text: l }))) : null,
          el("details", { class: "prompt" }, el("summary", {}, el("span", { text: "LLM prompt" }), copyBtn), el("pre", { text: pr }))));
      }
      members.append(card);
    }

    // leaderboard
    const ranked = stats.slice().sort((a, b) => b.score - a.score || b.taskPts - a.taskPts);
    const top = Math.max(1, ranked[0].score);
    const board = $("board"); board.replaceChildren();
    ranked.forEach((s, k) => {
      const own = PLAN.filter((t) => t.who === s.m.i && t.day <= clampDay(todayN)).length;
      board.append(el("li", { class: "row" + (k === 0 && s.score > 0 ? " first" : "") },
        el("span", { class: "rank", text: k + 1 }), avatar(s.m, 28),
        el("span", { class: "who", text: memberName(s.m) }),
        el("span", { class: "score", text: String(s.score) }),
        el("div", { class: "bar" }, el("i", { style: `width:${(s.score / top) * 100}%` })),
        el("div", { class: "facts" },
          el("span", {}, el("b", { text: s.tasks }), ` tasks done (${s.taskPts} pts)`),
          el("span", {}, el("b", { text: s.merged }), " PRs merged"),
          el("span", {}, el("b", { text: s.open }), " open"),
          el("span", {}, el("b", { text: s.commits }), " commits"),
          el("span", {}, el("b", { text: s.days.size }), " active days"),
          el("span", { class: "muted", text: `· ${own} due so far` }))));
    });

    // feed
    const feed = $("feed"); feed.replaceChildren();
    const recent = gh.pulls.slice(0, 12);
    if (!recent.length) feed.append(el("li", {}, el("span", {}), el("span", { class: "meta", text: gh.status === "loading" ? "Loading…" : "No pull requests yet." })));
    for (const pr of recent) {
      const m = byLogin.get(pr.login);
      const s = pr.merged ? "done" : pr.state === "open" ? "review" : "";
      feed.append(el("li", {},
        el("span", { class: "status st " + s, text: pr.merged ? "Merged" : pr.state === "open" ? "Open" : "Closed" }),
        el("a", { href: pr.url, target: "_blank", rel: "noopener", text: `#${pr.number} ${pr.title}` }),
        el("span", { class: "meta", text: `${m ? memberName(m) : "@" + pr.login} · ${ago(new Date(pr.mergedAt || pr.createdAt), now)}` })));
    }

    // full plan
    const table = $("plan"); table.replaceChildren();
    table.append(el("thead", {}, el("tr", {}, el("th", { text: "Day" }), team.map((m) => el("th", {}, `${m.letter} · ${memberName(m)}`)))));
    const tb = el("tbody");
    for (let d = 1; d <= DAYS; d++) {
      tb.append(el("tr", { class: d === todayN ? "is-today" : "" },
        el("td", { class: "dcell" }, `Day ${d}`, el("br"), fmtShort.format(dateOfDay(d))),
        team.map((m) => el("td", {}, PLAN.filter((t) => t.day === d && t.who === m.i).map((t) => {
          const s = status.get(t.id);
          return el("span", { class: "t " + (s ? s.s : "") }, el("i", { text: t.id }), `${t.title} (${t.pts})`);
        })))));
    }
    table.append(tb, el("tfoot", {}, el("tr", {}, el("td", { text: "Total" }), team.map((m) => el("td", { text: `${PLAN.filter((t) => t.who === m.i).reduce((a, t) => a + t.pts, 0)} pts` })))));
  }

  // ---------- wiring ----------
  $("prev-day").addEventListener("click", () => { selDay = clampDay(selDay - 1); render(); });
  $("next-day").addEventListener("click", () => { selDay = clampDay(selDay + 1); render(); });
  $("to-today").addEventListener("click", () => { selDay = clampDay(todayN); render(); });
  $("refresh").addEventListener("click", () => loadData(true));

  // keep several open tabs in step when one of them marks a task
  window.addEventListener("storage", (e) => { if (e.key === MARKS_KEY) { gh.marks = loadMarks(); render(); } });

  render();
  loadData(false);
})();
