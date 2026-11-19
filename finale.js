// Heartbeat finale: one button that unlocks when evals are over.
// Self-contained: no imports, no dependencies. All styles are in finale.css (classes start with fin-).
//
//   mountFinale(container, { cfg, plan, pulls, commits, now })
//
// Optional: ctx.marks (a Map or plain object of task id -> date, the page's "Mark done" ticks).
// When it is not passed, the marks are read from the same localStorage key app.js uses, so the
// scores match the leaderboard this browser shows.

const DAY_MS = 86400000;
const LETTERS = ["A", "B", "C", "D"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SMALL = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

// ---------- small helpers ----------
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const parseYmd = (s) => { const [y, m, d] = String(s || "").split("-").map(Number); return new Date(y, m - 1, d); };
const valid = (d) => d instanceof Date && !Number.isNaN(d.getTime());
const dayLong = (d) => `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const dayShort = (d) => `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const clock = (d) => `${d.getHours() % 12 || 12}:${pad2(d.getMinutes())} ${d.getHours() < 12 ? "am" : "pm"}`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + "s"}`;
const word = (n) => (Number.isInteger(n) && n >= 0 && n < SMALL.length ? SMALL[n] : String(n));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
function span(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  if (s < 600) return s % 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${Math.floor(s / 60)} min`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) { const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return m ? `${h} h ${m} min` : `${h} h`; }
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
  return h ? `${plural(d, "day")} ${h} h` : plural(d, "day");
}
function countdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `in ${plural(d, "day")} ${h} h`;
  if (h) return `in ${h} h ${pad2(m)} min`;
  if (m) return `in ${m} min ${pad2(sec)} s`;
  return `in ${sec} s`;
}
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked: fine */ } },
};

// ---------- the unlock moment ----------
function unlockMoment(cfg) {
  const date = /^\d{4}-\d{1,2}-\d{1,2}$/.test(cfg.evalDate || "") ? cfg.evalDate : "2026-11-21";
  const time = /^\d{1,2}:\d{2}$/.test(cfg.evalDoneAfter || "") ? cfg.evalDoneAfter : "14:30";
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm);
}

// ---------- the numbers ----------
// Same rules as derive() in app.js: only activity at or after countFrom counts, a task is done when a
// merged PR names it (or it is marked done in this browser), and its points go to the PR's author.
const normId = (raw) => "KL-" + String(parseInt(raw, 10)).padStart(2, "0");
const taskIdsIn = (text) => [...String(text || "").matchAll(/\bKL[-_ ]?(\d{1,2})\b/gi)].map((m) => normId(m[1]));

function readMarks(ctx) {
  const given = ctx.marks;
  if (given instanceof Map) return given;
  if (given && typeof given === "object") return new Map(Object.entries(given));
  try { return new Map(Object.entries(JSON.parse(localStorage.getItem(`heartbeat-marks-v1:${ctx.cfg.repo}`)) || {})); } catch { return new Map(); }
}

function buildModel(ctx, unlockAt) {
  const cfg = ctx.cfg || {};
  const plan = Array.isArray(ctx.plan) ? ctx.plan : [];
  const allPulls = Array.isArray(ctx.pulls) ? ctx.pulls : [];
  const allCommits = Array.isArray(ctx.commits) ? ctx.commits : [];
  const team = (cfg.team || []).slice(0, 4).map((m, i) => ({
    i, letter: LETTERS[i], name: m.name || `Teammate ${LETTERS[i]}`,
    login: (m.github || "").trim().replace(/^@/, "").toLowerCase(),
  }));
  const byLogin = new Map(team.filter((m) => m.login).map((m) => [m.login, m]));
  const start = parseYmd(cfg.startDate);
  let windowStart = cfg.countFrom ? new Date(cfg.countFrom) : new Date(start.getTime() - 2 * DAY_MS);
  if (!valid(windowStart)) windowStart = new Date(0);

  const pulls = allPulls.filter((pr) => new Date(pr.createdAt) >= windowStart);
  const status = new Map();
  for (const pr of pulls) {
    if (pr.state === "closed" && !pr.merged) continue;
    for (const id of new Set([...taskIdsIn(pr.title), ...taskIdsIn(pr.ref)])) {
      const prev = status.get(id);
      if (pr.merged) { if (!prev || prev.s !== "done") status.set(id, { s: "done", pr }); }
      else if (!prev) status.set(id, { s: "review", pr });
    }
  }
  for (const [id, at] of readMarks(ctx)) {
    const prev = status.get(id);
    if (!prev || prev.s !== "done") status.set(id, { s: "done", manual: true, at });
  }
  const planById = new Map(plan.map((t) => [t.id, t]));
  const stats = team.map((m) => ({ m, merged: 0, open: 0, commits: 0, days: new Set(), commitDays: new Set(), taskPts: 0, tasks: 0, prPts: 0, prTasks: 0, events: [], mergedPulls: [] }));
  const statOf = (login) => { const m = byLogin.get(login); return m ? stats[m.i] : null; };
  const merges = [];
  for (const pr of pulls) {
    const s = statOf(pr.login);
    if (!s) continue;
    const opened = new Date(pr.createdAt);
    if (pr.merged) {
      s.merged++;
      const at = new Date(pr.mergedAt);
      if (valid(at)) { s.mergedPulls.push({ pr, opened, at }); merges.push({ pr, at, s }); }
    } else if (pr.state === "open") s.open++;
    s.days.add(ymd(opened));
    s.events.push({ t: opened, kind: "pr" });
  }
  for (const c of allCommits) {
    const t = new Date(c.date);
    if (!valid(t) || t < windowStart) continue;
    const s = statOf(c.login);
    if (s) { s.commits++; s.days.add(ymd(t)); s.commitDays.add(ymd(t)); s.events.push({ t, kind: "commit" }); }
  }
  for (const [id, st] of status) {
    const t = planById.get(id);
    if (!t || st.s !== "done") continue;
    const s = st.manual ? stats[t.who] : statOf(st.pr.login);
    if (s) { s.tasks++; s.taskPts += Number(t.pts) || 0; }
    if (s && !st.manual) { s.prTasks++; s.prPts += Number(t.pts) || 0; } // the awards only use what the repository shows
  }
  for (const s of stats) s.score = s.taskPts * 10 + s.merged * 5 + s.open * 2 + s.commits + s.days.size * 3;

  // --- whole-team totals ---
  const events = stats.flatMap((s) => s.events);
  const moments = [...events.map((e) => e.t), ...merges.map((x) => x.at)].sort((a, b) => a - b);
  const totals = {
    merged: stats.reduce((a, s) => a + s.merged, 0),
    commits: stats.reduce((a, s) => a + s.commits, 0),
    tasksDone: plan.filter((t) => status.get(t.id)?.s === "done").length,
    planTotal: plan.length,
    first: moments[0] || null,
    last: moments[moments.length - 1] || null,
    spanDays: moments.length ? Math.round((midnight(moments[moments.length - 1]) - midnight(moments[0])) / DAY_MS) + 1 : 0,
    busiest: null,
  };
  const perDay = new Map();
  for (const e of events) {
    const k = ymd(e.t);
    const row = perDay.get(k) || { date: midnight(e.t), prs: 0, commits: 0 };
    if (e.kind === "pr") row.prs++; else row.commits++;
    perDay.set(k, row);
  }
  for (const row of [...perDay.values()].sort((a, b) => a.date - b.date)) {
    if (!totals.busiest || row.prs + row.commits > totals.busiest.prs + totals.busiest.commits) totals.busiest = row;
  }

  // --- per-person extras for the awards ---
  for (const s of stats) {
    s.quick = null;
    for (const x of s.mergedPulls) {
      const ms = x.at - x.opened;
      if (ms >= 0 && (!s.quick || ms < s.quick.ms)) s.quick = { ms, pr: x.pr };
    }
    // nights: commits and PR opens between 10 pm and 5 am, local time
    const late = s.events.filter((e) => e.t.getHours() >= 22 || e.t.getHours() < 5);
    const depth = (t) => (t.getHours() * 60 + t.getMinutes() - 22 * 60 + 1440) % 1440;
    s.night = late.length >= 2 ? { count: late.length, latest: late.reduce((a, e) => (depth(e.t) > depth(a) ? e.t : a), late[0].t) } : null;
    // mornings: the earliest time of day, between 5 am and noon
    const early = s.events.filter((e) => e.t.getHours() >= 5 && e.t.getHours() < 12);
    const tod = (t) => t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds();
    s.early = early.length ? early.reduce((a, e) => (tod(e.t) < tod(a) ? e.t : a), early[0].t) : null;
    s.earlyTod = s.early ? tod(s.early) : null;
    // longest run of days in a row, and the biggest single day
    const dayStamps = [...new Set(s.events.map((e) => midnight(e.t).getTime()))].sort((a, b) => a - b);
    let run = 0, best = 0, prev = null;
    for (const d of dayStamps) { run = prev != null && Math.round((d - prev) / DAY_MS) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
    s.streak = best;
    const mine = new Map();
    for (const e of s.events) mine.set(ymd(e.t), (mine.get(ymd(e.t)) || 0) + 1);
    s.bigDay = null;
    for (const [k, n] of [...mine].sort()) if (!s.bigDay || n > s.bigDay.count) s.bigDay = { count: n, date: parseYmd(k) };
    s.weekend = s.events.filter((e) => e.t.getDay() === 0 || e.t.getDay() === 6).length;
    s.perCommit = s.commits > 0 && s.prPts > 0 ? s.prPts / s.commits : null;
    s.onTime = 0;
  }
  // tasks whose pull request was open on or before the task's planned day
  if (valid(start)) {
    for (const [id, st] of status) {
      const t = planById.get(id);
      if (!t || st.s !== "done" || st.manual || !Number.isFinite(Number(t.day))) continue;
      const s = statOf(st.pr.login);
      const due = new Date(start.getFullYear(), start.getMonth(), start.getDate() + Number(t.day)); // midnight after the planned day
      if (s && new Date(st.pr.createdAt) < due) s.onTime++;
    }
  }

  // the first and the last merge only count as such when no other merge shares the same moment
  const inOrder = merges.slice().sort((a, b) => a.at - b.at);
  const firstMerge = inOrder.length && (inOrder.length === 1 || inOrder[1].at - inOrder[0].at > 0) ? inOrder[0] : null;
  const beforeEnd = merges.filter((x) => x.at <= unlockAt).sort((a, b) => b.at - a.at);
  const lastMerge = beforeEnd.length && (beforeEnd.length === 1 || beforeEnd[0].at - beforeEnd[1].at > 0) ? beforeEnd[0] : null;

  // --- standings, sorted the way the page sorts them ---
  const ranked = stats.slice().sort((a, b) => b.score - a.score || b.taskPts - a.taskPts);
  ranked.forEach((s, k) => { s.rank = k > 0 && ranked[k - 1].score === s.score ? ranked[k - 1].rank : k + 1; });

  // for the note: which day of the plan the evals fall on, and whether the plan gives everyone the same points
  const evalDay = valid(start) ? Math.round((midnight(unlockAt) - start) / DAY_MS) + 1 : 0;
  const shares = team.map((m) => plan.filter((t) => t.who === m.i).reduce((a, t) => a + (Number(t.pts) || 0), 0));
  const evenShare = shares.length > 1 && shares[0] > 0 && shares.every((x) => x === shares[0]) ? shares[0] : 0;

  return { team, stats, totals, ranked, awards: pickAwards(stats, firstMerge, lastMerge), evalDay, evenShare };
}

// One award each: every award goes to one person only, a real "most" beats a shared one, and a shared one
// beats a person's own best number. All 4-way assignments are tried and the best total wins.
function pickAwards(stats, firstMerge, lastMerge) {
  const n = stats.length;
  const standing = (values, lowerWins) => values.map((v) => {
    if (v == null || (!lowerWins && v <= 0)) return null;
    const better = values.filter((o) => o != null && (lowerWins ? o < v : o > v)).length;
    const same = values.filter((o) => o === v).length;
    return { rank: better + 1, kind: better ? "own" : same > 1 ? "tied" : "top" };
  });
  const prs = (k) => plural(k, "pull request");
  const defs = [
    { id: "points", w: 14, own: true, values: stats.map((s) => s.prPts),
      title: "Most of the plan finished", line: (s) => `${plural(s.prPts, "plan point")} across ${plural(s.prTasks, "task")}`,
      ownTitle: (s) => `${plural(s.prPts, "plan point")} finished`, ownLine: (s) => [`across ${plural(s.prTasks, "task")}`, s.merged && `${prs(s.merged)} merged`].filter(Boolean).join(", ") },
    { id: "prs", w: 13, own: true, values: stats.map((s) => s.merged),
      title: "Most pull requests merged", line: (s) => `${prs(s.merged)} opened and merged`,
      ownTitle: (s) => `${prs(s.merged)} merged`, ownLine: (s) => (s.commits ? `and ${plural(s.commits, "commit")} on ${plural(s.commitDays.size, "day")}` : "") },
    { id: "commits", w: 12, own: true, values: stats.map((s) => s.commits),
      title: "Most commits", line: (s) => `${plural(s.commits, "commit")} across ${plural(s.commitDays.size, "day")}`,
      ownTitle: (s) => `${plural(s.commits, "commit")} across ${plural(s.commitDays.size, "day")}`, ownLine: (s) => (s.merged ? `and ${prs(s.merged)} merged` : "") },
    { id: "days", w: 11, own: true, values: stats.map((s) => s.days.size),
      title: "Most days active", line: (s) => `A commit or a pull request on ${plural(s.days.size, "separate day")}`,
      ownTitle: (s) => `Active on ${plural(s.days.size, "separate day")}`, ownLine: (s) => [s.commits && plural(s.commits, "commit"), s.merged && `${prs(s.merged)} merged`].filter(Boolean).join(" and ") },
    { id: "ontime", w: 10, values: stats.map((s) => (s.onTime >= 2 ? s.onTime : null)),
      title: "Most work handed in on schedule", line: (s) => `${s.onTime} tasks with the pull request open by the planned day` },
    { id: "lean", w: 9, values: stats.map((s) => s.perCommit),
      title: "Most done per commit", line: (s) => `${plural(s.prPts, "plan point")} from ${plural(s.commits, "commit")}` },
    { id: "streak", w: 8, values: stats.map((s) => (s.streak >= 2 ? s.streak : null)),
      title: "Longest streak", line: (s) => `${s.streak} days in a row with a commit or a pull request` },
    { id: "quick", w: 7, own: true, lowerWins: true, values: stats.map((s) => (s.quick ? s.quick.ms : null)),
      title: "Quickest pull request", line: (s) => `#${s.quick.pr.number} went from opened to merged in ${span(s.quick.ms)}`,
      ownTitle: (s) => `A pull request merged in ${span(s.quick.ms)}`, ownLine: (s) => `#${s.quick.pr.number}, from opened to merged` },
    { id: "bigday", w: 6, values: stats.map((s) => (s.bigDay && s.bigDay.count >= 2 ? s.bigDay.count : null)),
      title: "Biggest single day", line: (s) => `${s.bigDay.count} commits and pull requests on ${dayShort(s.bigDay.date)}` },
    { id: "weekend", w: 5, values: stats.map((s) => (s.weekend >= 2 ? s.weekend : null)),
      title: "Most weekend work", line: (s) => `${s.weekend} commits and pull requests on Saturday and Sunday` },
    { id: "first", w: 4, values: stats.map((s) => (firstMerge && firstMerge.s === s ? 1 : null)),
      title: "First pull request merged", line: () => `#${firstMerge.pr.number}, merged ${dayShort(firstMerge.at)} at ${clock(firstMerge.at)}` },
    { id: "last", w: 3, values: stats.map((s) => (lastMerge && lastMerge !== firstMerge && lastMerge.s === s ? 1 : null)),
      title: "Last pull request in before the finish", line: () => `#${lastMerge.pr.number}, merged ${dayShort(lastMerge.at)} at ${clock(lastMerge.at)}` },
    { id: "night", w: 2, values: stats.map((s) => (s.night ? s.night.count : null)),
      title: "Latest nights", line: (s) => `${s.night.count} commits and pull requests between 10 pm and 5 am, the latest at ${clock(s.night.latest)}` },
    { id: "early", w: 1, lowerWins: true, values: stats.map((s) => s.earlyTod),
      title: "Earliest start", line: (s) => `At it by ${clock(s.early)} on ${dayShort(s.early)}, earlier in the day than anyone else` },
  ];
  // options[person] = every award that would be true for them, with how good a fit it is
  const options = stats.map(() => []);
  for (const def of defs) {
    const st = standing(def.values, def.lowerWins);
    st.forEach((x, i) => {
      if (!x) return;
      const s = stats[i];
      if (x.kind === "top") options[i].push({ id: def.id, fit: 1000 + def.w, title: def.title, line: def.line(s) });
      else if (x.kind === "tied" && def.id !== "early") options[i].push({ id: def.id, fit: 700 + def.w, title: "Joint " + def.title.charAt(0).toLowerCase() + def.title.slice(1), line: def.line(s) });
      else if (x.kind === "own" && def.own) options[i].push({ id: def.id, fit: 300 - 60 * (x.rank - 1) + def.w, title: def.ownTitle(s), line: def.ownLine(s) });
    });
  }
  let best = null;
  const used = new Set(), picked = new Array(n).fill(null);
  (function go(i, total) {
    if (i === n) { if (!best || total > best.total) best = { total, picked: picked.slice() }; return; }
    for (const o of options[i]) {
      if (used.has(o.id)) continue;
      used.add(o.id); picked[i] = o;
      go(i + 1, total + o.fit);
      used.delete(o.id); picked[i] = null;
    }
    go(i + 1, total); // nothing true to say about this person: leave them out rather than make something up
  })(0, 0);
  return stats.map((s, i) => (best && best.picked[i] ? { m: s.m, title: best.picked[i].title, line: best.picked[i].line, id: best.picked[i].id } : null)).filter(Boolean);
}

// ---------- pieces shared by the slides ----------
function avatar(m) {
  const box = el("div", { class: "fin-avatar", "aria-hidden": "true" }, m.letter);
  if (m.login && !/^teammate-/.test(m.login)) {
    const img = el("img", { src: `https://github.com/${encodeURIComponent(m.login)}.png?size=96`, alt: "", width: 48, height: 48 });
    img.addEventListener("error", () => img.remove());
    box.textContent = ""; box.append(img);
  }
  return box;
}
// A number that counts up when its slide appears. Screen readers get the final value straight away.
const num = (value) => el("span", { class: "fin-count" },
  el("span", { class: "fin-count-live", "aria-hidden": "true", "data-fin-to": String(value), text: String(value) }),
  el("span", { class: "fin-sr", text: String(value) }));

function namesList(names) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// ---------- the slides ----------
function buildSlides(model, api) {
  const { team, totals, awards, ranked, evalDay, evenShare } = model;
  const slides = [];
  const kicker = (text) => el("p", { class: "fin-kicker", text });

  // 1. opening
  slides.push({ name: "opening", burst: true, build: (hid) => el("div", { class: "fin-slide fin-slide-open" },
    kicker("Kreg Lite"),
    el("h2", { class: "fin-h1", id: hid, text: "You made it through evals." }),
    el("p", { class: "fin-lede", text: "Kreg Lite is built and presented. Before you close the laptop, here is a short look back at how you got here, put together by Claude." })) });

  // 2. the project in numbers
  if (totals.first) {
    slides.push({ name: "numbers", build: (hid) => {
      const stat = (value, label, extra) => el("div", { class: "fin-stat" }, el("div", { class: "fin-num" }, num(value), extra || null), el("div", { class: "fin-label", text: label }));
      const b = totals.busiest;
      const busy = b && [b.prs && `${plural(b.prs, "pull request")} opened`, b.commits && plural(b.commits, "commit")].filter(Boolean).join(" and ");
      return el("div", { class: "fin-slide" },
        kicker("The whole team"),
        el("h2", { class: "fin-h2", id: hid, text: "The project in numbers" }),
        el("div", { class: "fin-stats" },
          stat(totals.merged, totals.merged === 1 ? "pull request merged" : "pull requests merged"),
          stat(totals.commits, totals.commits === 1 ? "commit" : "commits"),
          totals.planTotal ? stat(totals.tasksDone, "tasks finished", el("span", { class: "fin-of", text: ` of ${totals.planTotal}` })) : null,
          stat(totals.spanDays, totals.spanDays === 1 ? "day of work" : "days from start to finish")),
        el("p", { class: "fin-foot", text: totals.spanDays > 1 ? `From ${dayLong(totals.first)} to ${dayLong(totals.last)}.` : `All on ${dayLong(totals.first)}.` }),
        b && busy ? el("div", { class: "fin-callout" },
          el("div", { class: "fin-callout-label", text: "Busiest day" }),
          el("div", { class: "fin-callout-main", text: dayLong(b.date) }),
          el("div", { class: "fin-callout-sub", text: cap(busy) })) : null);
    } });
  }

  // 3. the people
  if (awards.length) {
    slides.push({ name: "people", build: (hid) => el("div", { class: "fin-slide" },
      kicker("The people"),
      el("h2", { class: "fin-h2", id: hid, text: "One award each" }),
      el("ul", { class: "fin-awards" }, awards.map((a) => el("li", { class: "fin-award" },
        avatar(a.m),
        el("div", { class: "fin-award-text" },
          el("div", { class: "fin-award-name", text: a.m.name }),
          el("div", { class: "fin-award-title", text: a.title }),
          a.line ? el("div", { class: "fin-award-line", text: cap(a.line) }) : null)))),
      el("p", { class: "fin-foot", text: "Every one of these is counted from the repository, nothing rounded up." })) });
  }

  // 4. final standings
  if (ranked.length && ranked[0].score > 0) {
    slides.push({ name: "standings", build: (hid) => {
      const order = ranked.length >= 3 ? [ranked[1], ranked[0], ...ranked.slice(2)] : ranked.slice();
      return el("div", { class: "fin-slide" },
        kicker("The leaderboard, one last time"),
        el("h2", { class: "fin-h2", id: hid, text: "Final standings" }),
        el("ol", { class: "fin-podium", style: `--fin-cols:${order.length}` }, order.map((s) => el("li", { class: `fin-place fin-place-${s.rank}`, "aria-label": `${s.rank}. ${s.m.name}, ${s.score}` },
          avatar(s.m),
          el("div", { class: "fin-place-name", text: s.m.name }),
          el("div", { class: "fin-place-score" }, num(s.score)),
          el("div", { class: "fin-step", "aria-hidden": "true" }, el("span", { text: String(s.rank) }))))),
        el("p", { class: "fin-foot", text: "Score = 10 × points of tasks merged + 5 × PRs merged + 2 × PRs open + 1 × commit + 3 × active day." }));
    } });
  }

  // 5. a note from Claude
  slides.push({ name: "note", build: (hid) => {
    const names = team.map((m) => m.name);
    const size = team.length;
    const everyone = size === 2 ? "both of you" : `the ${word(size)} of you`;
    const paras = [
      `On day one, Kreg Lite was a list of tasks on this page. ${evalDay > 1 ? `On day ${word(evalDay)}` : "Now"} it is an uptime monitor that checks its URLs every few seconds, opens an incident on the third failure in a row, and reports uptime straight from SQL.`,
      `You built it in Node, Express, Prisma and Postgres, put a React front end on it, and split the plan ${evenShare ? `evenly, ${evenShare} points each` : `between ${everyone}`}, so nobody carried it alone.`,
      `I only saw it from here, one pull request at a time. That was enough to see ${size > 1 ? `${word(size)} people` : "someone"} who kept turning up, for the project and for each other.`,
      `The evaluation is over and the work is still yours. Go and get some sleep.`,
    ];
    return el("div", { class: "fin-slide fin-slide-note" },
      kicker("A note from Claude"),
      el("div", { class: "fin-note" },
        el("h2", { class: "fin-note-to", id: hid, text: `${namesList(names)},` }),
        paras.map((t) => el("p", { text: t })),
        el("p", { class: "fin-note-sign", text: "Claude" })));
  } });

  // 6. close
  slides.push({ name: "close", build: (hid) => el("div", { class: "fin-slide fin-slide-open" },
    kicker("That is everything this page counted"),
    el("h2", { class: "fin-h1", id: hid, text: team.length > 2 ? `Well done, all ${word(team.length)} of you.` : "Well done." }),
    el("p", { class: "fin-lede", text: "It was good to keep count for you. Close this, then close the laptop." }),
    el("div", { class: "fin-actions" },
      el("button", { class: "fin-go fin-primary", type: "button", "data-fin-done": true, text: "Done", onclick: api.close }),
      api.canBurst() ? el("button", { class: "fin-go", type: "button", text: "Confetti again", onclick: api.burst }) : null)) });

  return slides;
}

// ---------- confetti: a small particle burst on a canvas ----------
function makeConfetti(canvas) {
  const g = canvas.getContext("2d");
  let parts = [], raf = 0, last = 0, w = 0, h = 0;
  function size() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function palette() {
    const css = getComputedStyle(canvas);
    const pick = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const done = pick("--done", "#16a34a");
    return [done, done, done, pick("--fg", "#111111"), pick("--review", "#b45309"), pick("--muted", "#6b6b6b")];
  }
  function burst() {
    if (!g) return;
    size();
    const colours = palette();
    const count = Math.round(Math.min(220, Math.max(90, w / 6)));
    const lift = Math.sqrt(2 * 1500 * h) * 1.45; // enough to reach the upper part of the screen
    for (let k = 0; k < count; k++) {
      const left = k % 2 === 0;
      const angle = (left ? -Math.PI / 2 + 0.38 : -Math.PI / 2 - 0.38) + (Math.random() - 0.5) * 0.75;
      const v = lift * (0.55 + Math.random() * 0.6);
      parts.push({
        x: left ? -10 : w + 10, y: h + 10,
        vx: Math.cos(angle) * v * Math.min(1, w / 1100), vy: Math.sin(angle) * v,
        s: 6 + Math.random() * 7, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 12,
        flip: Math.random() * Math.PI, vf: 4 + Math.random() * 8,
        round: Math.random() < 0.25, c: colours[Math.floor(Math.random() * colours.length)], age: 0,
      });
    }
    if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
  }
  function tick(ts) {
    const dt = last ? Math.min(0.034, (ts - last) / 1000) : 0.016;
    last = ts;
    g.clearRect(0, 0, w, h);
    const drag = Math.pow(0.42, dt);
    for (const p of parts) {
      p.age += dt;
      p.vx *= drag; p.vy = p.vy * drag + 1500 * dt * (p.vy > 0 ? 0.35 : 1); // falls slower than it rises, like paper
      p.x += p.vx * dt + Math.sin(p.age * 3 + p.flip) * 18 * dt; p.y += p.vy * dt;
      p.r += p.vr * dt; p.flip += p.vf * dt;
      g.save();
      g.globalAlpha = Math.max(0, Math.min(1, 5.5 - p.age));
      g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.cos(p.flip));
      g.fillStyle = p.c;
      if (p.round) { g.beginPath(); g.arc(0, 0, p.s / 2, 0, Math.PI * 2); g.fill(); }
      else g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      g.restore();
    }
    parts = parts.filter((p) => p.age < 5.5 && !(p.vy > 0 && p.y > h + 30));
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = 0; g.clearRect(0, 0, w, h); }
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; parts = []; if (g) g.clearRect(0, 0, w, h); }
  return { burst, stop, size: () => { if (raf) size(); }, running: () => !!raf };
}

// ---------- the overlay ----------
let open = null; // the one overlay that can be open: { close, container }
const mounts = new WeakMap(); // container -> { timer, button, ctx }

function openOverlay(container) {
  if (open) return;
  const rec = mounts.get(container);
  if (!rec) return;
  const model = buildModel(rec.ctx, rec.unlockAt);
  let index = 0, countRaf = 0, burstDone = false, confetti = null;

  const canvas = reducedMotion() ? null : el("canvas", { class: "fin-confetti", "aria-hidden": "true" });
  if (canvas) confetti = makeConfetti(canvas);
  const api = {
    close: () => close(),
    canBurst: () => !!confetti && !reducedMotion(),
    burst: () => { if (confetti && !reducedMotion()) confetti.burst(); },
  };
  const slides = buildSlides(model, api);

  const dots = el("div", { class: "fin-dots", "aria-hidden": "true" }, slides.map(() => el("i")));
  const where = el("span", { class: "fin-sr" });
  const closeBtn = el("button", { class: "fin-close", type: "button", text: "Close", onclick: () => close() });
  const stage = el("div", { class: "fin-stage", "aria-live": "polite" });
  const back = el("button", { class: "fin-go", type: "button", text: "Back", onclick: () => go(index - 1) });
  const next = el("button", { class: "fin-go fin-primary", type: "button", text: "Next", onclick: () => go(index + 1) });
  const root = el("div", { class: "fin-overlay", role: "dialog", "aria-modal": "true", "aria-labelledby": "fin-heading", tabindex: "-1" },
    el("div", { class: "fin-bar" }, el("div", { class: "fin-progress" }, dots, where), closeBtn),
    stage,
    el("div", { class: "fin-nav" }, back, next),
    canvas);

  function runCounts(scope) {
    cancelAnimationFrame(countRaf); countRaf = 0;
    if (reducedMotion()) return;
    const items = [...scope.querySelectorAll("[data-fin-to]")].map((node) => ({ node, to: Number(node.getAttribute("data-fin-to")) })).filter((x) => Number.isFinite(x.to) && x.to > 0);
    if (!items.length) return;
    for (const x of items) x.node.textContent = "0";
    let t0 = 0;
    const step = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min(1, (ts - t0) / 900), e = 1 - Math.pow(1 - p, 3);
      for (const x of items) x.node.textContent = String(Math.round(x.to * e));
      countRaf = p < 1 ? requestAnimationFrame(step) : 0;
    };
    countRaf = requestAnimationFrame(step);
  }

  function go(to) {
    if (to < 0 || to >= slides.length) return;
    index = to;
    const lastOne = index === slides.length - 1;
    const active = document.activeElement; // read before anything is hidden or replaced
    const node = slides[index].build("fin-heading");
    stage.replaceChildren(node);
    stage.scrollTop = 0;
    [...dots.children].forEach((d, k) => { d.className = k === index ? "is-on" : k < index ? "is-past" : ""; });
    where.textContent = `Part ${index + 1} of ${slides.length}`;
    back.disabled = index === 0;
    next.hidden = lastOne;
    // keep the keyboard somewhere sensible when the button it was on goes away
    if (!active || active === root || !root.contains(active) || active.disabled || active.hidden) {
      (lastOne ? node.querySelector("[data-fin-done]") : next).focus();
    }
    runCounts(node);
    if (slides[index].burst && !burstDone) { burstDone = true; api.burst(); }
  }

  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); return; }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); return; }
    if (e.key === "Tab") {
      const items = [...root.querySelectorAll("button, [href]")].filter((n) => !n.disabled && !n.hidden && n.offsetParent !== null);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1], at = document.activeElement;
      if (!root.contains(at) || at === root) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
      else if (e.shiftKey && at === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    }
  }
  const onFocusIn = (e) => { if (!root.contains(e.target)) (next.hidden ? closeBtn : next).focus(); };
  const onResize = () => { if (confetti) confetti.size(); };

  // everything else on the page is switched off while the overlay is up
  const silenced = [];
  function close() {
    if (!open || open.root !== root) return;
    open = null;
    cancelAnimationFrame(countRaf);
    if (confetti) confetti.stop();
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("focusin", onFocusIn, true);
    window.removeEventListener("resize", onResize);
    for (const n of silenced) n.removeAttribute("inert");
    document.documentElement.classList.remove("fin-open");
    root.remove();
    const now = mounts.get(container);
    const btn = now && now.button;
    if (btn && btn.isConnected) btn.focus();
  }

  for (const n of document.body.children) if (!n.hasAttribute("inert")) { n.setAttribute("inert", ""); silenced.push(n); }
  document.body.append(root);
  document.documentElement.classList.add("fin-open");
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("focusin", onFocusIn, true);
  window.addEventListener("resize", onResize);
  open = { root, close, container };
  go(0);
  next.focus();
}

// ---------- the button block ----------
export function mountFinale(container, ctx) {
  if (!container || !ctx || !ctx.cfg) return;
  const old = mounts.get(container);
  if (old) clearInterval(old.timer);

  const now = typeof ctx.now === "function" ? ctx.now : () => new Date();
  const unlockAt = unlockMoment(ctx.cfg);
  const openedKey = `heartbeat-finale-opened-v1:${ctx.cfg.repo || ""}`;
  const whenText = `${dayLong(unlockAt)}, ${clock(unlockAt)}`;
  const isOpenNow = () => now().getTime() >= unlockAt.getTime();

  const button = el("button", { class: "fin-btn", type: "button", text: "Evals done" });
  const when = el("span", { text: `Unlocks ${whenText}` });
  const left = el("span", { class: "fin-left", "aria-hidden": "true" });
  const line = el("p", { class: "fin-when" }, when, left);
  const rec = { timer: 0, button, ctx, unlockAt };
  mounts.set(container, rec);

  function paint() {
    const unlocked = isOpenNow();
    button.disabled = !unlocked;
    const label = unlocked && store.get(openedKey) ? "Open again" : "Evals done";
    if (button.textContent !== label) button.textContent = label;
    const whenLabel = unlocked ? `Unlocked ${whenText}` : `Unlocks ${whenText}`;
    if (when.textContent !== whenLabel) when.textContent = whenLabel;
    const leftLabel = unlocked ? "" : ` · ${countdown(unlockAt.getTime() - now().getTime())}`;
    if (left.textContent !== leftLabel) left.textContent = leftLabel;
    container.classList.toggle("fin-unlocked", unlocked);
    return unlocked;
  }

  button.addEventListener("click", () => {
    if (!isOpenNow()) { paint(); return; } // the disabled attribute can be removed by hand; the clock cannot
    store.set(openedKey, new Date().toISOString());
    openOverlay(container);
    paint();
  });

  container.replaceChildren(el("div", { class: "fin-block" }, button, line));
  if (!paint()) {
    rec.timer = setInterval(() => {
      if (mounts.get(container) !== rec || !container.contains(button)) { clearInterval(rec.timer); return; }
      if (paint()) clearInterval(rec.timer);
    }, 500);
  }
}
