# Pricy Worker — Background Job Service

## Overview

The worker is a standalone Node.js process that handles all background and scheduled tasks for the Pricy platform. It runs independently from the API server, consuming jobs from a shared MongoDB collection (`agendaJobs`) and executing them with configurable concurrency, retries, and scheduling.

**Start:** `npm run dev -w worker` (dev) or `node worker/src/index.js` (production)
**Health check:** `GET http://localhost:7003/health`

---

## Table of Contents

- [Architecture](#architecture)
- [Why This Design](#why-this-design)
- [Directory Structure](#directory-structure)
- [Job Catalog](#job-catalog)
- [Job Flow](#job-flow)
- [Retry & Error Handling](#retry--error-handling)
- [API ↔ Worker Communication](#api--worker-communication)
- [Email System](#email-system)
- [Configuration](#configuration)
- [Adding a New Job](#adding-a-new-job)
- [Scheduling Reference](#scheduling-reference)
- [Deployment](#deployment)

---

## Architecture

```
┌─────────────┐            ┌──────────────────────────────────────┐
│   API       │            │               Worker                 │
│             │  insert    │                                      │
│  JobQueue   ├─────────►  │  Agenda.js (polls every 30s)         │
│  Service    │            │    ├── price-check (hourly)          │
│             │ agendaJobs │    ├── check-competitor (on-demand)  │
│  (direct    │ collection │    ├── send-webhook (on-demand)      │
│   MongoDB   │            │    ├── send-email (on-demand)        │
│   insert)   │            │    ├── stripe-reconciliation (daily) │
│             │            │    └── weekly-digest (weekly)        │
└─────────────┘            └──────────────────────────────────────┘
                                           │
                             ┌─────────────┼─────────────┐
                             ▼             ▼             ▼
                          MongoDB       Mailgun       Stripe API
                         (shared DB)    (email)      (reconciliation)
```

The worker and API share the same MongoDB database. The API enqueues jobs by inserting documents directly into the `agendaJobs` collection. The worker polls this collection every 30 seconds, picks up pending jobs, and executes them.

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Bootstrap | `src/index.js` | DB connect, Agenda init, job registration, schedules, health check |
| Agenda config | `src/config/agenda.js` | Agenda instance creation, retry configuration per job |
| Mailgun config | `src/config/mailgun.js` | Lazy-initialized Mailgun client |
| Job definitions | `src/jobs/*.js` | One file per job type, each exports a `define` function |
| Job registry | `src/jobs/index.js` | Barrel that registers all jobs with Agenda |
| Services | `src/services/*.js` | Business logic (scraping, rules, webhooks, email) |
| Email templates | `src/templates/*.html` | Handlebars HTML templates for email |
| Logger | `src/lib/logger.js` | Pino (pretty in dev, JSON in prod) |
| Health check | `src/lib/healthCheck.js` | HTTP `/health` on port 7003 |
| Shutdown | `src/lib/gracefulShutdown.js` | SIGTERM/SIGINT → stop Agenda gracefully |

---

## Why This Design

### Why a separate worker process?

1. **Stateless API** — The API handles HTTP requests only. No cron schedules, no long-running scrapes. This makes it horizontally scalable — spin up more API instances without worrying about duplicate scheduled jobs.

2. **Independent scaling** — Price scraping is CPU/network-bound work. The worker can be scaled independently (bigger instance, more memory) without affecting API latency.

3. **Fault isolation** — If the worker crashes during a scrape, the API keeps serving requests. Failed jobs are automatically retried.

4. **Clean deployment** — On Render.com (or similar), the worker deploys as a "Background Worker" service, separate from the "Web Service" API.

### Why Agenda.js?

- **MongoDB-backed** — No additional infrastructure (no Redis, no RabbitMQ). Pricy already uses MongoDB, so the job queue is free.
- **Cron + one-off jobs** — Supports both recurring schedules (`every`) and on-demand jobs (`now`).
- **Built-in locking** — Jobs are locked during execution, preventing duplicate processing even with multiple worker instances.
- **Retry-friendly** — Failed jobs retain their state (`failCount`, `failReason`) and can be rescheduled.
- **Persistence** — Jobs survive process restarts. If the worker goes down, pending jobs wait in MongoDB and are picked up when it comes back.

### Why direct MongoDB insert from the API (not Agenda)?

The API enqueues jobs via `JobQueueService` which inserts raw documents into the `agendaJobs` collection. This avoids adding Agenda as an API dependency — the API stays lightweight, and the queue contract is just a MongoDB document shape.

---

## Directory Structure

```
worker/
├── package.json
├── .env.example
└── src/
    ├── index.js                       # Bootstrap entry point
    ├── config/
    │   ├── agenda.js                  # Agenda instance + retry config
    │   └── mailgun.js                 # Mailgun client (lazy init)
    ├── jobs/
    │   ├── index.js                   # Registers all job definitions
    │   ├── priceCheck.js              # Hourly orchestrator
    │   ├── checkCompetitor.js         # Scrape one competitor
    │   ├── sendWebhook.js             # Deliver one webhook
    │   ├── sendEmail.js               # Send one email
    │   ├── stripeReconciliation.js    # Daily Stripe sync
    │   └── weeklyDigest.js            # Monday digest mailer
    ├── services/
    │   ├── PriceScraperService.js     # Axios + Cheerio scraper
    │   ├── RuleEngineService.js       # Rule evaluation + action dispatch
    │   ├── WebhookService.js          # HTTP delivery + HMAC signing
    │   ├── ExchangeRateService.js     # Currency conversion (cached)
    │   └── EmailService.js            # Handlebars + Mailgun
    ├── templates/
    │   ├── layout.html                # Base email layout
    │   ├── priceAlert.html            # Price change notification
    │   └── weeklyDigest.html          # Weekly summary
    └── lib/
        ├── logger.js                  # Pino logger
        ├── healthCheck.js             # HTTP /health endpoint
        └── gracefulShutdown.js        # SIGTERM/SIGINT handler
```

---

## Job Catalog

| Job | Schedule | Trigger | Concurrency | Retries | Backoff |
|-----|----------|---------|-------------|---------|---------|
| `price-check` | Every 1 hour | Recurring | 1 | None (next run covers it) | — |
| `check-competitor` | On-demand | Spawned by `price-check` or API scan | 5 | 2 | Fixed 5 min |
| `send-webhook` | On-demand | Spawned by rule engine | 10 | 5 | Exponential (1m → 16m) |
| `send-email` | On-demand | Spawned by rule engine or digest | 5 | 3 | Exponential (30s → 2m) |
| `stripe-reconciliation` | Daily 3:00 AM UTC | Recurring | 1 | 1 | Fixed 30 min |
| `weekly-digest` | Monday 9:00 AM UTC | Recurring | 1 | 1 | Fixed 1 hour |

**Global settings:** `maxConcurrency: 20`, `processEvery: 30 seconds`, `defaultLockLifetime: 10 minutes`

---

## Job Flow

### Hourly Price Check

```
price-check (runs every hour)
│
├── Find all tracked products
├── Find all active competitors for those products
│
└── For each competitor:
    └── agenda.now('check-competitor', { competitorId, userId })
```

### Check Competitor (per competitor)

```
check-competitor
│
├── Load competitor + product from DB
├── PriceScraperService.scrapePrice(url, selectors)
│
├── On success:
│   ├── Update competitor (currentPrice, lastCheckedAt, etc.)
│   ├── Save PriceHistory record
│   │
│   ├── If first price → create "price_discovered" event
│   ├── If price changed:
│   │   ├── Create "price_drop" / "price_increase" event
│   │   └── RuleEngineService.evaluatePriceChange()
│   │       ├── For each triggered rule:
│   │       │   ├── action: 'email'   → agenda.now('send-email', ...)
│   │       │   ├── action: 'webhook' → agenda.now('send-webhook', ...)
│   │       │   └── action: 'log'     → create "rule_triggered" event
│   │       └── Update rule (lastTriggeredAt, triggerCount)
│   └── If price unchanged → debug log only
│
└── On failure:
    ├── Update competitor (checkStatus: 'error')
    ├── Create "competitor_error" event
    └── throw Error → triggers Agenda retry
```

### Weekly Digest (Monday 9 AM)

```
weekly-digest
│
├── Find users with weeklyDigest=true and isActive=true
│
└── For each user:
    ├── Query events from past 7 days (limit 50)
    ├── If no events → skip
    └── agenda.now('send-email', { type: 'weekly-digest', userId, events, ... })
```

### Stripe Reconciliation (Daily 3 AM)

```
stripe-reconciliation
│
├── If Stripe not configured → skip
├── Find all users with stripeSubscriptionId
│
└── Process in batches of 20 (1s delay between batches):
    └── For each user:
        ├── Fetch subscription from Stripe API
        ├── Compare local fields vs Stripe source of truth
        ├── If subscription deleted → revert to free plan
        └── If fields differ → update (status, priceId, periodEnd, plan, planLimits)
```

---

## Retry & Error Handling

Retry logic is centralized in the `fail` event handler in `src/index.js`. When a job throws an error, Agenda increments `failCount` and fires the `fail` event. The handler checks the retry config and reschedules:

```
Job fails → Agenda 'fail' event
│
├── Look up retryConfig[job.name]
├── If no config or failCount > maxRetries → give up
│
├── Calculate delay:
│   ├── fixed:       delay (constant)
│   └── exponential: delay * 2^(failCount - 1)
│
└── Set job.nextRunAt = now + delay → job.save()
```

**Retry configuration** (`src/config/agenda.js`):

```js
{
  'check-competitor':      { maxRetries: 2, delay: 5min,  backoff: 'fixed' },
  'send-webhook':          { maxRetries: 5, delay: 1min,  backoff: 'exponential' },
  'send-email':            { maxRetries: 3, delay: 30sec, backoff: 'exponential' },
  'stripe-reconciliation': { maxRetries: 1, delay: 30min, backoff: 'fixed' },
  'weekly-digest':         { maxRetries: 1, delay: 1hr,   backoff: 'fixed' },
}
```

`price-check` has no retry config — if it fails, the next hourly run handles it.

### Webhook auto-disable

The `send-webhook` job tracks consecutive failures on the webhook document. After 10 consecutive failures, the webhook is automatically disabled (`isActive = false`).

---

## API ↔ Worker Communication

The API and worker communicate exclusively through the shared `agendaJobs` MongoDB collection.

### From the API side (`api/src/services/JobQueueService.js`)

```js
import mongoose from 'mongoose';

export class JobQueueService {
  static async enqueue(jobName, data = {}) {
    const collection = mongoose.connection.collection('agendaJobs');
    await collection.insertOne({
      name: jobName,
      data,
      type: 'normal',
      priority: 0,
      nextRunAt: new Date(),    // Run immediately
      lastModifiedBy: null,
      lockedAt: null,
      lastRunAt: null,
      lastFinishedAt: null,
    });
  }
}
```

### Who enqueues what

| Source | Job | When |
|--------|-----|------|
| API `productController.scanPrices()` | `check-competitor` | User clicks "Scan" |
| API `competitorController.checkCompetitorPrice()` | `check-competitor` | User checks single competitor |
| API `adminJobController.triggerJob()` | Any allowed job | Admin triggers manually |
| Worker `price-check` | `check-competitor` | Hourly schedule |
| Worker `check-competitor` → RuleEngine | `send-webhook`, `send-email` | Rule triggered |
| Worker `weekly-digest` | `send-email` | Monday digest |

### Admin job triggers

The admin API exposes endpoints to trigger jobs on demand:

- `GET  /admin/jobs` — List available job names and parameters
- `GET  /admin/jobs/recent` — View recent job history
- `POST /admin/jobs/trigger` — Enqueue a job: `{ jobName: "price-check", data: {} }`

---

## Email System

Emails use **Mailgun** for delivery and **Handlebars** for templating.

### Templates

Templates live in `src/templates/` and use a shared layout partial:

- `layout.html` — Base email layout (dark theme: #0D0D0D background, #00FF41 accent)
- `priceAlert.html` — Price change notification with competitor name, old/new price, change %
- `weeklyDigest.html` — Weekly summary with event count and event list table

### Handlebars helpers

| Helper | Usage | Output |
|--------|-------|--------|
| `formatPrice` | `{{formatPrice 29.99}}` | `$29.99` |
| `formatPercent` | `{{formatPercent -5.23}}` | `-5.23%` |
| `formatDate` | `{{formatDate date}}` | `Feb 21, 2026` |

### Adding a new email template

1. Create `src/templates/myTemplate.html`
2. Add a send method to `EmailService`:
   ```js
   async sendMyEmail({ email, userName, ...data }) {
     const template = getTemplate('myTemplate');
     const html = template({ userName, ...data, frontendUrl: process.env.FRONTEND_URL });
     return this.send({ to: email, subject: `...`, html });
   }
   ```
3. Add a `case` in `src/jobs/sendEmail.js`:
   ```js
   case 'my-email-type':
     await emailService.sendMyEmail({ email: user.email, userName: user.name, ...emailData });
     break;
   ```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/pricy` | MongoDB connection string |
| `NODE_ENV` | No | `development` | `production` for JSON logs |
| `MAILGUN_API_KEY` | No | — | Mailgun API key (emails skipped if missing) |
| `MAILGUN_DOMAIN` | No | — | Mailgun domain (e.g., `mg.yourdomain.com`) |
| `FROM_EMAIL` | No | — | Sender address (e.g., `Pricy <noreply@yourdomain.com>`) |
| `MOCK_BILLING` | No | `true` | Set to `false` to use real Stripe |
| `STRIPE_SECRET_KEY` | No | — | Required when `MOCK_BILLING=false` |
| `STRIPE_PRICE_*` | No | — | Stripe price IDs for plan mapping |
| `FRONTEND_URL` | No | `http://localhost:7001` | Base URL for links in emails |
| `HEALTH_PORT` | No | `7003` | Port for the `/health` endpoint |
| `LOG_LEVEL` | No | `debug` (dev) / `info` (prod) | Pino log level |

### Agenda Tuning

These are set in `src/config/agenda.js`:

| Setting | Value | Description |
|---------|-------|-------------|
| `processEvery` | `30 seconds` | How often Agenda polls for new jobs |
| `maxConcurrency` | `20` | Max jobs running at once across all types |
| `defaultLockLifetime` | `10 minutes` | How long a job lock is held before considered stale |

---

## Adding a New Job

Follow this step-by-step guide to add a new background job.

### Step 1: Create the job definition

Create a new file in `src/jobs/`:

```js
// src/jobs/myNewJob.js
import { logger } from '../lib/logger.js';

export default function defineMyNewJob(agenda) {
  agenda.define('my-new-job', { concurrency: 1 }, async (job) => {
    const { someParam } = job.attrs.data;

    logger.info({ someParam }, 'Running my new job');

    // ... your job logic here ...

    logger.info('My new job completed');
  });
}
```

**Parameters:**
- First arg to `agenda.define()`: the job name (string, used everywhere to reference this job)
- `concurrency`: how many instances of this job can run in parallel (use `1` for orchestrators, higher for leaf jobs)
- `job.attrs.data`: the payload passed when the job was created

### Step 2: Register the job

Add it to `src/jobs/index.js`:

```js
import defineMyNewJob from './myNewJob.js';

export function registerAllJobs(agenda) {
  // ... existing jobs ...
  defineMyNewJob(agenda);
}
```

### Step 3: Configure retry (optional)

Add an entry in `src/config/agenda.js`:

```js
export const retryConfig = {
  // ... existing entries ...
  'my-new-job': { maxRetries: 3, delay: 60 * 1000, backoff: 'exponential' },
};
```

| Option | Description |
|--------|-------------|
| `maxRetries` | Max number of retry attempts after failure |
| `delay` | Base delay in milliseconds before first retry |
| `backoff` | `'fixed'` (constant delay) or `'exponential'` (delay doubles each retry) |

Exponential example with `delay: 60000` (1 minute):
- Retry 1: 1 minute
- Retry 2: 2 minutes
- Retry 3: 4 minutes
- Retry 4: 8 minutes

### Step 4: Schedule or trigger the job

#### Option A: Recurring schedule (in `src/index.js`)

Add a line after `await agenda.start()`:

```js
// Hourly
await agenda.every('1 hour', 'my-new-job');

// Daily at 6 AM UTC
await agenda.every('0 6 * * *', 'my-new-job');

// Weekly on Fridays at 5 PM UTC
await agenda.every('0 17 * * 5', 'my-new-job');

// Every 15 minutes
await agenda.every('15 minutes', 'my-new-job');

// Every 5 minutes
await agenda.every('5 minutes', 'my-new-job');
```

#### Option B: Trigger from within another job

```js
await agenda.now('my-new-job', { someParam: 'value' });
```

#### Option C: Trigger from the API via `JobQueueService`

```js
import { JobQueueService } from '../services/JobQueueService.js';

await JobQueueService.enqueue('my-new-job', { someParam: 'value' });
```

#### Option D: Make it admin-triggerable

Add it to the allow-list in `api/src/controllers/adminJobController.js`:

```js
const ALLOWED_JOBS = {
  // ... existing jobs ...
  'my-new-job': { params: ['someParam'] },
};
```

Now admins can trigger it via `POST /admin/jobs/trigger`:
```json
{ "jobName": "my-new-job", "data": { "someParam": "value" } }
```

### Step 5: Restart the worker

The worker must be restarted for new job definitions to take effect. In development, `nodemon` handles this automatically.

---

## Scheduling Reference

Agenda supports two scheduling formats:

### Human-readable intervals

```js
await agenda.every('30 seconds', 'job-name');
await agenda.every('5 minutes', 'job-name');
await agenda.every('15 minutes', 'job-name');
await agenda.every('1 hour', 'job-name');
await agenda.every('6 hours', 'job-name');
await agenda.every('1 day', 'job-name');
```

### Cron expressions

```js
// ┌─────── minute (0-59)
// │ ┌───── hour (0-23)
// │ │ ┌─── day of month (1-31)
// │ │ │ ┌─ month (1-12)
// │ │ │ │ ┌ day of week (0-6, 0=Sunday)
// │ │ │ │ │
// * * * * *

await agenda.every('*/5 * * * *', 'job');    // Every 5 minutes
await agenda.every('0 * * * *', 'job');       // Every hour on the hour
await agenda.every('30 2 * * *', 'job');      // Daily at 2:30 AM UTC
await agenda.every('0 3 * * *', 'job');       // Daily at 3:00 AM UTC
await agenda.every('0 9 * * 1', 'job');       // Every Monday at 9:00 AM UTC
await agenda.every('0 0 1 * *', 'job');       // First day of every month, midnight
await agenda.every('0 12 * * 1-5', 'job');    // Weekdays at noon UTC
```

### One-off (immediate) execution

```js
await agenda.now('job-name', { data: 'here' });
```

### Scheduled one-off (delayed)

```js
await agenda.schedule('in 5 minutes', 'job-name', { data: 'here' });
await agenda.schedule('tomorrow at noon', 'job-name', { data: 'here' });
```

### Important: `agenda.every()` is idempotent

Calling `agenda.every('1 hour', 'price-check')` multiple times does NOT create duplicate schedules. It updates the existing recurring job. This is safe to call on every worker startup.

---

## Deployment

### Render.com (Background Worker)

| Setting | Value |
|---------|-------|
| Service type | Background Worker |
| Build command | `npm install` |
| Start command | `node worker/src/index.js` |
| Health check path | `/health` |
| Health check port | `7003` |
| Instance | Starter ($7/mo) or higher |

### Required environment variables

Copy from `.env.example` and fill in production values. At minimum:
- `MONGODB_URI` (same database as the API)
- `NODE_ENV=production`
- `FRONTEND_URL` (production URL for email links)

For email: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `FROM_EMAIL`
For Stripe: `MOCK_BILLING=false`, `STRIPE_SECRET_KEY`, all `STRIPE_PRICE_*`

### Graceful shutdown

On `SIGTERM` or `SIGINT`, the worker:
1. Stops accepting new jobs
2. Waits for in-progress jobs to finish
3. Closes the health check server
4. Exits with code 0

Render sends `SIGTERM` during deploys, so in-progress jobs complete before the old instance shuts down.

### Monitoring

- **Health check:** `GET /health` returns `{ status: "ok", uptime: 12345 }`
- **Logs:** Pino JSON logs in production — structured, filterable, compatible with log aggregators
- **Job history:** `GET /admin/jobs/recent` shows recent jobs with status, timing, and failure info
- **MongoDB:** The `agendaJobs` collection can be queried directly for debugging
