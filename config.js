// Edit this file, then redeploy (or reload locally).
export default {
  // The team's Kreg Lite repository on GitHub, as "owner/name".
  repo: "Dreamstick9/Kreg_AP_2026",

  // Day 1 of the plan (YYYY-MM-DD, your local date). Work runs for 8 days, to Friday 20 Nov.
  startDate: "2026-11-13",

  // The evaluation day (YYYY-MM-DD, your local date). It is day 9 of the plan and has no tasks.
  evalDate: "2026-11-21",

  // When the evals are over on that day (HH:MM, 24-hour, your local time).
  evalDoneAfter: "12:00",

  // The four of you, in plan order: member 0 gets the "A" tasks in plan.js, member 1 "B", and so on.
  // `github` is the login only (no @). `name` is what the page shows.
  team: [
    { name: "Dreamstick", github: "dreamstick9" },
    { name: "Kabir", github: "kabirvashisht4-glitch" },
    { name: "Madhav", github: "Madhav-GPT" },
    { name: "Boomelio", github: "boomelio" },
  ],

  // The leaderboard only counts PRs and commits made after this moment (UTC). Move it to reset the scores.
  countFrom: "2026-11-13T14:00:00Z",

  // How long each browser reuses its saved copy of GitHub data (GitHub allows 60 requests an hour without a token).
  cacheMinutes: 10,
};
