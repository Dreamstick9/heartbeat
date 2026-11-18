// Fetches the repo's pull requests and commits from GitHub and writes them to data.json,
// so the page can read one file instead of every browser calling the GitHub API.
// Run by .github/workflows/sync.yml; locally: GITHUB_TOKEN=$(gh auth token) node tools/sync.js
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import cfg from "../config.js";

const DAY_MS = 86400000;
const OUT = new URL("../data.json", import.meta.url);
const token = process.env.GITHUB_TOKEN;

async function api(path) {
  const res = await fetch("https://api.github.com" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "heartbeat-sync",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
  });
  if (res.status === 409) return []; // empty repository
  if (!res.ok) throw new Error(`GitHub answered ${res.status} for ${path}`);
  return res.json();
}

async function pages(path, max = 10) {
  const out = [];
  for (let p = 1; p <= max; p++) {
    const batch = await api(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${p}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

const start = new Date(cfg.startDate + "T00:00:00Z").getTime();
const since = new Date(start - 2 * DAY_MS).toISOString();
const [pullsRaw, commitsRaw] = await Promise.all([
  pages(`/repos/${cfg.repo}/pulls?state=all&sort=created&direction=desc`),
  pages(`/repos/${cfg.repo}/commits?since=${encodeURIComponent(since)}`),
]);

const pulls = pullsRaw.map((p) => ({
  number: p.number, title: p.title, url: p.html_url, ref: p.head && p.head.ref,
  login: ((p.user && p.user.login) || "").toLowerCase(), state: p.state,
  merged: !!p.merged_at, createdAt: p.created_at, mergedAt: p.merged_at,
}));
const commits = commitsRaw
  .map((c) => ({ login: ((c.author && c.author.login) || "").toLowerCase(), date: c.commit && c.commit.author && c.commit.author.date }))
  .filter((c) => c.login && c.date);

// Only rewrite the file when the data changed, so the workflow doesn't commit every run.
const body = { repo: cfg.repo, pulls, commits };
const old = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
const same = old && JSON.stringify({ repo: old.repo, pulls: old.pulls, commits: old.commits }) === JSON.stringify(body);
if (same) {
  console.log(`No changes (${pulls.length} PRs, ${commits.length} commits).`);
} else {
  writeFileSync(OUT, JSON.stringify({ syncedAt: new Date().toISOString(), ...body }, null, 1) + "\n");
  console.log(`Wrote data.json: ${pulls.length} PRs, ${commits.length} commits.`);
}
