// The 10-day Kreg Lite plan.
//
// Each task:
//   id, day, who      who = 0-3, the index into config.team
//   pts               effort: 1 = under an hour, 2 = one to two hours, 3 = two to three hours.
//                     Nobody gets more than 3 points on a day; everyone ends on 20.
//   title, goal       what it is, and what it achieves, in one line each
//   steps             exactly what to do, in order. Text in `backticks` shows as code.
//   done              checks that are all true when the task is finished
//   pr                the PR title (Heartbeat marks the task done when that PR is merged),
//                     or null for tasks with nothing to merge (use Mark done)
//   deps              tasks that must be merged first
//   concepts, lectures  what to read up on, and which NST lectures to rewatch

// NST lectures, as listed on the course pages (AP-C = backend, DE-C = DBMS).
const L = {
  apLoop: "AP-C · Aug 18 · Node.js Event Loop, libuv, Non-blocking I/O",
  apModules: "AP-C · Aug 20 · Node.js Module System, process, fs, path",
  apEvents: "AP-C · Aug 25 · EventEmitter, Event-Driven Programming, Observer Pattern",
  apHttp: "AP-C · Aug 27 · HTTP Protocol, HTTP Methods, HTTP Status Codes",
  apRouting: "AP-C · Sep 1 · Node.js HTTP Routing, Headers, Request Body",
  apExpress: "AP-C · Sep 3 & Sep 8 · Express JS, Request, Response, Route Parameters",
  apRouter: "AP-C · Sep 10 · Express Router, REST APIs, Resource-based URLs, API Versioning",
  apMvc: "AP-C · Sep 15 & Sep 17 · MVC Architecture, MVC in Express, Folder Structure",
  apDb: "AP-C · Sep 22 · Databases, Database Driver, Connection Pooling",
  apPrisma: "AP-C · Sep 24 · ORM, Prisma ORM, Prisma Schema, Prisma Models",
  apCrud: "AP-C · Sep 29 · Prisma CRUD, Advanced Prisma",
  apSeed: "AP-C · Oct 1 · Prisma Seeding, Relation Filtering, Relation Pagination",
  apRel: "AP-C · Oct 6, 8 & 22 · Prisma Database Relations",
  apAuth: "AP-C · Oct 27 · Authentication, Authentication Factors, Authentication Flow",
  apCookie: "AP-C · Oct 29 · Cookies, Session Based Authentication",
  apJwt: "AP-C · Nov 3 · Token Based Authentication, JWT, Authentication Middleware",
  deDdl: "DE-C · Aug 18 · Schema, Introduction to SQL, DDL, DML",
  deSelect: "DE-C · Aug 20 · SELECT, WHERE, LIKE, ORDER BY, LIMIT",
  deFunc: "DE-C · Aug 25 · SQL Functions: Date Functions, NULL Handling",
  deAgg: "DE-C · Aug 27 · Aggregate Functions, GROUP BY, HAVING",
  deWin: "DE-C · Sep 1 · SQL Window Functions",
  deSub: "DE-C · Sep 3 · SQL Subqueries, Correlated Subqueries",
  deJoin: "DE-C · Sep 8 · SQL Joins: INNER, LEFT, SELF, Multiple Joins",
  deEr: "DE-C · Sep 10 · DBMS Design, ER Models, ER Notations",
  deNorm: "DE-C · Sep 15 · DBMS Design, ER Models, Anomalies",
  deTx: "DE-C · Sep 17 & Sep 22 · DBMS Transactions, ACID Properties",
  deMvcc: "DE-C · Oct 1 · MVCC, Query Processing Pipeline",
  deIdx: "DE-C · Oct 6 · Execution Plan Reading, Indexing",
  deCte: "DE-C · Oct 8 · Query Optimization Basics, CTE",
};

// Rules every task follows. Shown on the page as the Team guide.
export const GUIDE = {
  setup: [
    "Repo: `https://github.com/Dreamstick9/Kreg_AP_2026`. Everyone forks it, works on their own fork, and sends pull requests back to it. (The repo owner works in the repo directly and skips the fork and `upstream` steps.)",
    "Install Node.js 18 or newer and PostgreSQL 16. Create the database once: `createdb kreg`.",
    "First time: on the repo's GitHub page press Fork. Then `git clone https://github.com/<your-username>/Kreg_AP_2026.git`, `cd Kreg_AP_2026`, `git remote add upstream https://github.com/Dreamstick9/Kreg_AP_2026.git`, `cp .env.example .env`, put your own Postgres user and password into `DATABASE_URL` in `.env`, then `npm install`.",
    "Every time before you start a task, get everyone's merged work: `git checkout main`, `git pull upstream main`, `git push origin main`, `npm install`, and (once Prisma exists) `npx prisma migrate dev`. Then make your task branch from this `main`.",
  ],
  workflow: [
    "One branch per task, made from an up-to-date `main`. Each task card shows its branch name, like `kl-07-register-route`: `git checkout -b kl-07-register-route`.",
    "Push the branch to your fork (`git push origin kl-07-register-route`). On GitHub, open a pull request from that branch into `Dreamstick9/Kreg_AP_2026` `main`, with the exact title shown on the card, like `KL-07: register route`. Heartbeat marks the task done when that PR is merged.",
    "Ask one teammate to review: they check it out with `gh pr checkout <PR number>` (or the commands GitHub shows on the PR), run it, tick the Done when list, and approve. Then the repo owner merges it with Squash and merge.",
    "Never commit to your fork's `main`; it only mirrors `upstream`. Never commit `.env` or `node_modules`.",
    "Changing `prisma/schema.prisma` affects everyone: say so in the group chat before you open that PR.",
    "Stuck for more than 30 minutes? Post in the group chat what you tried and the exact error.",
  ],
  conventions: [
    "Folders: `src/routes`, `src/controllers`, `src/services`, `src/middleware`, `src/config`, `src/jobs`, `src/events`, plus `prisma/`, `tools/`, `docs/`, `public/` and `client/` (React).",
    "File names: `<thing>.routes.js`, `<thing>.controller.js`, `<thing>.service.js`. Controllers read `req` and send `res`. Database work and logic go in services.",
    "Use the one Prisma client from `src/config/db.js`. Never write `new PrismaClient()` anywhere else.",
    "All API routes start with `/api/v1`. The API runs on port 3000, the fake target on 4000, the React app on 5173.",
    "Success: `{ \"data\": ... }`. Error: `{ \"error\": \"message\" }`.",
    "Status codes: 200 OK, 201 created, 204 deleted (no body), 400 bad input, 401 no token or bad token, 404 not found or not yours, 409 already exists, 500 server error.",
    "Logged-in requests send the header `Authorization: Bearer <token>`. The token is a JWT signed with `JWT_SECRET`, payload `{ id, email }`, valid for 7 days.",
    "Demo login after seeding: `demo@kreg.dev` / `demo1234`.",
  ],
  // method, path, needs token, built in, returns
  api: [
    ["GET", "/healthz", "no", "KL-01, KL-06", "`{ ok: true }`"],
    ["POST", "/api/v1/auth/register", "no", "KL-07", "201 `{ data: { token, user } }`"],
    ["POST", "/api/v1/auth/login", "no", "KL-10", "`{ data: { token, user } }`"],
    ["GET", "/api/v1/auth/me", "yes", "KL-10", "`{ data: user }`"],
    ["POST", "/api/v1/monitors", "yes", "KL-08", "201 `{ data: monitor }`"],
    ["GET", "/api/v1/monitors?page=1&limit=10", "yes", "KL-08, KL-15", "`{ data: [monitor], page, limit, total }`"],
    ["GET", "/api/v1/monitors/:id", "yes", "KL-13", "`{ data: monitor + openIncident }`"],
    ["PATCH", "/api/v1/monitors/:id", "yes", "KL-13", "`{ data: monitor }`"],
    ["DELETE", "/api/v1/monitors/:id", "yes", "KL-13", "204, no body"],
    ["GET", "/api/v1/monitors/:id/results?limit=50", "yes", "KL-20", "`{ data: [result] }`, newest first"],
    ["GET", "/api/v1/monitors/:id/incidents", "yes", "KL-19", "`{ data: [incident] }`, newest first"],
    ["POST", "/api/v1/monitors/:id/check", "yes", "KL-24", "`{ data: result }`"],
    ["GET", "/api/v1/monitors/:id/stats", "yes", "KL-16, KL-20, KL-25", "`{ data: { uptime24h, avgMs24h, totalChecks24h, daily, movingAvg } }`"],
    ["GET", "/api/v1/stats/overview", "yes", "KL-25, KL-27", "`{ data: { ranking, downtime, failingNow } }`"],
    ["GET", "/api/v1/status", "no", "KL-22", "`{ data: [{ id, name, status, uptime24h, avgMs24h }] }`"],
  ],
};

const PLAN = [
  // ---------------- Day 1 ----------------
  { id: "KL-01", day: 1, who: 0, pts: 2, title: "Set up the repo and the Express skeleton",
    goal: "Give everyone a project they can clone and run, so every other task has a place to go.",
    steps: [
      "You own the repo, so clone `Dreamstick9/Kreg_AP_2026` directly (no fork) and make the branch there.",
      "`npm init -y`, then `npm install express@4 dotenv cors morgan` and `npm install -D nodemon`.",
      "In `package.json` set `\"main\": \"src/server.js\"` and the scripts `\"dev\": \"nodemon src/server.js\"` and `\"start\": \"node src/server.js\"`.",
      "Create `src/app.js`: create the Express app, add `cors()`, `express.json()` and `morgan('dev')`, mount the health router at `/healthz`, and `module.exports = app`. Do not call `listen` in this file.",
      "Create `src/server.js`: `require('dotenv').config()`, require `./app`, call `app.listen(process.env.PORT || 3000)` and log `Kreg Lite running on http://localhost:3000`.",
      "Create `src/routes/health.routes.js` (an Express Router with `GET /`) and `src/controllers/health.controller.js` (a `getHealth` function that does `res.json({ ok: true })`).",
      "Create the empty folders `src/services`, `src/middleware`, `src/config`, `src/jobs`, `src/events`, each containing an empty file named `.gitkeep` (git doesn't save empty folders).",
      "Create `.env.example` with exactly three lines: `PORT=3000`, `DATABASE_URL=\"postgresql://USER:PASSWORD@localhost:5432/kreg\"`, `JWT_SECRET=\"change-me\"`.",
      "Create `.gitignore` with `node_modules/`, `.env` and `*.log`.",
      "Add a Setup section to `README.md` with the first-time commands from the Team guide.",
    ],
    done: [
      "On a fresh clone, `cp .env.example .env`, `npm install` and `npm run dev` start the server with no errors.",
      "`curl localhost:3000/healthz` prints `{\"ok\":true}`.",
      "`git status` after running shows no `node_modules` and no `.env`.",
      "The other three have forked the repo and added `upstream` (Team guide → Setup), so they can start their day 1 tasks.",
    ],
    pr: "KL-01: express skeleton",
    concepts: "Express app vs server, MVC folder structure, environment variables with dotenv, .gitignore",
    lectures: [L.apExpress, L.apMvc], deps: [] },

  { id: "KL-02", day: 1, who: 1, pts: 2, title: "Add Prisma, the shared client and the database schema",
    goal: "Create the four tables that everyone else's code reads and writes.",
    steps: [
      "Wait until KL-01 is merged (it's planned for the morning), then `git checkout main`, `git pull upstream main` and `git push origin main`.",
      "`npm install -D prisma@6` and `npm install @prisma/client@6`, then `npx prisma init`. Put your real Postgres login into `DATABASE_URL` in `.env` (not `.env.example`).",
      "In `prisma/schema.prisma` add `enum MonitorStatus { UP DOWN UNKNOWN }` and the four models below. Every field with a two-word name gets `@map(\"snake_case\")`, and every model gets `@@map(\"table_name\")`.",
      "`User` → `@@map(\"users\")`: `id Int @id @default(autoincrement())`, `name String`, `email String @unique`, `passwordHash String @map(\"password_hash\")`, `createdAt DateTime @default(now()) @map(\"created_at\")`, `monitors Monitor[]`.",
      "`Monitor` → `@@map(\"monitors\")`: `id` (as above), `userId Int`, `name String`, `url String`, `intervalSec Int @default(60)`, `isActive Boolean @default(true)`, `isPublic Boolean @default(false)`, `status MonitorStatus @default(UNKNOWN)`, `consecutiveFailures Int @default(0)`, `lastCheckedAt DateTime?`, `createdAt`; relation `user User @relation(fields: [userId], references: [id], onDelete: Cascade)`; `results CheckResult[]`, `incidents Incident[]`; `@@index([userId])`.",
      "`CheckResult` → `@@map(\"check_results\")`: `id`, `monitorId Int`, `isUp Boolean`, `statusCode Int?`, `responseTimeMs Int?`, `error String?`, `checkedAt DateTime @default(now())`; relation to `Monitor` with `onDelete: Cascade`; `@@index([monitorId, checkedAt])`.",
      "`Incident` → `@@map(\"incidents\")`: `id`, `monitorId Int`, `reason String`, `startedAt DateTime @default(now())`, `resolvedAt DateTime?`; relation to `Monitor` with `onDelete: Cascade`; `@@index([monitorId, startedAt])`.",
      "Run `npx prisma migrate dev --name init`.",
      "Create `src/config/db.js` with `const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); module.exports = prisma;`.",
      "Commit `prisma/schema.prisma`, the whole `prisma/migrations` folder and `src/config/db.js`.",
    ],
    done: [
      "On a teammate's machine, `npx prisma migrate dev` creates the tables `users`, `monitors`, `check_results` and `incidents` (`\\dt` in psql lists them).",
      "Columns are snake_case in psql, for example `password_hash`, `interval_sec`, `checked_at`.",
      "`npx prisma studio` opens and shows all four models.",
      "`.env` is not in the PR.",
    ],
    pr: "KL-02: prisma schema",
    concepts: "Prisma models and relations, @map/@@map, onDelete Cascade, migrations, composite indexes, one shared client (connection pooling)",
    lectures: [L.apPrisma, L.apRel, L.apDb, L.deDdl], deps: ["KL-01"] },

  { id: "KL-03", day: 1, who: 2, pts: 1, title: "Draw the ER diagram and write docs/api.md",
    goal: "One document everyone builds the API from, so routes and responses match.",
    steps: [
      "Draw the four tables from KL-02 (`users`, `monitors`, `check_results`, `incidents`) with every column and its type, the primary keys, the foreign keys, and three one-to-many lines: user → monitors, monitor → check_results, monitor → incidents. Use dbdiagram.io or draw.io.",
      "Export it as `docs/er-diagram.png`.",
      "Create `docs/api.md` with one section per row of the API contract in the Team guide. Each section has: method and path, whether a token is needed, an example request body (if it has one), an example success response, and the error status codes it can return.",
      "Every response example uses the format from the Team guide: `{ \"data\": ... }` for success and `{ \"error\": \"...\" }` for errors.",
    ],
    done: [
      "`docs/er-diagram.png` shows 4 tables, every column from KL-02, and 3 relationship lines.",
      "`docs/api.md` has all 15 endpoints from the API contract, each with a request (if any) and a response example.",
    ],
    pr: "KL-03: er diagram and api doc",
    concepts: "ER diagrams, primary and foreign keys, one-to-many relationships, REST resource naming",
    lectures: [L.deEr, L.apRouter], deps: [] },

  { id: "KL-04", day: 1, who: 2, pts: 1, title: "Build the fake target server",
    goal: "A website you can switch between up and down, for testing and for the demo.",
    steps: [
      "After KL-01 is merged: `git checkout main`, `git pull upstream main`, `git push origin main`.",
      "Create `tools/fake-target.js`: a separate Express app that listens on port 4000 and has `let healthy = true` at the top.",
      "`GET /ok` → status 200, body `ok`.",
      "`GET /slow` → wait 3000 ms with `setTimeout`, then 200, body `slow`.",
      "`GET /flaky` → 200 `fine` when `healthy` is true, 503 `down` when it's false.",
      "`POST /toggle` → flip `healthy` and respond `{ \"healthy\": true }` or `{ \"healthy\": false }`.",
      "Add the script `\"fake\": \"node tools/fake-target.js\"` to `package.json`.",
    ],
    done: [
      "`npm run fake` starts it and logs port 4000.",
      "`curl -i localhost:4000/flaky` shows 200; after `curl -X POST localhost:4000/toggle` it shows 503; toggling again brings back 200.",
      "`curl localhost:4000/slow` takes about 3 seconds.",
    ],
    pr: "KL-04: fake target",
    concepts: "Express routes, HTTP status codes, module-level state, setTimeout",
    lectures: [L.apExpress, L.apHttp], deps: ["KL-01"] },

  { id: "KL-05", day: 1, who: 3, pts: 2, title: "Write SQL queries 1 and 2 in psql",
    goal: "Have the two uptime queries working before the API needs them.",
    steps: [
      "In psql: `CREATE DATABASE kreg_scratch;` then `\\c kreg_scratch`. (This scratch database is only for you; the real tables come from KL-02.)",
      "Create two tables by hand that match KL-02: `monitors(id SERIAL PRIMARY KEY, user_id INT, name TEXT, is_public BOOLEAN, status TEXT)` and `check_results(id SERIAL PRIMARY KEY, monitor_id INT REFERENCES monitors(id), is_up BOOLEAN, status_code INT, response_time_ms INT, checked_at TIMESTAMP)`.",
      "Insert 3 monitors with `user_id = 1`, and about 30 rows in check_results spread over the last 3 days, some with `is_up = false`. Give one monitor no checks at all.",
      "Query 1, uptime in the last 24 hours. One row per monitor of user `$1` with the columns `id`, `name`, `total_checks`, `uptime_pct` (percent of checks with `is_up`, 2 decimals) and `avg_ms` (average `response_time_ms`, rounded). Only checks from the last 24 hours count. A monitor with no checks must still appear, with `total_checks` 0 and `uptime_pct` NULL: use LEFT JOIN and NULLIF. Sort by `uptime_pct` ascending, NULLs last.",
      "Query 2, uptime per day. For monitor `$1`, one row per day for the last 7 days with the columns `day` (a date), `checks` and `uptime_pct`, oldest day first.",
      "Save both in `docs/queries.sql`, each with a comment above it saying what it returns. Keep `$1` where the id goes.",
    ],
    done: [
      "Query 1 returns one row per monitor, including the one with no checks (0 checks, NULL uptime).",
      "For a monitor with 10 checks of which 8 are up, `uptime_pct` is `80.00`.",
      "Query 2 returns at most 7 rows, oldest first.",
      "`docs/queries.sql` is in the PR.",
    ],
    pr: "KL-05: uptime queries",
    concepts: "LEFT JOIN, GROUP BY, CASE inside SUM, NULLIF, date intervals, DATE()",
    lectures: [L.deAgg, L.deJoin, L.deFunc], deps: [] },

  // ---------------- Day 2 ----------------
  { id: "KL-06", day: 2, who: 0, pts: 2, title: "Seed script and a database health check",
    goal: "Demo data anyone can load with one command, and a health check that notices when the database is down.",
    steps: [
      "`npm install bcryptjs` if it isn't installed yet.",
      "Create `prisma/seed.js`. Use `upsert` on email to create the user `demo@kreg.dev`, name `Demo`, with the password `demo1234` hashed by `bcrypt.hash('demo1234', 10)`.",
      "In the same script, delete that user's monitors, then create these 5 for them: `Fake OK` (`http://localhost:4000/ok`, interval 10, public), `Fake Slow` (`http://localhost:4000/slow`, 30, public), `Fake Flaky` (`http://localhost:4000/flaky`, 10, public), `Example` (`https://example.com`, 60, public), `Private OK` (`http://localhost:4000/ok`, 60, not public).",
      "In `package.json` add `\"prisma\": { \"seed\": \"node prisma/seed.js\" }`.",
      "Change `getHealth` in `health.controller.js` to ask the database `SELECT 1` with `prisma.$queryRaw` (from `src/config/db.js`). Respond `{ ok: true }` if it works, and status 500 `{ ok: false }` if it throws.",
    ],
    done: [
      "`npx prisma db seed` runs without errors, twice in a row.",
      "After running it twice, Prisma Studio shows 1 demo user and exactly 5 monitors.",
      "`/healthz` returns `{\"ok\":true}` while Postgres runs, and 500 `{\"ok\":false}` when you stop Postgres.",
    ],
    pr: "KL-06: seed and db health check",
    concepts: "Prisma seeding, upsert, bcrypt hashing, $queryRaw",
    lectures: [L.apSeed, L.apDb], deps: ["KL-02"] },

  { id: "KL-07", day: 2, who: 1, pts: 2, title: "POST /api/v1/auth/register",
    goal: "New users can sign up and get a login token.",
    steps: [
      "`npm install bcryptjs jsonwebtoken` if they aren't installed yet.",
      "Create `src/routes/auth.routes.js`, `src/controllers/auth.controller.js` and `src/services/auth.service.js`. Mount the router in `app.js` with `app.use('/api/v1/auth', authRoutes)`.",
      "Route `POST /register`, body `{ name, email, password }`. Return 400 `{ error }` if any field is missing, if `email` has no `@`, or if `password` is shorter than 6 characters.",
      "If a user with that email already exists, return 409 `{ error: \"Email already registered\" }`.",
      "Hash the password with `bcrypt.hash(password, 10)` and create the user with `passwordHash`.",
      "Make the token with `jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })`.",
      "Respond 201 `{ data: { token, user: { id, name, email } } }`. Never send `passwordHash` back.",
    ],
    done: [
      "Registering a new email in Postman returns 201 with a token and no `passwordHash`.",
      "Registering the same email again returns 409.",
      "A missing field, an email without `@`, or a 3-character password each return 400 with a message.",
      "In Prisma Studio, `password_hash` starts with `$2`, not the plain password.",
    ],
    pr: "KL-07: register route",
    concepts: "Password hashing with bcrypt, JWT signing, HTTP 201, 400 and 409",
    lectures: [L.apAuth, L.apJwt], deps: ["KL-02"] },

  { id: "KL-08", day: 2, who: 2, pts: 2, title: "POST and GET /api/v1/monitors",
    goal: "A logged-in user can add a monitor and see their own monitors.",
    steps: [
      "Create `src/routes/monitor.routes.js`, `src/controllers/monitor.controller.js` and `src/services/monitor.service.js`. Mount with `app.use('/api/v1/monitors', monitorRoutes)`.",
      "Auth isn't ready yet, so at the top of `monitor.routes.js` add `router.use((req, res, next) => { req.user = { id: 1 }; next(); });` with the comment `// TEMP: removed in KL-17`. Make sure a user with id 1 exists (run the KL-06 seed or register one).",
      "`POST /` with body `{ name, url, intervalSec, isPublic }`: create the monitor with `userId: req.user.id`. Default `intervalSec` to 60 and `isPublic` to false when missing. Respond 201 `{ data: monitor }`. (Validation comes in KL-15.)",
      "`GET /`: return only `req.user.id`'s monitors, newest first (`orderBy: { createdAt: 'desc' }`), as `{ data: [...] }`. (Pagination comes in KL-15.)",
    ],
    done: [
      "`POST /api/v1/monitors` in Postman returns 201 with the new monitor and its id.",
      "`GET /api/v1/monitors` returns it, and never returns monitors with a different `userId`.",
    ],
    pr: "KL-08: create and list monitors",
    concepts: "Express Router, controllers vs services, Prisma create and findMany with where and orderBy",
    lectures: [L.apRouter, L.apCrud], deps: ["KL-02"] },

  { id: "KL-09", day: 2, who: 3, pts: 2, title: "checkOne(): one HTTP check with a timeout",
    goal: "A function that checks one URL and always returns the result, never crashes.",
    steps: [
      "Create `src/services/checker.service.js` and export `checkOne(monitor)`. It only uses `monitor.url`.",
      "Call `fetch(monitor.url, { signal: AbortSignal.timeout(10000) })` (fetch is built into Node 18+). Measure the time with `Date.now()` before and after.",
      "Return exactly `{ isUp, statusCode, responseTimeMs, error }`. `isUp` is `res.ok` (status 200 to 299).",
      "Status not 2xx: `isUp: false`, `statusCode` the code, `responseTimeMs` measured, `error: \"HTTP <code>\"` (for example `HTTP 503`). Status 2xx: `error: null`.",
      "Timeout (`err.name === 'TimeoutError'`): `{ isUp: false, statusCode: null, responseTimeMs: null, error: \"Timed out\" }`. Any other network error: the same, but `error` is `err.message`.",
      "Wrap everything in try/catch so `checkOne` never throws.",
      "Add `tools/try-check.js` that calls `checkOne` on `http://localhost:4000/ok`, `http://localhost:4000/flaky` and `http://localhost:9`, and prints the three results.",
    ],
    done: [
      "With the fake target running, `node tools/try-check.js` prints `isUp: true` for /ok and `isUp: false` with an `error` for localhost:9.",
      "After toggling the fake target, /flaky prints `isUp: false, statusCode: 503, error: \"HTTP 503\"`.",
    ],
    pr: "KL-09: checkOne",
    concepts: "fetch in Node 18+, async/await, AbortSignal.timeout, try/catch",
    lectures: [L.apLoop, L.apHttp], deps: ["KL-04"] },

  // ---------------- Day 3 ----------------
  { id: "KL-10", day: 3, who: 0, pts: 2, title: "POST /api/v1/auth/login and GET /api/v1/auth/me",
    goal: "Existing users can log in, and the app can ask who is logged in.",
    steps: [
      "Add both routes to the auth routes, controller and service from KL-07.",
      "`POST /login`, body `{ email, password }`. If no user has that email, or `bcrypt.compare(password, user.passwordHash)` is false, return 401 `{ error: \"Invalid email or password\" }`. Use the same message for both so nobody can tell which emails exist.",
      "On success respond 200 `{ data: { token, user: { id, name, email } } }`, making the token exactly as in KL-07.",
      "`GET /me`: protect it with the auth middleware from KL-11 if it's merged. If it isn't yet, verify the token with `jwt.verify` in the controller and switch to the middleware once KL-11 is in.",
      "`/me` responds `{ data: { id, name, email, createdAt } }` for the user in the token.",
    ],
    done: [
      "Logging in with `demo@kreg.dev` / `demo1234` returns 200 and a token.",
      "A wrong password and an unknown email both return 401 with the same message.",
      "`/me` with the token returns the user; without a token it returns 401; it never includes `passwordHash`.",
    ],
    pr: "KL-10: login and me",
    concepts: "bcrypt.compare, never revealing which emails exist, 401 vs 403",
    lectures: [L.apAuth, L.apJwt], deps: ["KL-07"] },

  { id: "KL-11", day: 3, who: 1, pts: 2, title: "Auth middleware, 404 handler and error handler",
    goal: "Protect routes with a token check, and make every error come back as JSON.",
    steps: [
      "Create `src/middleware/auth.js`. It reads `req.headers.authorization`, expects `Bearer <token>`, runs `jwt.verify(token, process.env.JWT_SECRET)`, sets `req.user = { id, email }` and calls `next()`.",
      "No header, or not starting with `Bearer `: 401 `{ error: \"Missing token\" }`. Invalid or expired token: 401 `{ error: \"Invalid or expired token\" }`.",
      "Create `src/middleware/notFound.js`: respond 404 `{ error: \"Route not found\" }`.",
      "Create `src/middleware/errorHandler.js` with four arguments `(err, req, res, next)`: `console.error(err)` and respond with `err.status` or 500, and `{ error: err.message || \"Something went wrong\" }`.",
      "In `app.js`, after every route, add `app.use(notFound)` and then `app.use(errorHandler)` as the last two lines before `module.exports`.",
      "Use the auth middleware on `GET /api/v1/auth/me`.",
    ],
    done: [
      "`GET /api/v1/nope` returns 404 JSON, not an HTML page.",
      "`/me` without a token → 401 `Missing token`; with `Bearer abc` → 401 `Invalid or expired token`; with a real token → 200.",
      "A `throw new Error('test')` inside any controller returns 500 JSON and the server keeps running.",
    ],
    pr: "KL-11: auth middleware and error handling",
    concepts: "Express middleware order, error-handling middleware with 4 arguments, jwt.verify",
    lectures: [L.apJwt, L.apExpress], deps: ["KL-07"] },

  { id: "KL-12", day: 3, who: 2, pts: 2, title: "The scheduler",
    goal: "Every 10 seconds, check all monitors that are due.",
    steps: [
      "Create `src/jobs/scheduler.js` exporting `startScheduler()`. It calls `tick()` once right away, then every 10000 ms with `setInterval`, and returns the interval id.",
      "`tick()` loads all monitors with `isActive: true` using the shared client from `src/config/db.js`.",
      "Keep only the due ones: `lastCheckedAt` is null, or `Date.now() - monitor.lastCheckedAt.getTime() >= monitor.intervalSec * 1000`.",
      "Run `checkOne` (KL-09) on all due monitors at once with `Promise.allSettled`, and `console.log` the monitor name with each result. (KL-14 replaces the logging with saving.)",
      "Add a `running` flag: if it's true when `tick()` starts, return straight away. Set it to true at the start and back to false in a `finally`.",
      "Call `startScheduler()` in `src/server.js` after `app.listen`.",
    ],
    done: [
      "With the seed loaded and `npm run fake` running, the console logs a result for every active monitor every 10 seconds. (Until KL-14 saves `lastCheckedAt`, every monitor is due every tick. That's expected.)",
      "With a monitor on `/slow`, ticks never overlap: you never see a new tick start before the previous one's logs finish.",
    ],
    pr: "KL-12: scheduler",
    concepts: "setInterval, Promise.allSettled vs Promise.all, the event loop, overlap guards",
    lectures: [L.apLoop], deps: ["KL-09", "KL-06"] },

  { id: "KL-13", day: 3, who: 3, pts: 2, title: "GET, PATCH and DELETE /api/v1/monitors/:id",
    goal: "Users can view, edit and delete one of their own monitors, and nobody else's.",
    steps: [
      "Add the three routes to `monitor.routes.js` with controller and service functions.",
      "Each one first loads the monitor with `where: { id: Number(req.params.id), userId: req.user.id }`. If the id isn't a number or nothing is found, return 404 `{ error: \"Monitor not found\" }` (404, not 403, so other people's ids stay hidden).",
      "`GET /:id`: respond `{ data: { ...monitor, openIncident } }`, where `openIncident` is that monitor's incident with `resolvedAt: null`, or `null`.",
      "`PATCH /:id`: update only the fields that are present among `name`, `url`, `intervalSec`, `isActive`, `isPublic`. Ignore any other field. Respond `{ data: updatedMonitor }`.",
      "`DELETE /:id`: delete it and respond 204 with no body (`res.status(204).end()`). Its results and incidents are deleted too, by the cascade from KL-02.",
    ],
    done: [
      "GET, PATCH and DELETE work on your monitor and return 404 on a monitor with a different `userId`.",
      "`/api/v1/monitors/abc` returns 404.",
      "PATCH with `{ \"isActive\": false, \"userId\": 99 }` changes `isActive` only.",
      "After DELETE, that monitor's `check_results` rows are gone too.",
    ],
    pr: "KL-13: get update delete monitor",
    concepts: "Route params, ownership checks, Prisma findFirst/update/delete, cascades",
    lectures: [L.apExpress, L.apCrud, L.apRel], deps: ["KL-08"] },

  // ---------------- Day 4 ----------------
  { id: "KL-14", day: 4, who: 0, pts: 3, title: "runCheck(): save every check in a transaction",
    goal: "Every check is saved, and the monitor's status and failure count stay in step with it.",
    steps: [
      "In `checker.service.js` add and export `runCheck(monitor)`. It calls `checkOne(monitor)` first.",
      "Work out the new values: `failures` = 0 if the check passed, else `monitor.consecutiveFailures + 1`. `status` = `UP` if it passed, `DOWN` if `failures >= 3`, otherwise unchanged.",
      "In one `prisma.$transaction([...])`, create the `CheckResult` (`monitorId` plus the 4 fields from checkOne) and update the monitor (`lastCheckedAt: new Date()`, `consecutiveFailures: failures`, `status`).",
      "Return the result object from checkOne.",
      "In `scheduler.js` (KL-12), replace the `checkOne` call and the logging with `runCheck`.",
    ],
    done: [
      "Rows appear in `check_results` every 10 s for Fake OK and Fake Flaky, but only once a minute for Example (so `lastCheckedAt` works).",
      "After toggling the fake target off, Fake Flaky's `consecutive_failures` goes 1, 2, 3 and its `status` becomes DOWN on the 3rd failure.",
      "After toggling it back on, the next check sets `consecutive_failures` to 0 and `status` to UP.",
      "You can explain why the two writes are in one transaction.",
    ],
    pr: "KL-14: save checks",
    concepts: "Transactions and ACID, prisma.$transaction, a simple state machine",
    lectures: [L.deTx], deps: ["KL-12"] },

  { id: "KL-15", day: 4, who: 1, pts: 2, title: "Validation and pagination for monitors",
    goal: "Bad input is rejected with a clear message, and long monitor lists come in pages.",
    steps: [
      "Create `src/middleware/validateMonitor.js` and use it on `POST /` and `PATCH /:id`.",
      "Rules: `name` is 1 to 100 characters; `url` starts with `http://` or `https://` and `new URL(url)` doesn't throw; `intervalSec` is an integer from 10 to 3600; `isActive` and `isPublic` are booleans. On POST, `name` and `url` are required. On PATCH everything is optional, but any field sent must follow the rules.",
      "On the first broken rule, return 400 `{ error: \"<field>: <what's wrong>\" }`, for example `intervalSec: must be an integer from 10 to 3600`.",
      "In `GET /`: read `?page` (default 1) and `?limit` (default 10, max 50). Use `skip: (page - 1) * limit` and `take: limit`, newest first, and `prisma.monitor.count` with the same `where` for the total.",
      "Respond `{ data: [...], page, limit, total }`.",
    ],
    done: [
      "POST with `url: \"ftp://x\"` → 400 starting `url:`; `intervalSec: 5` → 400; a valid body → 201.",
      "With 5 monitors, `?page=2&limit=2` returns the 3rd and 4th newest and `total: 5`.",
      "`?limit=500` returns at most 50.",
    ],
    pr: "KL-15: validation and pagination",
    concepts: "Input validation middleware, 400 errors, skip/take pagination, count",
    lectures: [L.apSeed, L.apRouter], deps: ["KL-08"] },

  { id: "KL-16", day: 4, who: 2, pts: 2, title: "GET /api/v1/monitors/:id/stats",
    goal: "The uptime numbers for one monitor over the last 24 hours, straight from SQL.",
    steps: [
      "Create `src/services/stats.service.js` with `getStats(monitorId)`. Use `prisma.$queryRaw` with query 1 from `docs/queries.sql` (KL-05), changed to filter on this one monitor.",
      "Pass values with the tagged template (`${monitorId}` inside the backticks). Never build the SQL by joining strings.",
      "Cast numbers in the SQL: `COUNT(...)::int`, `ROUND(...)::float`, `ROUND(AVG(...))::int`. Without the casts, `res.json` crashes on BigInt.",
      "Add `GET /:id/stats` to `monitor.routes.js`, with the same ownership check as KL-13 (404 if not yours).",
      "Respond `{ data: { uptime24h, avgMs24h, totalChecks24h } }`. `uptime24h` is a number like `98.5`, or `null` when there are no checks.",
    ],
    done: [
      "For a seeded monitor with checks, the three numbers match the same query run by hand in psql.",
      "A monitor with no checks returns `totalChecks24h: 0` and `uptime24h: null`, not an error.",
      "Another user's monitor id returns 404.",
    ],
    pr: "KL-16: stats endpoint",
    concepts: "$queryRaw tagged templates (safe parameters), BigInt from COUNT, SQL casts",
    lectures: [L.deAgg, L.deJoin], deps: ["KL-05", "KL-08"] },

  { id: "KL-17", day: 4, who: 3, pts: 2, title: "Protect the monitor routes and start the Postman collection",
    goal: "Only logged-in users reach monitor routes, and anyone can test the API in one click.",
    steps: [
      "In `monitor.routes.js` delete the temporary `req.user = { id: 1 }` middleware and add `router.use(auth)` with the middleware from KL-11.",
      "In Postman, create a collection named `Kreg Lite` with the variables `baseUrl` = `http://localhost:3000` and `token` (empty).",
      "Add the requests Register, Login, Me, Create monitor, List monitors, Get monitor, Update monitor and Delete monitor. Use `{{baseUrl}}` in every URL and the header `Authorization: Bearer {{token}}` on the protected ones.",
      "In Login's Tests (Scripts → Post-response) tab, add `pm.collectionVariables.set(\"token\", pm.response.json().data.token);`.",
      "Export the collection to `docs/kreg-lite.postman_collection.json`.",
    ],
    done: [
      "Every `/api/v1/monitors` route returns 401 without a token.",
      "After running Login once, every other request in the collection works without pasting a token.",
      "`grep -rn \"id: 1\" src` finds nothing.",
    ],
    pr: "KL-17: protect routes and postman",
    concepts: "Router-level middleware, Postman collections, variables and test scripts",
    lectures: [L.apJwt, L.apRouter], deps: ["KL-11", "KL-13"] },

  // ---------------- Day 5 ----------------
  { id: "KL-18", day: 5, who: 0, pts: 2, title: "EventEmitter: open an incident on the 3rd failure",
    goal: "When a monitor goes down, an incident is recorded exactly once.",
    steps: [
      "Create `src/events/monitorEvents.js` containing `const EventEmitter = require('events'); module.exports = new EventEmitter();`.",
      "In `runCheck` (KL-14), after the transaction: emit `'monitor:down'` with `(monitor, result)` when `failures === 3` exactly. Emit `'monitor:up'` with `(monitor)` when the check passed and `monitor.status` (the value from before this check) was `'DOWN'`.",
      "Create `src/services/incident.service.js`. It requires `monitorEvents` and listens to `'monitor:down'`: create an `Incident` with `monitorId: monitor.id` and `reason: result.error`, then `console.log('[DOWN]', monitor.name, result.error)`. Wrap the listener's body in try/catch.",
      "Add `require('./services/incident.service');` in `src/server.js` so the listener is registered.",
      "Merge by midday: KL-19 tomorrow adds the `'monitor:up'` listener to the same file.",
    ],
    done: [
      "Toggling the fake target off creates exactly one row in `incidents` for Fake Flaky after its 3rd failure, with reason `HTTP 503`.",
      "More failures after that don't create more incidents.",
      "The console shows the `[DOWN]` line once.",
    ],
    pr: "KL-18: incident on 3rd failure",
    concepts: "EventEmitter, the observer pattern, why the checker doesn't call incidents directly",
    lectures: [L.apEvents], deps: ["KL-14"] },

  { id: "KL-23", day: 5, who: 1, pts: 3, title: "100,000 fake rows and EXPLAIN before and after the index",
    goal: "Prove with real timings that the (monitor_id, checked_at) index speeds up the stats queries.",
    steps: [
      "On your local database run the seed (KL-06), then `SELECT id FROM monitors;` in psql and note the 5 ids.",
      "Insert 100,000 rows into `check_results` with one `INSERT INTO check_results (...) SELECT ... FROM generate_series(1, 100000) AS g`: `monitor_id` cycles through your 5 ids, `checked_at` is `NOW() - make_interval(secs => g * 30)`, about 5% of rows have `is_up` false with `status_code` 500, the rest `is_up` true with 200, and `response_time_ms` is random between 50 and 450.",
      "Drop the index: `DROP INDEX check_results_monitor_id_checked_at_idx;` Then run `EXPLAIN ANALYZE SELECT * FROM check_results WHERE monitor_id = <one id> AND checked_at > NOW() - INTERVAL '24 hours';` and screenshot it as `docs/explain-before.png`. It should say Seq Scan.",
      "Recreate it: `CREATE INDEX check_results_monitor_id_checked_at_idx ON check_results (monitor_id, checked_at);` Run the same EXPLAIN ANALYZE and screenshot it as `docs/explain-after.png` (Index Scan or Bitmap Index Scan).",
      "Save your INSERT as `docs/seed-100k.sql`. Write `docs/explain.md` with both execution times and one sentence on why the index helps.",
    ],
    done: [
      "`SELECT COUNT(*) FROM check_results;` is at least 100,000.",
      "`explain-before.png` shows Seq Scan, `explain-after.png` shows an index scan, and the after time is lower.",
      "The index exists again at the end (`\\d check_results` lists it).",
    ],
    pr: "KL-23: explain before and after index",
    concepts: "generate_series, composite indexes, reading EXPLAIN ANALYZE output",
    lectures: [L.deIdx, L.deMvcc], deps: ["KL-06"] },

  { id: "KL-20", day: 5, who: 2, pts: 2, title: "Results endpoint and uptime per day",
    goal: "The raw check history for a monitor, and its uptime for each of the last 7 days.",
    steps: [
      "Add `GET /:id/results` to `monitor.routes.js` with the ownership check from KL-13. Read `?limit` (default 50, max 200) and return that monitor's check results newest first as `{ data: [...] }`.",
      "In `stats.service.js`, run query 2 from `docs/queries.sql` (KL-05) for this monitor and add it to the stats response as `daily`: an array of `{ day, checks, uptimePct }`, oldest first, at most 7 items. Cast numbers as in KL-16.",
    ],
    done: [
      "`/results?limit=5` returns 5 rows, newest first.",
      "`/stats` now also has `daily` with up to 7 items, and the numbers match query 2 run by hand in psql.",
    ],
    pr: "KL-20: results and daily uptime",
    concepts: "orderBy and take in Prisma, GROUP BY DATE(), date intervals",
    lectures: [L.deAgg, L.deFunc, L.apCrud], deps: ["KL-14", "KL-16"] },

  { id: "KL-21", day: 5, who: 3, pts: 2, title: "Merge day: test the whole flow end to end",
    goal: "Find every bug in days 1 to 5 while there's still time to fix them.",
    steps: [
      "Once everyone's day 1 to 5 PRs are merged: `git checkout main`, `git pull upstream main`, `npm install`, `npx prisma migrate reset` (this also runs the seed).",
      "Start `npm run fake` in one terminal and `npm run dev` in another.",
      "In Postman, in this order: Register a new user → Login → Create monitor with url `http://localhost:4000/flaky` and `intervalSec: 10` → wait 30 s → Get results (rows appear) → `POST localhost:4000/toggle` → wait 40 s → Get monitor (`status` DOWN, `openIncident` set) → Get stats.",
      "For each step that fails or looks wrong, open a GitHub issue in the repo with the label `bug`: what you did, what you expected, what happened, and which task ID it belongs to.",
      "Post in the group chat which steps passed, with links to the issues.",
    ],
    done: [
      "Every step of the Postman run was tried and its result written down.",
      "Each problem has its own `bug` issue with steps to reproduce.",
    ],
    pr: null,
    concepts: "Integration testing, writing a good bug report",
    lectures: [L.apHttp], deps: ["KL-14", "KL-17", "KL-18"] },

  // ---------------- Day 6 ----------------
  { id: "KL-22", day: 6, who: 0, pts: 2, title: "Public GET /api/v1/status",
    goal: "Anyone, logged in or not, can see the public monitors and their uptime.",
    steps: [
      "Create `src/routes/status.routes.js` and `src/controllers/status.controller.js`. Mount with `app.use('/api/v1/status', statusRoutes)`, with no auth middleware.",
      "Return every monitor with `is_public = true`, from all users, using query 1 with `WHERE m.is_public` instead of the user filter. Cast numbers as in KL-16.",
      "Respond `{ data: [{ id, name, status, uptime24h, avgMs24h }] }`. Leave out `url`, `userId` and every other field.",
    ],
    done: [
      "It works without a token.",
      "The seeded `Private OK` monitor never appears.",
      "Each item has exactly those 5 fields.",
    ],
    pr: "KL-22: public status",
    concepts: "Public vs protected routes, filtering in SQL, not leaking data",
    lectures: [L.apRouter, L.deSelect], deps: ["KL-16"] },

  { id: "KL-19", day: 6, who: 1, pts: 2, title: "Resolve incidents and list them",
    goal: "When a monitor recovers its incident is closed, and users can see a monitor's incident history.",
    steps: [
      "In `src/services/incident.service.js` (from KL-18), listen to `'monitor:up'`: run `prisma.incident.updateMany({ where: { monitorId: monitor.id, resolvedAt: null }, data: { resolvedAt: new Date() } })` and `console.log('[UP]', monitor.name, 'recovered')`. Wrap it in try/catch.",
      "Add `GET /:id/incidents` to `monitor.routes.js` with the ownership check from KL-13: that monitor's incidents, newest first, as `{ data: [...] }`.",
    ],
    done: [
      "Toggle off, wait for DOWN, toggle on: within about 10 s the incident gets a `resolved_at`.",
      "`/incidents` lists it with both `startedAt` and `resolvedAt`.",
      "An incident that is still open shows `resolvedAt: null`.",
    ],
    pr: "KL-19: resolve and list incidents",
    concepts: "EventEmitter listeners, updateMany, NULL resolved_at meaning still open",
    lectures: [L.apEvents, L.apRel], deps: ["KL-18"] },

  { id: "KL-24", day: 6, who: 2, pts: 2, title: "Manual check endpoint and graceful shutdown",
    goal: "Check a monitor on demand, and stop the server without leaving anything half done.",
    steps: [
      "Add `POST /:id/check` to `monitor.routes.js` with the ownership check from KL-13. It calls `runCheck(monitor)` and responds `{ data: result }`.",
      "In `src/server.js` keep both handles: `const server = app.listen(...)` and `const timer = startScheduler()`.",
      "On `process.on('SIGINT', ...)` and `process.on('SIGTERM', ...)`: `clearInterval(timer)`, `server.close()`, `await prisma.$disconnect()`, `console.log('Shut down cleanly')`, then `process.exit(0)`.",
    ],
    done: [
      "`POST /api/v1/monitors/<id>/check` returns a fresh result and adds a row to `check_results`.",
      "Pressing Ctrl+C prints `Shut down cleanly` and no errors.",
    ],
    pr: "KL-24: manual check and shutdown",
    concepts: "process signals, cleaning up on shutdown, reusing service functions",
    lectures: [L.apModules, L.apLoop], deps: ["KL-14"] },

  { id: "KL-25", day: 6, who: 3, pts: 3, title: "Moving average and speed ranking",
    goal: "Show response-time trends with a window function and rank monitors with a CTE.",
    steps: [
      "Query 3 (add to `docs/queries.sql`): for monitor `$1`, its last 50 successful checks (`is_up` true), newest first, with `checked_at`, `response_time_ms` and `moving_avg_ms` = the average of that check and the 4 before it in time. Use `AVG(response_time_ms) OVER (ORDER BY checked_at ROWS BETWEEN 4 PRECEDING AND CURRENT ROW)`.",
      "Add query 3's rows to the stats response (KL-16) as `movingAvg: [{ checkedAt, responseTimeMs, movingAvgMs }]`.",
      "Query 4 (add to `docs/queries.sql`): in a CTE, compute each of user `$1`'s monitors' average response time over successful checks in the last 24 hours; then select `id`, `name`, `avg_ms` and `speed_rank` = `RANK() OVER (ORDER BY avg_ms)` (1 = fastest).",
      "Create `src/routes/stats.routes.js` and its controller, mounted at `/api/v1/stats` with the auth middleware. `GET /overview` responds `{ data: { ranking: [{ id, name, avgMs, speedRank }] } }`.",
      "Cast all numbers in the SQL as in KL-16.",
    ],
    done: [
      "`/api/v1/monitors/<id>/stats` includes `movingAvg` with up to 50 items, newest first.",
      "`/api/v1/stats/overview` ranks your monitors with `speedRank` 1 for the fastest, and Fake Slow last.",
      "Queries 3 and 4 are in `docs/queries.sql` with comments.",
    ],
    pr: "KL-25: moving average and ranking",
    concepts: "Window functions, ROWS BETWEEN, RANK(), CTEs",
    lectures: [L.deWin, L.deCte], deps: ["KL-16"] },

  // ---------------- Day 7 ----------------
  { id: "KL-26", day: 7, who: 0, pts: 3, title: "React app: setup, login and register",
    goal: "A browser app where people can register, log in and stay logged in.",
    steps: [
      "In the repo root: `npm create vite@latest client -- --template react`, then `cd client`, `npm install`, `npm install react-router-dom`.",
      "Create `client/src/api.js` with `const API = 'http://localhost:3000/api/v1'` and a function `api(path, options)` that sends JSON, adds `Authorization: Bearer <token>` when `localStorage.token` exists, returns the parsed body, and throws `new Error(body.error)` when the response isn't ok.",
      "Set up routes with react-router: `/login`, `/register`, `/dashboard` (for now just the text `Dashboard` and a Log out button), and `/` redirecting to `/dashboard`.",
      "The login and register forms call the API. On success, save `data.token` in `localStorage.token` and go to `/dashboard`. On error, show the error text under the form.",
      "Opening `/dashboard` without a token sends you to `/login`. Log out removes `localStorage.token` and goes to `/login`.",
      "The API already uses `cors()` from KL-01. Check the browser console shows no CORS errors.",
    ],
    done: [
      "`npm run dev` inside `client/` opens the app on `localhost:5173`.",
      "Register → you land on `/dashboard`; reloading keeps you logged in; Log out → `/login`.",
      "A wrong password shows `Invalid email or password` on the page.",
    ],
    pr: "KL-26: react setup and auth pages",
    concepts: "Vite, React state, react-router, fetch with an Authorization header, CORS, localStorage",
    lectures: [L.apJwt, L.apCookie, L.apHttp], deps: ["KL-10"] },

  { id: "KL-27", day: 7, who: 1, pts: 2, title: "Downtime and currently-failing queries",
    goal: "Show how long each monitor has been down in total, and which ones are failing right now.",
    steps: [
      "Query 5 (add to `docs/queries.sql`): for user `$1`'s monitors that have at least one incident: `name`, `incidents` (count) and `downtime_sec` = the sum of `resolved_at - started_at` in seconds, where an open incident counts up to `NOW()` (use COALESCE). Use GROUP BY with HAVING, sorted by `downtime_sec` descending.",
      "Query 6: user `$1`'s monitors whose most recent check failed: `name`, `status_code`, `error`, `checked_at`. Find the most recent check with a correlated subquery: `c.checked_at = (SELECT MAX(c2.checked_at) FROM check_results c2 WHERE c2.monitor_id = m.id)`.",
      "Add both to `/api/v1/stats/overview` (KL-25) as `downtime: [{ name, incidents, downtimeSec }]` and `failingNow: [{ name, statusCode, error, checkedAt }]`. Cast numbers as in KL-16.",
    ],
    done: [
      "After one toggle off and on, `downtime` shows Fake Flaky with 1 incident and a sensible number of seconds.",
      "While Fake Flaky is toggled off it appears in `failingNow`; after it recovers it doesn't.",
      "Queries 5 and 6 are in `docs/queries.sql` with comments.",
    ],
    pr: "KL-27: downtime and failing queries",
    concepts: "HAVING, COALESCE, EXTRACT(EPOCH FROM ...), correlated subqueries",
    lectures: [L.deSub, L.deAgg, L.deFunc], deps: ["KL-25", "KL-19"] },

  { id: "KL-28", day: 7, who: 2, pts: 2, title: "Plain HTML status page",
    goal: "A status page that works even if the React app isn't finished.",
    steps: [
      "In `app.js` add `app.use(express.static('public'))` before the routes.",
      "Create `public/status.html` with inline CSS and JavaScript (no frameworks).",
      "On load and every 15 s, `fetch('/api/v1/status')` and draw a table: a coloured dot (green UP, red DOWN, grey UNKNOWN), the name, uptime % (or `–` if null) and average ms.",
      "Under the table show `Last updated HH:MM:SS`.",
    ],
    done: [
      "`localhost:3000/status.html` shows all public monitors.",
      "After toggling the fake target off, Fake Flaky's dot turns red within about 45 s without reloading the page.",
    ],
    pr: "KL-28: html status page",
    concepts: "express.static, fetch in the browser, setInterval polling, DOM updates",
    lectures: [L.apExpress, L.apRouting], deps: ["KL-22"] },

  { id: "KL-29", day: 7, who: 3, pts: 1, title: "README: setup and run",
    goal: "Anyone can get the project running from the README alone.",
    steps: [
      "Rewrite `README.md` with these sections, in order: What it is (2 sentences), Requirements (Node 18+, PostgreSQL 16), Setup, Run, Demo login, Team.",
      "Setup, as commands in this order: Fork on GitHub, `git clone` your fork, `cd`, `git remote add upstream ...`, `cp .env.example .env`, edit `DATABASE_URL`, `npm install`, `npx prisma migrate dev`, `npx prisma db seed`.",
      "Run: `npm run fake`, `npm run dev`, and `cd client && npm install && npm run dev`, each in its own terminal.",
      "Demo login: `demo@kreg.dev` / `demo1234`. Team: the four names and a link to the Heartbeat page.",
      "Every command goes in a code block.",
    ],
    done: [
      "A teammate follows only the README on a fresh clone and gets `/healthz` and the seeded monitors working without asking you anything.",
    ],
    pr: "KL-29: readme setup",
    concepts: "Writing setup docs",
    lectures: [L.apModules], deps: ["KL-06"] },

  { id: "KL-30", day: 7, who: 3, pts: 1, title: "Fix the bugs from merge day",
    goal: "No known bugs left from day 5.",
    steps: [
      "Open the repo's Issues filtered by the `bug` label (from KL-21).",
      "Comment `taking this` on each one nobody has claimed, and fix it with one PR per issue, titled `KL-30: fix #<issue number>`.",
      "Put `Fixes #<issue number>` in each PR's description so GitHub closes the issue when it's merged.",
    ],
    done: [
      "Every `bug` issue from day 5 is closed, or has a comment saying who is fixing it and by when.",
    ],
    pr: "KL-30: fix #<issue number>",
    concepts: "Reading other people's code, small focused PRs, closing issues from PRs",
    lectures: [L.apMvc], deps: ["KL-21"] },

  // ---------------- Day 8 ----------------
  { id: "KL-31", day: 8, who: 0, pts: 2, title: "React: monitor detail page",
    goal: "One page that shows everything about one monitor.",
    steps: [
      "Add the route `/monitors/:id` to the React app.",
      "Load `GET /monitors/:id`, `/monitors/:id/stats`, `/monitors/:id/results?limit=50` and `/monitors/:id/incidents` with the `api` helper from KL-26.",
      "Show: name, url and a status pill (UP green, DOWN red, UNKNOWN grey); `uptime24h` % and `avgMs24h` ms; a table of the 50 results (time, Up or Down, status code, ms); a list of incidents (started, resolved or `ongoing`, duration).",
      "Add a `Check now` button that calls `POST /monitors/:id/check` and then reloads the data.",
      "If any call fails with `Monitor not found`, show `Monitor not found` instead of the page.",
    ],
    done: [
      "`/monitors/<Fake Flaky's id>` shows real results and incidents.",
      "`Check now` adds a new row at the top of the results table.",
      "`/monitors/99999` shows `Monitor not found`.",
    ],
    pr: "KL-31: monitor detail page",
    concepts: "useEffect for loading data, route params in react-router, rendering lists and tables",
    lectures: [L.apRouter], deps: ["KL-26", "KL-20", "KL-19"] },

  { id: "KL-33", day: 8, who: 1, pts: 2, title: "Finish the Postman collection",
    goal: "One file that tests every endpoint in one run.",
    steps: [
      "Add a request for every endpoint in the API contract that isn't in the KL-17 collection yet: results, incidents, check, stats, overview, status and healthz.",
      "Send each request once and click Save Response → Save as example.",
      "Add a test to each request: `pm.test(\"status\", () => pm.response.to.have.status(<expected code>));`.",
      "Export it again to `docs/kreg-lite.postman_collection.json`, replacing the KL-17 version.",
    ],
    done: [
      "The collection has all 15 endpoints from the API contract.",
      "On a freshly seeded database, the Collection Runner (starting with Login) passes every test.",
    ],
    pr: "KL-33: full postman collection",
    concepts: "Postman tests, saved examples, the Collection Runner",
    lectures: [L.apHttp, L.apRouter], deps: ["KL-17"] },

  { id: "KL-32", day: 8, who: 2, pts: 3, title: "React: dashboard and add-monitor form",
    goal: "Logged-in users see all their monitors at a glance and can add new ones.",
    steps: [
      "Replace the placeholder `/dashboard` from KL-26.",
      "Load `GET /monitors?limit=50`, then `GET /monitors/:id/stats` for each monitor. Show a table: status pill, name, url, `uptime24h` %. Clicking a row opens `/monitors/:id`.",
      "Refresh the data every 15 s with `setInterval` inside `useEffect`, and clear it in the effect's cleanup function.",
      "Above the table, a form with name, url and interval in seconds (default 60) that POSTs to `/monitors`. Show the API's error message on a 400. On success, clear the form and reload the list.",
      "If any call comes back 401, remove `localStorage.token` and go to `/login`.",
    ],
    done: [
      "Adding `http://localhost:4000/flaky` with interval 10 makes it appear in the table.",
      "After toggling the fake target off, its pill turns DOWN within about 45 s without reloading.",
      "Submitting the url `abc` shows the validation error from the API.",
    ],
    pr: "KL-32: dashboard",
    concepts: "Controlled forms, POST with fetch, polling with setInterval in useEffect, cleanup functions",
    lectures: [L.apRouter, L.apHttp], deps: ["KL-26", "KL-15", "KL-16"] },

  { id: "KL-34", day: 8, who: 3, pts: 2, title: "React: public status page",
    goal: "A public status page in the React app that needs no login.",
    steps: [
      "Add the route `/status`, reachable without logging in.",
      "Fetch `GET /status` on load and every 15 s, and clear the interval when the page unmounts.",
      "Show each public monitor: a dot (green UP, red DOWN, grey UNKNOWN), name, `uptime24h` % (or `–`) and `avgMs24h` ms, with `Last updated HH:MM:SS` at the bottom.",
    ],
    done: [
      "`localhost:5173/status` in a private window (logged out) shows the public monitors.",
      "`Private OK` never appears.",
      "Toggling the fake target changes Fake Flaky's dot within about 45 s.",
    ],
    pr: "KL-34: react status page",
    concepts: "Public routes in React, polling, conditional styling",
    lectures: [L.apRouter], deps: ["KL-26", "KL-22"] },

  // ---------------- Day 9: feature freeze ----------------
  { id: "KL-35", day: 9, who: 0, pts: 1, title: "Freeze: run the demo flow once, write the auth notes",
    goal: "Confirm everything works on a fresh database, and be ready to explain auth.",
    steps: [
      "From today only bug fixes get merged. No new features.",
      "`git checkout main`, `git pull upstream main`, `npm install`, `npx prisma migrate reset` (re-seeds), then start the fake target, the API and the client.",
      "Run the Postman flow from KL-21 once, then the same flow in the React app. Post anything that breaks in the group chat.",
      "Write `docs/viva-auth.md`, at most one page, answering: How does register store the password? What's inside the JWT, and how long does it last? What does the auth middleware do, step by step? Why do other users' monitors return 404 and not 403?",
    ],
    done: [
      "The full flow ran once on a freshly reset database.",
      "`docs/viva-auth.md` answers all 4 questions.",
    ],
    pr: "KL-35: auth viva notes",
    concepts: "Explaining your own code out loud",
    lectures: [L.apJwt, L.apAuth], deps: [] },

  { id: "KL-37", day: 9, who: 1, pts: 2, title: "Freeze: final ER diagram and database notes",
    goal: "Be ready to explain the database design in the viva.",
    steps: [
      "Compare `docs/er-diagram.png` with `prisma/schema.prisma` and redraw the diagram if anything changed.",
      "Write `docs/viva-db.md`, at most one page, covering: why the tables are normalized; what each index is for and which query uses it; why `runCheck` uses a transaction (ACID); the before and after times from KL-23.",
    ],
    done: [
      "Every column in `schema.prisma` appears in the diagram.",
      "`docs/viva-db.md` covers all 4 points.",
    ],
    pr: "KL-37: db viva notes",
    concepts: "Normalization, indexes, ACID in your own words",
    lectures: [L.deNorm, L.deIdx, L.deTx], deps: [] },

  { id: "KL-38", day: 9, who: 2, pts: 2, title: "Freeze: demo script and checker notes",
    goal: "A demo anyone on the team can run from a script, and notes on the checker.",
    steps: [
      "Write `docs/demo.md`: the 5-minute demo step by step, in order: which commands to run, which pages to open, when to toggle the fake target, what the audience should see, and who presents each part (the auth, database, checker, and SQL plus status page owners).",
      "Write `docs/viva-checker.md`, at most one page: how the scheduler decides a monitor is due; why Promise.allSettled and not Promise.all; why the `running` flag; why 3 failures before DOWN; how the EventEmitter connects the checker to incidents.",
    ],
    done: [
      "A teammate runs the whole demo from `docs/demo.md` alone.",
      "`docs/viva-checker.md` covers all 5 points.",
    ],
    pr: "KL-38: demo script and checker notes",
    concepts: "The event loop, events, explaining design choices",
    lectures: [L.apLoop, L.apEvents], deps: [] },

  { id: "KL-39", day: 9, who: 3, pts: 2, title: "Freeze: SQL notes",
    goal: "Be ready to explain every query in the viva.",
    steps: [
      "Write `docs/viva-sql.md` with one entry for each of the 6 queries in `docs/queries.sql` and the 100k insert from KL-23: one line on what it answers, and one line naming the SQL feature it shows (LEFT JOIN, GROUP BY, window function, CTE, HAVING, correlated subquery, generate_series).",
      "Check that each query in the notes matches the code in `stats.service.js`.",
    ],
    done: [
      "`docs/viva-sql.md` has 7 entries, each with what it answers and the SQL feature.",
    ],
    pr: "KL-39: sql viva notes",
    concepts: "Joins, GROUP BY, window functions, CTEs, subqueries",
    lectures: [L.deWin, L.deCte, L.deSub], deps: [] },

  // ---------------- Day 10: rehearsal ----------------
  { id: "KL-40", day: 10, who: 0, pts: 1, title: "Rehearse: setup and auth",
    goal: "Present your part confidently, twice.",
    steps: [
      "Clone the repo into a new folder and follow only the README until the app runs. Time it.",
      "Present your part twice: register and log in in the React app, then explain the JWT and the middleware using `docs/viva-auth.md`.",
    ],
    done: [
      "The README worked on the fresh clone.",
      "Your part takes under 2 minutes without reading notes.",
    ],
    pr: null, concepts: "Your own tasks", lectures: [], deps: [] },

  { id: "KL-41", day: 10, who: 1, pts: 1, title: "Rehearse: the database",
    goal: "Present your part confidently, twice.",
    steps: [
      "Present twice: the ER diagram, the schema, and the EXPLAIN before and after screenshots, explaining normalization and the indexes using `docs/viva-db.md`.",
    ],
    done: ["Your part takes under 2 minutes without reading notes."],
    pr: null, concepts: "Your own tasks", lectures: [], deps: [] },

  { id: "KL-42", day: 10, who: 2, pts: 1, title: "Rehearse: the checker",
    goal: "Present your part confidently, twice.",
    steps: [
      "Run the live toggle demo twice from `docs/demo.md`: the monitor goes DOWN, an incident opens, then it resolves. Explain each step using `docs/viva-checker.md`.",
    ],
    done: ["Your part takes under 2 minutes without reading notes, and the live demo works both times."],
    pr: null, concepts: "Your own tasks", lectures: [], deps: [] },

  { id: "KL-43", day: 10, who: 3, pts: 1, title: "Rehearse: SQL and the status page",
    goal: "Present your part confidently, twice.",
    steps: [
      "Present twice: open `/api/v1/stats/overview` and the status page, and explain two queries from `docs/viva-sql.md` (one window function, one correlated subquery).",
    ],
    done: ["Your part takes under 2 minutes without reading notes."],
    pr: null, concepts: "Your own tasks", lectures: [], deps: [] },
];

export default PLAN;
