# Plan: Dedicated Background Worker Service

## Context
All scheduled/background work (price checks, webhook delivery, email notifications, Stripe reconciliation) currently lives in the API but is **never actually started** (SchedulerService.start() is never called). Moving this to a dedicated `worker/` workspace makes it independently deployable and scalable on Render.com, and keeps the API fully stateless.

**Key decisions:** Agenda.js (MongoDB-backed queue), Mailgun for email, new `worker/` workspace in monorepo.

---

## Phase 1 — Move Mongoose Schemas to `shared/`

Both API and worker need the same models. Move all schema files to `shared/src/db/` so both can import from `@pricy/shared/db`.

**Files to move** from `api/src/config/` → `shared/src/db/`:
- `database.js`, `userSchema.js`, `productSchema.js`, `competitorSchema.js`
- `priceHistorySchema.js`, `ruleSchema.js`, `eventSchema.js`, `webhookSchema.js`
- `stripe.js`, `stripeMock.js`

**New file:** `shared/src/db/index.js` — barrel export for all models + `connectDatabase` + stripe utils.

**Add export path** in `shared/package.json`:
```json
"exports": { "./db": "./src/db/index.js" }
```

**Add peer deps** to `shared/package.json`: `mongoose`, `stripe`.

**Replace** each moved file in `api/src/config/` with a thin re-export:
```js
export { UserModel } from '@pricy/shared/db';
```

API keeps working with zero import path changes.

---

## Phase 2 — Create Worker Package

### Structure
```
worker/
  package.json
  .env.example
  src/
    index.js                    # Bootstrap: DB connect, Agenda init, schedule jobs
    config/
      agenda.js                 # Agenda instance + retry config
      mailgun.js                # Mailgun client init
    jobs/
      index.js                  # Register all job definitions
      priceCheck.js             # Hourly orchestrator -> spawns check-competitor jobs
      checkCompetitor.js        # Scrape one competitor, evaluate rules, spawn webhook/email jobs
      sendWebhook.js            # Deliver one webhook with HMAC signature
      sendEmail.js              # Send one email via Mailgun
      stripeReconciliation.js   # Daily Stripe sync
      weeklyDigest.js           # Weekly -> spawn send-email per user
    services/
      PriceScraperService.js    # Moved from api (Axios + Cheerio)
      RuleEngineService.js      # Moved from api (rule evaluation)
      WebhookService.js         # Moved from api (HTTP send + HMAC)
      ExchangeRateService.js    # Moved from api (currency conversion)
      EmailService.js           # New: Mailgun wrapper + template rendering
    templates/
      layout.html               # Base email layout (Pricy branding)
      priceAlert.html            # Price change notification
      weeklyDigest.html          # Weekly summary
    lib/
      logger.js                 # pino (JSON in prod, pretty in dev)
      healthCheck.js            # HTTP /health endpoint for Render
      gracefulShutdown.js       # SIGTERM/SIGINT handler
```

### Dependencies (`worker/package.json`)
```
@pricy/shared, agenda, axios, cheerio, dotenv, handlebars,
mailgun.js, form-data, mongoose, pino, stripe
```
Dev: `nodemon`, `pino-pretty`

Add `"worker"` to root `package.json` workspaces array.

### Bootstrap (`worker/src/index.js`)
1. Connect to MongoDB (via `@pricy/shared/db`)
2. Create Agenda instance (collection: `agendaJobs`)
3. Register all job definitions
4. Set up event listeners (start, complete, fail + retry logic)
5. `agenda.start()`
6. Schedule recurring jobs (idempotent):
   - `agenda.every('1 hour', 'price-check')`
   - `agenda.every('0 3 * * *', 'stripe-reconciliation')`
   - `agenda.every('0 9 * * 1', 'weekly-digest')` (Monday 9 AM UTC)
7. Start health check HTTP server (port 7003)
8. Register graceful shutdown handlers

---

## Phase 3 — Job Definitions

### Job Overview

| Job | Schedule | Spawns | Concurrency | Retries |
|-----|----------|--------|-------------|---------|
| `price-check` | Every 1h | N `check-competitor` | 1 | 0 (next run covers it) |
| `check-competitor` | On-demand | `send-webhook`, `send-email` | 5 | 2 (5min fixed) |
| `send-webhook` | On-demand | — | 10 | 5 (exponential: 1m->16m) |
| `send-email` | On-demand | — | 5 | 3 (exponential: 30s->2m) |
| `stripe-reconciliation` | Daily 3 AM | — | 1 | 1 (30min fixed) |
| `weekly-digest` | Monday 9 AM | N `send-email` | 1 | 1 (1h fixed) |

Global: `maxConcurrency: 20`, `processEvery: '30 seconds'`, `defaultLockLifetime: 10 min`.

### Job Flow
```
price-check (hourly)
  -> find tracked products + active competitors
  -> agenda.now('check-competitor', { competitorId }) for each

check-competitor
  -> PriceScraperService.scrapePrice(url)
  -> save PriceHistory, update competitor
  -> if price changed: create Event, run RuleEngineService
    -> for each triggered rule:
      -> action 'webhook' -> agenda.now('send-webhook', { webhookId, payload })
      -> action 'email'   -> agenda.now('send-email', { type: 'price-alert', ... })

weekly-digest (Monday 9AM)
  -> find users with weeklyDigest=true
  -> aggregate events from past 7 days
  -> agenda.now('send-email', { type: 'weekly-digest', ... }) per user
```

### Retry Logic (via Agenda `fail` event handler)
```js
agenda.on('fail', (err, job) => {
  const config = retryConfig[job.attrs.name];
  if (!config || job.attrs.failCount > config.maxRetries) return;
  const delay = config.backoff === 'exponential'
    ? config.delay * Math.pow(2, job.attrs.failCount - 1)
    : config.delay;
  job.attrs.nextRunAt = new Date(Date.now() + delay);
  job.save();
});
```

---

## Phase 4 — Email (Mailgun + Handlebars)

**`worker/src/config/mailgun.js`** — init Mailgun client from `MAILGUN_API_KEY` + `MAILGUN_DOMAIN`.

**`worker/src/services/EmailService.js`** — renders Handlebars templates, sends via Mailgun:
- `sendPriceAlert({ email, userName, competitorName, productTitle, newPrice, previousPrice, ... })`
- `sendWeeklyDigest({ email, userName, events, startDate, endDate })`

**Templates:** `layout.html` (base), `priceAlert.html` (price change card), `weeklyDigest.html` (summary table). All use Pricy branding (#0D0D0D bg, #00FF41 accent).

---

## Phase 5 — API Integration (Async Scan)

The API needs to enqueue jobs without running Agenda. Direct MongoDB insert into the `agendaJobs` collection (avoids adding Agenda as an API dependency).

**New file:** `api/src/services/JobQueueService.js`
```js
static async enqueue(jobName, data = {}) {
  const collection = mongoose.connection.collection('agendaJobs');
  await collection.insertOne({ name: jobName, data, type: 'normal', nextRunAt: new Date(), ... });
}
```

**Update:** `api/src/controllers/productController.js` — `scanPrices()` changes from synchronous inline scraping to:
```js
for (const competitor of competitors) {
  await JobQueueService.enqueue('check-competitor', { competitorId, userId });
}
res.json({ message: `Queued ${competitors.length} checks`, queued: competitors.length });
```

Response changes from `{ results: [...] }` to `{ queued: N }`. Update frontend `ProductsView.vue` to show "Scan queued" message.

---

## Phase 6 — Cleanup API

1. **Delete** `api/src/services/SchedulerService.js`
2. **Delete** from api (now in worker): `PriceCheckService.js`, `PriceScraperService.js`, `RuleEngineService.js`, `ExchangeRateService.js`
3. **Keep** `WebhookService.js` in api (still needed for webhook test endpoint)
4. **Remove** `node-cron` from `api/package.json`

---

## Phase 7 — Render Deployment

| Setting | Value |
|---------|-------|
| Service type | Background Worker |
| Build command | `npm install` |
| Start command | `node worker/src/index.js` |
| Health check | `/health` on port 7003 |
| Instance | Starter ($7/mo) |

**Env vars:** `MONGODB_URI` (same as API), `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `FROM_EMAIL`, `STRIPE_SECRET_KEY`, all `STRIPE_PRICE_*`, `FRONTEND_URL`, `NODE_ENV=production`

---

## Phase 8 — Admin On-Demand Job Triggers

Add an admin API endpoint and admin UI to trigger any worker job on demand with custom parameters.

### API Side

**New file:** `api/src/controllers/adminJobController.js`
- `POST /admin/jobs/trigger` — admin-only endpoint (requires `role: 'admin'`)
- Accepts `{ jobName, data }` in request body
- Validates `jobName` against an allow-list of known jobs
- Uses `JobQueueService.enqueue(jobName, data)` to insert into `agendaJobs`
- Returns `{ success: true, jobName, queued: true }`

**New route:** `api/src/routes/adminRoutes.js` — add `/jobs/trigger` route

**Allowed jobs + their parameters:**

| Job | Parameters | Description |
|-----|-----------|-------------|
| `price-check` | _(none)_ | Run full price check cycle now |
| `check-competitor` | `{ competitorId }` | Check a single competitor |
| `send-webhook` | `{ webhookId, payload }` | Deliver a specific webhook |
| `send-email` | `{ type, email, ... }` | Send a specific email |
| `stripe-reconciliation` | _(none)_ | Run Stripe sync now |
| `weekly-digest` | `{ userId? }` | Generate digest (optionally for one user) |

### Admin UI Side

**Update:** `admin/` app — add a "Jobs" page:
- Dropdown to select job type
- Dynamic form fields based on selected job (e.g., competitorId input for `check-competitor`)
- "Trigger" button that calls `POST /admin/jobs/trigger`
- Success/error feedback
- Optional: show recent jobs from `agendaJobs` collection (last 20, with status)

**New endpoint for job history:** `GET /admin/jobs/recent` — queries `agendaJobs` collection, returns last 20 jobs with status, timestamps, error info.

---

## Files Summary

### New files
| File | Description |
|------|-------------|
| `worker/package.json` | Worker package with Agenda, Mailgun, pino deps |
| `worker/.env.example` | All required env vars |
| `worker/src/index.js` | Bootstrap: DB, Agenda, schedules, health, shutdown |
| `worker/src/config/agenda.js` | Agenda instance + retry config |
| `worker/src/config/mailgun.js` | Mailgun client |
| `worker/src/jobs/*.js` | 6 job definitions + registration barrel |
| `worker/src/services/EmailService.js` | Mailgun send + template rendering |
| `worker/src/services/PriceScraperService.js` | Moved from api |
| `worker/src/services/RuleEngineService.js` | Moved from api |
| `worker/src/services/WebhookService.js` | Copy from api (webhook delivery) |
| `worker/src/services/ExchangeRateService.js` | Moved from api |
| `worker/src/templates/*.html` | 3 email templates |
| `worker/src/lib/*.js` | logger, healthCheck, gracefulShutdown |
| `shared/src/db/*.js` | Schemas + database + stripe (moved from api) |
| `api/src/services/JobQueueService.js` | Direct Agenda collection insert |
| `api/src/controllers/adminJobController.js` | Admin job trigger endpoint |

### Modified files
| File | Changes |
|------|---------|
| `package.json` (root) | Add `"worker"` to workspaces |
| `shared/package.json` | Add `"./db"` export, peer deps |
| `api/src/config/*.js` (7 schemas + database + stripe) | Replace with re-exports from `@pricy/shared/db` |
| `api/src/controllers/productController.js` | `scanPrices` -> async via JobQueueService |
| `api/src/routes/adminRoutes.js` | Add job trigger + history routes |
| `web/src/views/ProductsView.vue` | Handle async scan response |
| `admin/` | Add Jobs page with trigger UI |

### Deleted files
| File | Reason |
|------|--------|
| `api/src/services/SchedulerService.js` | Replaced by worker |
| `api/src/services/PriceCheckService.js` | Moved to worker |
| `api/src/services/PriceScraperService.js` | Moved to worker |
| `api/src/services/RuleEngineService.js` | Moved to worker |
| `api/src/services/ExchangeRateService.js` | Moved to worker |
| `api/src/services/StripeReconciliationService.js` | Moved to worker |

## Verification
1. `npm install` from root — all workspaces resolve
2. `npm run dev:api` — API starts, schemas load from shared, no cron
3. `node worker/src/index.js` — worker starts, Agenda connects, recurring jobs scheduled
4. Click "Scan" in ProductsView — returns "Queued N checks", jobs appear in `agendaJobs` collection
5. Worker picks up `check-competitor` jobs within 30s, scrapes prices, creates events
6. Trigger a rule -> `send-webhook` job created -> delivered with retry on failure
7. `send-email` job -> Mailgun delivers, check Mailgun logs
8. Wait for hourly `price-check` -> spawns competitor checks automatically
9. Kill worker process (SIGTERM) -> graceful shutdown, in-progress jobs finish
10. Restart worker -> picks up where it left off from `agendaJobs` collection
11. Admin UI: trigger each job type on-demand, verify it appears in `agendaJobs` and gets picked up by worker
