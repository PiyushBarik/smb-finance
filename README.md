<div align="center">

# ClarityBooks

**GST reconciliation · AI CFO insights · Shopify payouts · Team management**  
*Built for Indian SMBs, D2C brands, and Shopify sellers.*

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://python.org)
[![Recharts](https://img.shields.io/badge/Recharts-2.12-22b5bf)](https://recharts.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

</div>

---

## What it does

Upload a Shopify payout CSV or bank statement → ClarityBooks categorises every transaction, reconciles GST, generates a P&L, and surfaces AI-powered CFO insights — all in under 60 seconds.

| Feature | Detail |
|---|---|
| **Auto-categorisation** | 10 expense buckets (COGS, Payroll, Ads, GST…) |
| **GST reconciliation** | CGST / SGST / IGST per category, ITC summary |
| **AI CFO insights** | Claude-powered narrative — margin trends, anomalies, GST gaps |
| **Monthly trend chart** | Composed bar + net line, gradient fills, INR axis labels |
| **Expense breakdown** | Hover-synced donut + ranked list with mini bars |
| **By-category bars** | Per-category colours, sorted horizontal bar chart |
| **P&L export** | Excel (.xlsx) with formatted INR — Pro plan |
| **Email reports** | Scheduled P&L to your CA — Pro plan |
| **Stripe billing** | 4 plans (Free → Starter → Pro → Business); demo-mode upgrade for local testing |
| **Team management** | Invite by email, 3 roles (owner / admin / viewer), 7-day tokens |
| **API keys** | Named keys (`cb_live_…`), shown once, revocable — Business plan |
| **Audit log** | Last 50 events per org |

---

## Screenshots

> Dashboard · By Category · Expense Breakdown · Monthly Trend

The UI uses **Instrument Serif** (display headings) + **Manrope** (body) + **JetBrains Mono** (numbers) — all loaded from Google Fonts. Background: `#0a0e1a` with grain overlay + sky radial glow.

---

## Quick Start

### Option A — Local (SQLite, no Docker)

```bash
# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # edit SECRET_KEY at minimum
alembic upgrade head          # creates all tables + seeds plans
uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

- **App** → http://localhost:3000  
- **API docs** → http://localhost:8000/docs  
- **Health** → http://localhost:8000/health

### Option B — Docker Compose (Postgres + all services)

```bash
docker compose up --build
```

Postgres data persists in the `pgdata` Docker volume.  
Override env vars in `docker-compose.yml` before going to production (see [Production checklist](#production-checklist)).

---

## Environment Variables

### Backend — `backend/.env`

```env
# Required
SECRET_KEY=change-me-use-openssl-rand-hex-32

# Database (defaults to SQLite for local dev)
DATABASE_URL=sqlite:///./smb_finance.db
# DATABASE_URL=postgresql://smb:secret@localhost:5432/smb_finance

# CORS
CORS_ALLOW_ALL=true                        # set false in prod
CORS_ORIGINS=http://localhost:3000         # comma-separated

# Optional — AI insights (falls back to rule-based if unset)
ANTHROPIC_API_KEY=sk-ant-...

# Optional — Stripe billing (demo-mode upgrade works without this)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...

# Optional — email reports
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASSWORD=app-password
EMAIL_FROM=ClarityBooks <you@gmail.com>

# Optional
DEBUG=true
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Testing Premium Features (Demo Mode)

No Stripe key? That's fine. In demo mode, clicking **Upgrade to Pro** on the billing page
**actually writes the plan to the database**, so you can test every gated feature immediately:

- Excel P&L export (`/reports`)
- Email report dispatch (`/reports`)
- API key creation (`/settings`)

To revert, click **Cancel subscription** on the same page.

---

## CSV Format

ClarityBooks auto-detects column names. The only required column is one of:

```
amount  |  total  |  net  |  price
```

Optional but recommended:

```
date          →  date  |  posted  |  txn_date
description   →  description  |  narration  |  particulars
currency      →  currency  |  ccy
```

### Example

```csv
date,description,amount,currency
2024-03-01,Google Ads Campaign,-15000,INR
2024-03-02,Shopify Payout,85000,INR
2024-03-03,Delhivery Courier,-3200,INR
2024-03-04,AWS Invoice,-4500,INR
```

Negative = expense, Positive = income. Shopify payout CSVs are natively supported — just select **Shopify Payout** as the source type on the upload page.

---

## Architecture

```
smb-finance/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI routers
│   │   │   ├── auth.py          # register, login, /me
│   │   │   ├── orgs.py          # CRUD + GSTIN validation
│   │   │   ├── transactions.py  # upload, list, summary, export, reconcile
│   │   │   ├── reports.py       # P&L, GST summary, Excel export, email
│   │   │   ├── invites.py       # team invites + member management
│   │   │   ├── api_keys.py      # API key CRUD
│   │   │   ├── audit.py         # audit log
│   │   │   └── billing.py       # plans, Stripe checkout, webhook, cancel
│   │   ├── core/
│   │   │   ├── config.py        # pydantic-settings
│   │   │   └── deps.py          # get_db, get_current_user
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── services/
│   │   │   ├── categoriser.py   # rules-based expense categoriser
│   │   │   ├── llm_insights.py  # Claude API → CFO insight strings
│   │   │   ├── billing.py       # plan enforcement + Stripe + demo mode
│   │   │   ├── excel_export.py  # openpyxl P&L workbook
│   │   │   └── email_sender.py  # aiosmtplib + Jinja2 templates
│   │   └── main.py
│   ├── alembic/                 # DB migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── dashboard/page.tsx   # KPI cards, chart tabs, AI insights rail
│   │   ├── transactions/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── reconcile/page.tsx
│   │   ├── upload/page.tsx
│   │   ├── billing/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── components/
│   │   ├── ExpenseChart.tsx     # MonthlyTrendChart, ExpenseBarChart, ExpensePieChart
│   │   ├── Nav.tsx
│   │   ├── Charts.tsx           # re-exports for dynamic() import
│   │   ├── Skeleton.tsx
│   │   ├── Toast.tsx
│   │   ├── Badge.tsx
│   │   ├── StatCard.tsx
│   │   └── OrgSelector.tsx
│   ├── lib/api.ts               # apiFetch, apiUpload, apiDownload, setToken
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## API Reference

### Auth
```
POST /api/auth/register    { name, email, password }
POST /api/auth/login       { email, password }
GET  /api/auth/me
```

### Organisations
```
GET    /api/orgs/
POST   /api/orgs/                    { name, gst_number? }
PATCH  /api/orgs/{id}                { name?, gst_number? }
POST   /api/orgs/validate-gstin      { gstin }
```

### Transactions
```
POST   /api/transactions/upload/{org_id}          multipart/form-data: file, source
GET    /api/transactions/list/{org_id}             ?page&page_size&search&category&date_from&date_to
GET    /api/transactions/summary/{org_id}          ?date_from&date_to
GET    /api/transactions/gst-summary/{org_id}      ?date_from&date_to
GET    /api/transactions/export/{org_id}           ?date_from&date_to  → CSV download
POST   /api/transactions/reconcile/{org_id}        ?source_batch_id&bank_batch_id
PATCH  /api/transactions/{id}/category             { category }
GET    /api/transactions/batches/{org_id}
DELETE /api/transactions/batches/{org_id}/{id}
GET    /api/transactions/categories
```

### Reports (Pro)
```
GET  /api/reports/pl/{org_id}             ?date_from&date_to
GET  /api/reports/export-excel/{org_id}   ?date_from&date_to  → .xlsx download  [Pro]
POST /api/reports/send-email/{org_id}     { email, date_from?, date_to? }        [Pro]
```

### Team
```
POST   /api/invites/{org_id}              { email, role }
GET    /api/invites/{org_id}
POST   /api/invites/accept                { token }
DELETE /api/invites/revoke/{id}
GET    /api/invites/{org_id}/members
PATCH  /api/invites/{org_id}/members/{id} ?role=admin|viewer
DELETE /api/invites/{org_id}/members/{id}
```

### API Keys (Business)
```
GET    /api/api-keys/{org_id}
POST   /api/api-keys/{org_id}             { name }
DELETE /api/api-keys/{org_id}/{key_id}
```

### Audit
```
GET /api/audit/{org_id}                   last 50 events
```

### Billing
```
GET  /api/billing/plans
GET  /api/billing/subscription
POST /api/billing/checkout                { plan_name, billing_cycle }
POST /api/billing/webhook                 (Stripe webhook — no auth)
POST /api/billing/cancel
```

---

## Pricing Plans

| | Free | Starter | Pro | Business |
|---|---|---|---|---|
| **Price/month** | ₹0 | ₹499 | ₹999 | ₹2,499 |
| **Price/year** | ₹0 | ₹4,990 | ₹9,990 | ₹24,990 |
| Organisations | 1 | 2 | 5 | Unlimited |
| Transactions/month | 500 | 5,000 | 25,000 | Unlimited |
| Team members | 1 | 3 | 10 | Unlimited |
| AI CFO Insights | ✗ | ✅ | ✅ | ✅ |
| Excel P&L Export | ✗ | ✗ | ✅ | ✅ |
| Email Reports | ✗ | ✗ | ✅ | ✅ |
| API Access | ✗ | ✗ | ✗ | ✅ |

Yearly billing saves ~17%.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Backend framework** | FastAPI | 0.111 |
| **Language** | Python | 3.11 |
| **ORM** | SQLAlchemy | 2.0 |
| **Migrations** | Alembic | 1.13 |
| **Database** | SQLite (local) · PostgreSQL 16 (Docker/prod) | — |
| **Auth** | python-jose JWT + bcrypt | — |
| **Rate limiting** | slowapi | 0.1.9 |
| **AI insights** | Anthropic Claude (claude-sonnet-4-20250514) | — |
| **Email** | aiosmtplib + Jinja2 | — |
| **Excel export** | openpyxl | 3.1 |
| **Payments** | Stripe | 10.3 |
| **Frontend framework** | Next.js | 15.1 |
| **UI library** | React | 18.3 |
| **Charts** | Recharts | 2.12 |
| **Icons** | lucide-react | 0.447 |
| **Styling** | Tailwind CSS | 3.4 |
| **Type safety** | TypeScript | 5 |
| **Containerisation** | Docker + Docker Compose | — |

---

## Chart Implementation Notes

All three dashboard charts use `ResponsiveContainer` from Recharts with **explicit pixel heights** — this prevents the blank-chart bug that occurs when `height="100%"` is passed inside a CSS grid cell with no resolved height.

### Data key mapping (critical)

| Chart | Component | Recharts `dataKey` | Backend field |
|---|---|---|---|
| Monthly Trend | `MonthlyTrendChart` | `income`, `expense`, `net` | `income`, `Math.abs(expenses)`, `net` |
| By Category | `ExpenseBarChart` | `value` | `Math.abs(total)` |
| Expense Breakdown | `ExpensePieChart` | `absVal` | `Math.abs(total)` |

The bar chart uses `"value"` and the donut uses `"absVal"` — different keys on the same data object — so the shared `ChartTooltip` can distinguish which chart fired it.

### Known Recharts 2.12.x fixes applied

- `minPointSize={2}` on all `<Bar>` — prevents crash when a data point is exactly 0
- `isAnimationActive={false}` on `<Pie>` — prevents blank donut when container width resolves late
- `cx="50%"` and `cy="50%"` (string percentages) on `<Pie>` — resolved correctly inside `ResponsiveContainer`

---

## Development Workflow

```bash
# Run both in parallel
cd backend && uvicorn app.main:app --reload --port 8000 &
cd frontend && npm run dev
```

### Adding a new expense category

1. `backend/app/services/categoriser.py` — add keyword patterns to `CATEGORY_RULES`
2. `frontend/app/transactions/page.tsx` — add to `CATEGORIES` array
3. `frontend/components/Badge.tsx` — add a colour to `CAT_COLORS`

### Adding a migration

```bash
cd backend
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

### Running with a real Anthropic key

Set `ANTHROPIC_API_KEY` in `backend/.env`. The `generate_llm_insights()` service in
`backend/app/services/llm_insights.py` will automatically use Claude instead of the
rule-based fallback. No other changes needed.

---

## Production Checklist

- [ ] `SECRET_KEY` — generate with `openssl rand -hex 32`
- [ ] `DATABASE_URL` — point to Postgres, not SQLite
- [ ] `CORS_ALLOW_ALL=false` + `CORS_ORIGINS=https://yourdomain.com`
- [ ] `DEBUG=false`
- [ ] Set all `STRIPE_*` variables and register webhook endpoint in Stripe dashboard  
      → `https://yourdomain.com/api/billing/webhook`
- [ ] Set `ANTHROPIC_API_KEY` for live AI insights
- [ ] HTTPS via nginx + certbot or a managed proxy (Render, Railway, Fly.io)
- [ ] Automated daily Postgres backups (`pg_dump` cron or managed backup)
- [ ] Error tracking — Sentry (`sentry-sdk[fastapi]`) recommended
- [ ] Set Postgres `max_connections` and connection pooling (pgBouncer) for >50 users

---

## Roadmap

| Phase | Status | What |
|---|---|---|
| **1** | ✅ Done | Auth · Upload · Dashboard · Ledger · Reports · Reconcile · GST |
| **2** | ✅ Done | Postgres · Alembic · Team invites · API keys · Audit log · CORS |
| **3** | ✅ Done | Stripe billing · LLM insights · Excel export · Email reports · SaaS UI |
| **4** | 🔜 Next | Shopify API sync (auto-pull payouts) · WhatsApp digest · Tally export |
| **5** | 🔜 Later | Mobile app (React Native) · Multi-currency · Bank API (Account Aggregator) |

---

## Contributing

```bash
# Fork → branch → PR
git checkout -b feat/your-feature
# Make changes, then:
cd backend && python -m pytest          # backend tests
cd frontend && npm run lint             # frontend lint
```

Please open an issue first for large changes.

---

## License

MIT © 2025 ClarityBooksuvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

- App → http://localhost:3000  
- API docs → http://localhost:8000/docs

### Docker Compose (Postgres + backend + frontend)

```bash
docker compose up --build
```

Postgres data is persisted in the `pgdata` Docker volume.

---

## Test CSV Files

See `sample-data/` for ready-to-upload test files:

| File | Upload type | Purpose |
|---|---|---|
| `shopify-april-2024.csv` | Shopify Payout | Dashboard, charts, insights |
| `shopify-may-2024.csv`   | Shopify Payout | Monthly trend (upload after April) |
| `bank-statement-april-2024.csv` | Bank Statement | Reconcile against April |

**Recommended flow:**  
Upload April → Upload May → Dashboard → Reports → Upload Bank → Reconcile

---

## Feature List

### Auth & Orgs
- Register / login (JWT, bcrypt)
- Multi-organisation — unlimited
- GSTIN validation (all 37 Indian states)
- Org settings — name, GSTIN update

### Transactions
- CSV upload — Shopify, bank, manual
- Auto-column detection (amount/date/description)
- Up to 50,000 rows, 10 MB per upload
- 10 expense categories (rules-based)
- Inline category editing
- Paginated ledger — search, filter, date range
- CSV export (filtered)

### Reports & Insights
- P&L Statement (by period or FY)
- GST Input Tax Credit summary — CGST/SGST breakdown
- Monthly income vs expenses trend chart
- CFO insights — Indian SMB benchmarks (salary ratio, ad spend %, GST compliance)

### Reconciliation
- Batch-vs-batch matching (Shopify vs bank)
- Match rate score
- Collapsible detail table — matched / unmatched source / unmatched bank

### Team (Phase 2)
- Invite team members by email (owner or admin only)
- 3 roles: owner · admin · viewer
- 7-day invite tokens with one-time accept
- Remove members, change roles
- Cannot remove last owner

### API Keys (Phase 2)
- Create named API keys (`cb_live_…` prefix)
- Shown in full only once on creation
- Revoke anytime
- Viewer-blocked (admin/owner only)

### Audit Log (Phase 2)
- Logs: api_key.create, api_key.revoke, upload.csv, reconcile.run, invite.create, invite.accept, member.remove
- Filterable by action, last 50 events shown

---

## API Reference (key endpoints)

```
POST  /api/auth/register
POST  /api/auth/login
GET   /api/auth/me

GET   /api/orgs/
POST  /api/orgs/
PATCH /api/orgs/{id}
POST  /api/orgs/validate-gstin

POST  /api/transactions/upload/{org_id}
GET   /api/transactions/list/{org_id}       ?page&search&category&date_from&date_to
GET   /api/transactions/summary/{org_id}    ?date_from&date_to
GET   /api/transactions/gst-summary/{org_id}
GET   /api/transactions/export/{org_id}
POST  /api/transactions/reconcile/{org_id}  ?source_batch_id&bank_batch_id
PATCH /api/transactions/{id}/category
GET   /api/transactions/batches/{org_id}
GET   /api/transactions/categories

POST  /api/invites/{org_id}           # create invite
GET   /api/invites/{org_id}           # list pending
POST  /api/invites/accept             # accept invite
DELETE /api/invites/revoke/{id}       # revoke invite
GET   /api/invites/{org_id}/members
PATCH /api/invites/{org_id}/members/{id}  ?role=
DELETE /api/invites/{org_id}/members/{id}

GET   /api/api-keys/{org_id}
POST  /api/api-keys/{org_id}
DELETE /api/api-keys/{org_id}/{key_id}

GET   /api/audit/{org_id}

GET   /health
```

---

## Production Checklist

- [ ] Set `SECRET_KEY` to a 32-byte random hex string (`openssl rand -hex 32`)
- [ ] Switch `DATABASE_URL` to Postgres
- [ ] Set `CORS_ALLOW_ALL=false` and set `CORS_ORIGINS` to your domain
- [ ] Set `DEBUG=false`
- [ ] Configure HTTPS (nginx + certbot or managed proxy)
- [ ] Set up automated DB backups
- [ ] Add Sentry or similar for error tracking

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI · Python 3.11 · SQLAlchemy 2 |
| Migrations | Alembic |
| Database | SQLite (local) · Postgres 16 (Docker/prod) |
| Auth | JWT · bcrypt |
| Rate limiting | slowapi |
| Frontend | Next.js 15 · React 18 · Tailwind CSS |
| Charts | Recharts 2.12 |
| Icons | lucide-react |
| Deployment | Docker + Docker Compose |
