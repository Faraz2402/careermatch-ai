# CareerMatch AI

Upload a resume and get a structured, editable profile, a shareable public profile page, ranked job matches from compliant sources, tailored application materials you can review and export, an applications board, alerts and mock interviews.

**Live site:** https://careermatch-ai-ten.vercel.app

## Quick start

```bash
npm install
cp .env.example .env          # then edit as needed
npx prisma db push            # creates prisma/dev.db (SQLite)
npm run dev                   # http://localhost:3000
```

Click **Try Demo** on the landing page to explore with a fictional resume.

> **TLS-inspecting networks:** if job sources or Google Fonts fail with `unable to verify the first certificate`, start the server with `NODE_OPTIONS=--use-system-ca` (Node 22+).

Everything optional degrades gracefully. Without each key:

| Missing | What happens instead |
| --- | --- |
| Claude or Gemini key | Rule-based parser and template drafts, both labelled in the UI |
| Voyage key | Lexical similarity plus role-family matching |
| Resend key | Emails go to the dev outbox at `/dev/outbox` |
| Razorpay keys | Pricing page says payments aren't set up |
| Google keys | The Google sign-in button is hidden |
| Redis | Rate limits are kept in memory |

## Stack

- Next.js 15 (App Router) and TypeScript
- Tailwind CSS v4 with token-based dark mode
- Prisma, using SQLite in dev. Switch the provider to `postgresql` for production; JSON is stored as TEXT so the schema stays portable.
- Anthropic TypeScript SDK (`claude-opus-5-5`)
- `unpdf` + `mammoth` to read uploads; `pdf-lib` + `docx` to export
- Razorpay (UPI, cards, net banking, wallets), Vitest

## Features by page

| Route | What it does |
| --- | --- |
| `/` | Landing page with **Upload Resume** and **Try Demo** |
| `/pricing` | Free plan and prepaid Pro passes (1 or 12 months) in INR via Razorpay Checkout: UPI apps, Visa/Mastercard/RuPay/Amex/Diners cards, net banking (live bank list), wallets |
| `/signup`, `/login`, `/forgot-password`, `/reset-password` | Email + password or **Google** sign-in. Verification and reset links are sent by email. |
| `/onboarding` | PDF/DOCX upload with drag-and-drop, or pasted text. Imports **LinkedIn "Save to PDF"** exports. Shows progress, then an editable review of the parsed data. |
| `/dashboard` | Health, ATS and completeness scores; usage this month; next actions (including overdue follow-ups); recent documents; pipeline. Matches stream in after the rest of the page. |
| `/jobs` | Search and filters, save/hide/track, pagination. **Save search** creates email alerts. On desktop a **split-view preview** opens beside the list. Hovering a score shows how it was built. |
| `/jobs/[id]` | Score breakdown, **salary insights** against similar roles, tracker (applied and follow-up dates, contact, which resume was sent), and the application toolkit. |
| Application toolkit | Match analysis, missing-skills report and talking points for the job. |
| `/studio` | **Make Resume & Cover Letter** (Canva-style workspace). Paste a job or pick a saved one; keyword gap with quoted evidence (exact / equivalent / partial / missing / unclear, grouped Must-have, Preferred, Tools, Domain, Behavioural); per-bullet rewrites with reasons that are accepted, edited or rejected one by one; a truthfulness guard that drops proposals adding figures or unconfirmed skills; "what to change" plan; cover letter (tone + length); Estimated ATS Alignment before → after (method `ats-align-v1`: 40/15/20/15/10); 52 original templates for India and 40+ markets (ATS-first and Visual, Free and Pro); PDF / Word / plain ATS-first / application pack exports with a pre-export checklist; drafts, duplicate, revision history, undo/redo. Free: one tailored application and the free templates. See `docs/RESUME_STUDIO_PLAN.md`. |
| `/jobs/[id]` → **Tailor résumé & cover letter** | Opens the Studio over the job in the same window; **Back to job description** (or browser Back) returns to the same scroll position. |
| `/jobs/[id]/interview` | Mock interview: 5 questions with feedback after each answer and a summary. Uses Claude, or a question bank when AI isn't configured. |
| `/applications` | Kanban board: drag cards between stages, or use the move menu (keyboard-friendly). Overdue follow-ups are flagged. |
| `/resumes` | Named resume versions, such as "Frontend focus" or "Full-stack" |
| `/alerts` | Saved searches with daily/weekly digests and a **Send now** button |
| `/profile`, `/p/[slug]` | Profile builder and public page: 3 themes, view counter, **Resume PDF** download, social preview image, per-section privacy |
| `/tools` | **Save to CareerMatch** bookmarklet. The import is always confirmed with a click on `/import`. |
| `/settings` | Email verification, password, plan and usage, Pro expiry and payment history, **download all my data**, **delete account** |
| `/admin` | Admins only (`ADMIN_EMAILS`): source enable/disable, board tokens, run now, health and failures, integration status |
| `/sources` | Sourcing policy plus live per-source health |

## Architecture notes

### Ingestion

- `src/lib/jobs/ingest.ts` fetches each source on its own cache schedule and rate limit, and upserts listings with `firstSeenAt` and `lastSeenAt`.
- It records every attempt in `SourceRun`, which powers caching and health.
- Search is a database query (`src/lib/jobs/service.ts`) followed by in-memory scoring. Per-listing analysis is cached, so warm searches return in about 300ms.
- Listings a source hasn't returned in 7 days drop out of search.
- **Scheduling:** `src/instrumentation-node.ts` runs refresh every 15 minutes, alerts hourly and cleanup every 6 hours on long-lived servers.
- On serverless hosts, set `BACKGROUND_JOBS=false` and call these from cron with `Authorization: Bearer $CRON_SECRET`:
  - `GET /api/cron/refresh`
  - `GET /api/cron/alerts`
  - `GET /api/cron/cleanup`

### Matching

`src/lib/jobs/rank.ts` scores each job out of 100. Every point maps to a reason or concern shown to the user.

| Part | Points |
| --- | --- |
| Skills | 40 |
| Role/title, including **role families** (a "UI Engineer" counts as a frontend role) | 20 |
| Relevance: Voyage embeddings when `VOYAGE_API_KEY` is set, otherwise text similarity | 10 |
| Seniority | 10 |
| Location | 10 |
| Salary (normalised to yearly USD) | 5 |
| Recency | 5 |
| Learning from the user's own saves and hides | ±5 |

### AI

Claude calls use these settings:

- `claude-opus-5-5` with adaptive thinking
- Structured outputs from Zod schemas
- Streaming for the cover letter and interview
- The server-side refusal fallback (`fallbacks: "default"`)

Prompts forbid inventing experience and treat resume and job text as data, not instructions. Only real AI calls count toward the plan quota (Free: 15 a month, Pro: 400).

### Job sources

Sources are pluggable `SourceDefinition`s in `src/lib/jobs/sources`:

- Remotive and Arbeitnow
- Greenhouse, Lever and Ashby employer boards
- SmartRecruiters (Posting API), Workable (careers-page widget API), SAP SuccessFactors (career-site RSS) and Oracle Recruiting Cloud, Taleo's successor (candidate-experience REST API). SuccessFactors and Oracle hosts are read only where robots.txt allows it; all four keep to `EMPLOYER_BOARD_COUNTRIES` (default India). iCIMS is not supported: it has no public job feed.
- Adzuna
- Remote-job boards through their public APIs / RSS feeds: Remote OK, We Work Remotely, Jobicy, Himalayas, Working Nomads, Real Work From Anywhere and Findwork (free key: `FINDWORK_API_KEY`), plus Remotive and Arbeitnow. Each requires attribution and a direct link back, which every listing has; Himalayas also requires its own apply link and no re-publishing of its jobs (we publish no JobPosting data). Only listings from the last 30 days are kept.
- Jooble (REST API), which runs only when a user searches. Its free key allows 500 requests in total, so the app counts every request and stops at `JOOBLE_MAX_REQUESTS` (default 450). The count is shown in `/admin` and `/sources`.
- Clearly labelled demo data, which is off in production

Access rules:

- Board tokens can be set in `/admin` or in env vars. API keys only ever live in env vars.
- There is no scraping behind logins, CAPTCHAs or robots.txt.
- User link imports go through official APIs or schema.org data. Every redirect hop is checked with DNS resolution against private and internal addresses (SSRF protection).

## Security & privacy

- **Passwords:** bcrypt (cost 12). Changing your password signs out your other sessions.
- **Sessions:** DB-backed, stored only as SHA-256 token hashes. Cookies are httpOnly and SameSite=Lax.
- **Single-use tokens** for password reset (30 minutes) and email verification (24 hours).
- **Encryption at rest:** profile data, raw resume text, resume versions and generated documents use AES-256-GCM (`DATA_ENCRYPTION_KEY`, required in production).
- **Public profiles:** hidden fields are removed on the server before anything renders. Private profiles return 404 to everyone except the owner.
- **Rate limits:** on auth, parsing, search, refresh, import, generation, digests and export. They use Redis when `UPSTASH_*` is set.
- **Data rights:** a full JSON export, and account deletion that cascades. Pro is prepaid, so there is nothing recurring to cancel.
- **Retention:**
  - Demo accounts: 24 hours
  - Stale listings: 30 days
  - Source logs: 14 days
  - Outbox: 7 days
- **Errors:** structured JSON logs. Errors can also be forwarded to `ERROR_WEBHOOK_URL`, a lightweight stand-in for Sentry.
- **Headers:** security headers are set in middleware. Razorpay checkout callbacks and webhooks are HMAC-SHA256 verified, and each payment is re-checked with Razorpay (order, amount, capture) before Pro is granted.

## Testing

```bash
npm test                                        # unit tests (parser, matching, export, crypto, SSRF, …)
E2E_BASE_URL=http://localhost:3000 npm run test:e2e   # API end-to-end against a running server
```

The end-to-end test runs the full user journey:

1. Sign up and paste a resume
2. Save the profile and preferences
3. Import a job and search
4. Generate, review and export (PDF and DOCX), plus the streamed cover letter
5. Track the application and save a search
6. Export the account's data, then delete the account

## Production checklist

- Set `APP_URL`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET` and `ADMIN_EMAILS`.
- Set the optional keys you need (see `.env.example`).
- Switch Prisma to Postgres and run `prisma migrate`.
- Configure Upstash Redis if you run more than one instance.
- Add a Razorpay webhook at `$APP_URL/api/billing/webhook` with a secret (`RAZORPAY_WEBHOOK_SECRET`) for these events:
  - `payment.captured`
  - `order.paid`
- Register each sign-in redirect URI: `$APP_URL/api/auth/oauth/google/callback`, `.../oauth/microsoft/callback`, `.../oauth/linkedin/callback`.
- FX rates for salary insights are static approximations (`src/lib/jobs/salary.ts`) and are labelled "approx." in the UI.
