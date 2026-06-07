# Smart Report Engine — Roadmap & Future Phases

This document outlines the complete roadmap for the Smart Report ecosystem: the report engine, admin portal, and client portal.

---

## System Overview (3 Projects)

```
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas                            │
│                (smart_report_engine database)                 │
│          ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│          │ reports  │  │ clients  │  │  users   │          │
│          └────┬─────┘  └────┬─────┘  └────┬─────┘          │
└───────────────┼──────────────┼──────────────┼───────────────┘
                │              │              │
      ┌─────────┴───┐    ┌────┴──────────────┴──┐
      │             │    │                       │
┌─────▼─────┐  ┌───▼────▼────────┐    ┌────────▼────────┐
│ Project 1 │  │   Project 2      │    │   Project 3      │
│ Report    │  │   Portal API     │    │   Portal Frontend│
│ Engine    │  │   (Admin+Client) │    │   (React app)    │
│ (Lambda)  │  │   (Lambda/EC2)   │    │   (Vercel/S3)    │
└───────────┘  └──────────────────┘    └──────────────────┘
      ↑               ↑                       ↑
API Gateway 1    API Gateway 2          Static Hosting
(report gen)     (portal APIs)          (dashboard UI)
```

---

## Project 1: Smart Report Engine (THIS PROJECT)

### Status: Core Complete ✅

### Remaining Phases

#### Phase: S3 Upload
- Upload generated PDF to AWS S3
- Store S3 URL in report document
- If PDF < 4MB → return base64 in response
- If PDF >= 4MB → return S3 URL only
- S3 folder structure: `{tenantId}/{year}/{month}/{day}/{labNo}.pdf`

**Needs:** AWS S3 bucket, IAM credentials

#### Phase: Lambda Deployment
- Deploy `handler.ts` to AWS Lambda
- Configure API Gateway (POST /reports/generate)
- Set up environment variables (MONGODB_URI, S3 bucket)
- Use Lambda Layer for Chromium (Puppeteer)
- Memory: 1536 MB, Timeout: 60 seconds

**Needs:** AWS account, Lambda setup, API Gateway

#### Phase: Error Notifications
- Send email/Slack notification when report fails
- Send notification when client credits are low (< 100)
- Send notification for unmapped parameters (new tests detected)
- Daily digest: reports generated, failures, credits used

#### Phase: Historical Data Support
- Accept `pastObservation` array in input
- Store historical values per patient per parameter
- Pass to rendering for trend charts
- Query: Get all past reports for a patient

#### Phase: Visual Rendering Enhancements
- Color-coded cards (normal/borderline/high/critical)
- SVG sliders showing value position in range
- Card layouts (full/half/third width)
- Body summary with organ icons
- Profile-level tips

#### Phase: Print PDF (Grayscale)
- Generate separate grayscale PDF for lab printing
- No color, optimized for black & white printers
- Return both URLs (digital + print)

---

## Project 2: Portal API (NEW PROJECT — Separate)

### Purpose
Lightweight API server for admin dashboard and client portal. Reads/writes the same MongoDB database. No Puppeteer, no Chrome — just database operations.

### Tech Stack
| Layer | Tech |
|-------|------|
| Language | TypeScript |
| Framework | Fastify or Express |
| Database | Same MongoDB Atlas (smart_report_engine) |
| Auth | JWT tokens (access + refresh) |
| Deployment | AWS Lambda (light) or EC2 |
| Memory | 256 MB (lightweight) |

### Collections (Additional)

#### `users` — Admin and client users
```
userId, email, password (hashed), role (admin/client)
tenantId (null for admin, set for client users)
name, phone, lastLogin, isActive
createdAt, updatedAt
```

### API Routes

#### Authentication
| Route | Method | Description |
|-------|--------|-------------|
| `/auth/register` | POST | Create user (admin only) |
| `/auth/login` | POST | Login, returns JWT |
| `/auth/refresh` | POST | Refresh expired token |
| `/auth/me` | GET | Get current user info |

#### Admin APIs (role: admin)
| Route | Method | Description |
|-------|--------|-------------|
| `/admin/dashboard` | GET | Stats: total clients, reports today, failures, credits |
| `/admin/clients` | GET | List all clients (with filters, pagination) |
| `/admin/clients/:tenantId` | GET | Client details + recent reports |
| `/admin/clients` | POST | Onboard new client |
| `/admin/clients/:tenantId` | PATCH | Update client (config, status, credits) |
| `/admin/clients/:tenantId/credits` | POST | Add credits + record payment |
| `/admin/clients/:tenantId/toggle` | POST | Enable/disable client |
| `/admin/reports` | GET | List all reports (filters: tenant, date, status) |
| `/admin/reports/:id` | GET | Report details (patient, abnormals, PDF link) |
| `/admin/reports/failures` | GET | Failed reports only |
| `/admin/reports/unmapped` | GET | Reports with unmapped parameters |

#### Client APIs (role: client, scoped to their tenantId)
| Route | Method | Description |
|-------|--------|-------------|
| `/client/dashboard` | GET | My stats: reports generated, credits left |
| `/client/reports` | GET | My reports (with date filter, pagination) |
| `/client/reports/:labNo` | GET | Report detail (patient, abnormals, PDF link) |
| `/client/credits` | GET | My credit history |
| `/client/profile` | GET | My lab info |
| `/client/profile` | PATCH | Update contact info |

### Role-Based Access

```
Super Admin → Can see/do everything for all clients
Client User → Can only see their own data (scoped by tenantId)
Lab API Key → Only report generation (no dashboard access)
```

### Phases

| Phase | What | Effort |
|-------|------|--------|
| Portal API Phase 1 | Project setup, auth (register/login/JWT), user collection | 1 session |
| Portal API Phase 2 | Admin read APIs (dashboard, list clients, list reports) | 1 session |
| Portal API Phase 3 | Admin write APIs (onboard, update, credits) | 1 session |
| Portal API Phase 4 | Client APIs (their reports, their credits, their profile) | 1 session |
| Portal API Phase 5 | Deploy to Lambda/EC2 | 1 session |

---

## Project 3: Portal Frontend (NEW PROJECT — Separate)

### Purpose
React web application for both admin and client users. Calls Project 2 APIs.

### Tech Stack
| Layer | Tech |
|-------|------|
| Framework | React (Vite) or Next.js |
| Styling | Tailwind CSS |
| State | React Query (for API calls) |
| Charts | Chart.js or Recharts |
| Tables | TanStack Table |
| Hosting | Vercel or S3 + CloudFront |

### Pages

#### Login
- Email + password
- Redirects to admin or client dashboard based on role

#### Admin Dashboard
- Cards: Total clients, Reports today, Failures today, Low credits alerts
- Chart: Reports per day (last 30 days)
- Recent failures list
- Quick actions: Onboard client, View all reports

#### Admin: Clients List
- Table: Lab Name, Tenant ID, Status (Live/Inactive), Credits, Total Reports, Last Report
- Search, filter by status
- Click row → Client detail

#### Admin: Client Detail
- Info card: Name, email, phone, plan, dates
- Credits card: Total / Used / Remaining (progress bar)
- Payment history table
- Config editor (toggle features, change colors)
- Recent reports table
- Actions: Add credits, Enable/Disable, Edit config

#### Admin: Reports List
- Table: LabNo, Patient, Client, Date, Status, Abnormals count
- Filters: Client dropdown, Date range, Status (completed/failed)
- Click row → Report detail

#### Admin: Report Detail
- Patient info (name, age, gender, referred by)
- Mapping stats (total, mapped, unmapped)
- Abnormal parameters table (highlighted in red)
- Unmapped parameters (if any)
- PDF download link
- Webhook dispatch status

#### Client Dashboard
- Welcome card with lab name
- Credits remaining (big number)
- Reports this month / total
- Chart: Reports per day (last 30 days)
- Recent reports table

#### Client: My Reports
- Table: LabNo, Patient, Date, Abnormals
- Date filter
- Download PDF

### Phases

| Phase | What | Effort |
|-------|------|--------|
| Frontend Phase 1 | Project setup, routing, login page, auth flow | 1 session |
| Frontend Phase 2 | Admin dashboard + clients list | 1-2 sessions |
| Frontend Phase 3 | Client detail page + reports list | 1-2 sessions |
| Frontend Phase 4 | Client portal (their dashboard + reports) | 1 session |
| Frontend Phase 5 | Polish, responsive, deploy to Vercel | 1 session |

---

## Complete Timeline (Suggested Order)

| Priority | What | Project |
|----------|------|---------|
| 1 | S3 upload + Lambda deployment | Project 1 (Engine) |
| 2 | Portal API — Auth + Admin read APIs | Project 2 (API) |
| 3 | Portal API — Admin write + Client APIs | Project 2 (API) |
| 4 | Frontend — Login + Admin dashboard | Project 3 (Frontend) |
| 5 | Frontend — Client portal | Project 3 (Frontend) |
| 6 | Error notifications | Project 1 (Engine) |
| 7 | Historical data | Project 1 (Engine) |
| 8 | Visual rendering enhancements | Project 1 (Engine) |
| 9 | Print PDF | Project 1 (Engine) |

---

## Key Design Principles

1. **Same database, different services** — All projects read/write the same MongoDB. No data duplication.

2. **Independent deployment** — Engine, API, and Frontend deploy separately. A change to the admin dashboard doesn't touch report generation.

3. **Role-based from day one** — Admin sees everything, client sees only their data. Built into JWT claims.

4. **Client config in DB** — No code deploy needed to change a client's colors, features, or mapping.

5. **Credits system** — Every report costs 1 credit. No credits = no generation. Simple billing model.

6. **Fire and forget** — DB saves and webhooks don't block the PDF response. Report generation is always fast.
