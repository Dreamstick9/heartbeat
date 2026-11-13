# Heartbeat

The Kreg Lite team tracker. It shows today's date, which day of the 10-day plan it is, and each
person's tasks for the day, with an LLM prompt and the NST lecture to rewatch. It reads the repo's
pull requests and commits from GitHub to mark tasks done and rank the team.

A plain static site: no server, no database, no build step. Everything it keeps is in each
browser's localStorage.

```
index.html, app.js, styles.css   the page
config.js                        repo, start date, the four of you
plan.js                          the 42 tasks
```

## Run it locally

```bash
python3 -m http.server 5178
```

Open http://localhost:5178. Others on your Wi-Fi can use `http://<your-ip>:5178`
(`ipconfig getifaddr en0` on a Mac). Add `?demo=6` to see it with made-up activity.

## Host it

Any static host works.

- **Vercel**: `npx vercel --prod` in this folder (log in first with `npx vercel login`),
  or import the repo on vercel.com with framework preset **Other** and no build command.
- **GitHub Pages**: push these files, then Settings → Pages → Deploy from a branch.

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
- Reset the leaderboard: set `countFrom` in `config.js` to the current UTC time. Activity before it is ignored.
- Tasks: `plan.js`. Each has `day`, `who` (0 to 3), `pts` (1 to 3), a one-line `goal`, numbered `steps`,
  `done` checks, the `pr` title (or `null` for tasks with nothing to merge) and `deps`.
  The last step (open the PR, or Mark done) is added automatically.
- Team rules and the API contract: `GUIDE` at the top of `plan.js`.
- After changing `app.js`, `config.js`, `plan.js` or `styles.css`, bump the `?v=` number in
  `index.html` and `app.js` so browsers don't keep an old copy.
