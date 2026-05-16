# ClarityBooks — SMB Finance Clarity

> GST reconciliation · Expense categorisation · CFO insights · Team management  
> Built for Indian SMBs, Shopify sellers, and growing startups.

---

## Phase Status

| Phase | What | Status |
|---|---|---|
| **1** | Core MVP — auth, upload, dashboard, ledger, reports, reconcile, GST | ✅ Done |
| **2** | Postgres, Alembic, team invites, API keys, audit log, CORS fix | ✅ Done |
| **3** | Shopify API sync, LLM insights, email reports, Tally export | 🔜 Next |
| **4** | Stripe billing, production deploy, mobile app | 🔜 Later |

---

## Quick Start

### Local (no Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head           # creates all tables
uvicorn app.main:app --reload --port 8000

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
