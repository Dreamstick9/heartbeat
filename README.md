# Heartbeat

The Kreg Lite team tracker. It shows today's date, which day of the 9-day plan it is, and each
person's tasks for the day, with an LLM prompt and the NST lecture to rewatch. It reads the repo's
pull requests and commits from GitHub to mark tasks done and rank the team.

The plan is 8 working days (Fri 13 Nov to Fri 20 Nov 2026) and then day 9, Sat 21 Nov, the eval
day, which has no tasks. All work is due by Friday. Days 1 to 7 give nobody more than 3 points a
day; Friday (day 8) breaks that on purpose, with the last build tasks, the freeze and the rehearsal
all on one day (4 to 6 points each). Everyone still totals 20 points.

A plain static site: no server, no database, no build step. Everything it keeps is in each
browser's localStorage.

```
index.html, app.js, styles.css   the page
config.js                        repo, start date, eval day, the four of you
plan.js                          the 42 tasks, on days 1 to 8
```

## Run it locally

```bash
python3 -m http.server 5178
```

Open http://localhost:5178. Others on your Wi-Fi can use `http://<your-ip>:5178`
(`ipconfig getifaddr en0` on a Mac). Add `?demo=6` to see it with made-up activity, as if it
were day 6 (`?demo=1` to `?demo=9`; 9 is the eval day).

## Host it

Any static host works.

- **Vercel**: `npx vercel --prod` in this folder (log in first with `npx vercel login`),
  or import the repo on vercel.com with framework preset **Other** and no build command.
- **GitHub Pages**: push these files, then Settings → Pages → Deploy from a branch.

## Where the GitHub data comes from

A GitHub Actions workflow (`.github/workflows/sync.yml`) runs `tools/sync.js` on a 10-minute
schedule and saves the repo's PRs and commits to `data.json`. The page reads that file, so opening
the page never uses GitHub's 60-requests-an-hour limit. GitHub often delays or skips scheduled runs,
so the file can be hours old. Two ways to get fresh data:

- **Update now** (next to the leaderboard) reads GitHub directly for that browser only. It costs
  2 requests and then rests for a minute. The code is in `update.js`.
- To refresh the file for everyone: repo → Actions → Sync GitHub data → Run workflow.

If `data.json` is missing, the page falls back to calling GitHub directly.

## The "Evals done" button

`finale.js` and `finale.css`. The button unlocks at `evalDoneAfter` on `evalDate` (both in
`config.js`), by the viewer's own clock.

## What's stored where

- **PRs and commits** come from GitHub's public API, so everyone sees the same thing. Each browser
  keeps a copy for 10 minutes (`cacheMinutes` in `config.js`), because GitHub allows 60 requests an
  hour per network without a token. The repo has to be public.
- **Mark done** (for tasks with nothing to merge: testing, notes, rehearsal) is saved in that
  browser only. Each person ticks their own tasks; clearing site data removes the marks.

## How tasks get marked done

- Put the task ID in the PR title (`KL-07: register route`) or branch (`kl-07-register`).
  Open PR → in review. Merged PR → done, credited to the PR's author.
- Or press **Mark done** on the task, credited to the task's owner.

## Leaderboard score

`10 × points of tasks done + 5 × PRs merged + 2 × PRs open + 1 × commit + 3 × active day`.
GitHub can't see hours, so active days (days with a commit or PR) stand in for time spent.
Commits are counted on the default branch, so they show up once a PR is merged.

## Change things

- Start date, repo or names: `config.js`.
- The eval day: `evalDate` in `config.js` (a local date, `"2026-11-21"`). That day is labelled
  Evals in the day strip and shows "Evaluation day. No tasks." `evalDoneAfter` (`"14:30"`) is the
  local time on that day when the evals are over.
- Reset the leaderboard: set `countFrom` in `config.js` to the current UTC time. Activity before it is ignored.
- Tasks: `plan.js`. Each has `day` (1 to 8), `who` (0 to 3), `pts` (1 to 3), a one-line `goal`, numbered `steps`,
  `done` checks, the `pr` title (or `null` for tasks with nothing to merge) and `deps`.
  The last step (open the PR, or Mark done) is added automatically.
- Team rules and the API contract: `GUIDE` at the top of `plan.js`.
- After changing `app.js`, `config.js`, `plan.js`, `update.js`, `finale.js` or a `.css` file, bump the `?v=` number in
  `index.html` and `app.js` so browsers don't keep an old copy.
