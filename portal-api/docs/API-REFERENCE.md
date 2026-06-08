# Portal API — Complete API Reference

> **Base URL (Local Development):** `http://localhost:3001`
> **Base URL (Production):** Will be set via environment variable `API_BASE_URL`

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <accessToken>
```

Tokens are obtained via the login endpoint. Access tokens expire in 1 day. Use the refresh endpoint to get a new pair.

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {                    // Only for paginated lists
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }         // Optional: validation errors
  },
  "timestamp": "2026-06-07T14:33:29.898Z"
}
```

---

## 1. AUTH APIs

### POST /auth/login
**Access:** Public (no token required)

Login with email and password. Returns JWT access + refresh tokens.

**Request:**
```json
{
  "email": "admin@smartreport.com",
  "password": "Admin@123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1...",
    "user": {
      "userId": "6a2580c56cf9f9d43a48fd83",
      "email": "admin@smartreport.com",
      "name": "System Admin",
      "role": "superadmin",
      "tenantId": null
    }
  }
}
```

**Errors:**
- `401 INVALID_CREDENTIALS` — wrong email or password
- `403 ACCOUNT_DISABLED` — user is deactivated

**Frontend Usage:**
- Login page form submission
- Store `accessToken` in memory (NOT localStorage for security)
- Store `refreshToken` in httpOnly cookie or secure storage
- Use `user.role` to redirect: admin → `/admin/dashboard`, client → `/client/dashboard`

---

### POST /auth/register
**Access:** Admin/Superadmin only

Create a new user account (admin creates accounts for client users).

**Request:**
```json
{
  "email": "lab@rajagiri.com",
  "password": "Rajagiri@2026",
  "name": "Rajagiri Lab Admin",
  "phone": "+91-9999999999",
  "role": "client",
  "tenantId": "rajagiri"
}
```

**Rules:**
- `role` must be `admin`, `client`, or `lab_staff`
- `tenantId` is REQUIRED for `client` and `lab_staff` roles
- `tenantId` must be null/absent for `admin` and `superadmin` roles
- The tenant must already exist in the `clients` collection
- Email must be unique

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "6a25814b6cf9f9d43a48fd86",
    "email": "lab@rajagiri.com",
    "name": "Rajagiri Lab Admin",
    "role": "client",
    "tenantId": "rajagiri"
  }
}
```

**Frontend Usage:**
- Admin panel → "Create User" modal
- Used when onboarding a new client (create client → then create their login user)

---

### POST /auth/refresh
**Access:** Authenticated (expired access token OK, valid refresh token required)

Get new access + refresh tokens. Implements token rotation (old refresh token is invalidated).

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }
}
```

**Frontend Usage:**
- Axios/fetch interceptor: when a 401 is received, auto-call refresh and retry the original request
- If refresh also fails → redirect to login

---

### GET /auth/me
**Access:** Authenticated

Get current user's profile information.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "6a2580c56cf9f9d43a48fd83",
    "email": "admin@smartreport.com",
    "name": "System Admin",
    "phone": null,
    "role": "superadmin",
    "tenantId": null,
    "isActive": true,
    "lastLoginAt": "2026-06-07T14:33:29.898Z",
    "createdAt": "2026-06-07T14:01:33.706Z"
  }
}
```

**Frontend Usage:**
- Called on app load to verify token validity and get user info
- Populate the header user menu (name, role badge)

---

### PATCH /auth/change-password
**Access:** Authenticated

Change own password.

**Request:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword456"
}
```

**Frontend Usage:**
- Settings page → "Change Password" form

---

## 2. ADMIN APIs

> All `/admin/*` routes require `role: admin` or `role: superadmin`

### GET /admin/dashboard
**Access:** Admin

Overview statistics for the admin home page.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "clients": {
      "total": 5,
      "live": 4,
      "inactive": 1,
      "lowCredits": 1,
      "expiringSoon": 2
    },
    "reports": {
      "total": 1250,
      "today": 45,
      "thisWeek": 210,
      "thisMonth": 890,
      "failuresToday": 2
    },
    "recentFailures": [
      {
        "labNo": "RHH123",
        "tenantId": "rajagiri",
        "errorMessage": "PDF generation timed out",
        "createdAt": "2026-06-07T14:33:29.898Z"
      }
    ]
  }
}
```

**Frontend Usage:**
- Admin dashboard page — stat cards with animated count-up
- "Recent Failures" quick-view list
- `expiringSoon` shows clients whose subscription ends within 7 days

---

### GET /admin/clients
**Access:** Admin

List all clients with filtering, search, and pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | `asc`\|`desc` | `desc` | Sort direction |
| `search` | string | — | Search by tenantId or labName |
| `status` | `live`\|`inactive` | — | Filter by status |
| `plan` | string | — | Filter by plan type |

**Example:** `GET /admin/clients?search=rajagiri&status=live&page=1&limit=10`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6a2551564ac7854700d45955",
      "tenantId": "rajagiri",
      "labName": "Rajagiri Hospital",
      "isLive": true,
      "plan": "pro",
      "remainingCredits": 4997,
      "totalReports": 3,
      "subscriptionEndDate": "2026-08-01T00:00:00.000Z",
      "createdAt": "2026-06-07T11:09:10.686Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

**Frontend Usage:**
- Clients list page — data table with search bar, status pills, pagination

---

### GET /admin/clients/:tenantId
**Access:** Admin

Full client detail including recent reports and stats.

**Example:** `GET /admin/clients/rajagiri`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "client": {
      "tenantId": "rajagiri",
      "labName": "Rajagiri Hospital",
      "contactEmail": "lab@rajagiri.com",
      "plan": "pro",
      "status": "active",
      "subscriptionStartDate": "2026-06-01T00:00:00.000Z",
      "subscriptionEndDate": "2026-08-01T00:00:00.000Z",
      "trialEndDate": "2026-06-05T00:00:00.000Z",
      "liveDate": "2026-06-05T00:00:00.000Z",
      "totalCredits": 5000,
      "usedCredits": 3,
      "remainingCredits": 4997,
      "payments": [...],
      "reportConfig": {...},
      "webhook": {...}
    },
    "recentReports": [...],
    "stats": { "totalReports": 3, "failures": 0 }
  }
}
```

**Frontend Usage:**
- Client detail page — info card, credits progress bar, subscription countdown, payment history table

---

### POST /admin/clients
**Access:** Admin

Onboard a new client.

**Request:**
```json
{
  "tenantId": "apollo-labs",
  "labName": "Apollo Diagnostics",
  "contactEmail": "lab@apollo.com",
  "contactPerson": "Dr. Sharma",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "plan": "pro",
  "initialCredits": 3000,
  "reportType": "inDepth",
  "primaryColor": "#1565C0",
  "subscriptionStartDate": "2026-06-01",
  "subscriptionEndDate": "2026-08-01",
  "trialEndDate": "2026-06-05",
  "trialCredits": 50,
  "autoRenew": true,
  "webViewer": true
}
```

**Required fields:** `tenantId`, `labName`, `subscriptionStartDate`, `subscriptionEndDate`

**Response (201):**
```json
{
  "success": true,
  "data": { "tenantId": "apollo-labs", "labName": "Apollo Diagnostics" }
}
```

**Frontend Usage:**
- "Onboard Client" modal/page with multi-step form

---

### PATCH /admin/clients/:tenantId
**Access:** Admin

Update client info, config, subscription, or webhook.

**Request (partial — only send fields you want to change):**
```json
{
  "labName": "Apollo Diagnostics Pvt. Ltd.",
  "subscriptionEndDate": "2026-09-01",
  "reportConfig": {
    "branding": {
      "primaryColor": "#2D4A9A"
    }
  }
}
```

**Frontend Usage:**
- Client detail → "Edit" drawer/modal
- Config editor (change colors, toggle features)
- Extend subscription date

---

### POST /admin/clients/:tenantId/credits
**Access:** Admin

Add credits to a client (with payment record).

**Request:**
```json
{
  "credits": 1000,
  "amount": 5000,
  "method": "upi",
  "reference": "UPI-TXN-123456",
  "note": "June 2026 recharge"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Added 1000 credits to rajagiri.",
    "newBalance": 5997
  }
}
```

**Frontend Usage:**
- Client detail → "Add Credits" modal with amount, method, reference fields

---

### POST /admin/clients/:tenantId/toggle
**Access:** Admin

Enable or disable a client (toggles `isLive`).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tenantId": "rajagiri",
    "isLive": false,
    "message": "Client disabled successfully."
  }
}
```

**Frontend Usage:**
- Client detail → toggle switch or "Disable Client" button with confirmation

---

### GET /admin/reports
**Access:** Admin

List all reports across all clients.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `tenantId` | string | Filter by client |
| `status` | `completed`\|`failed` | Filter by status |
| `source` | `json`\|`fhir`\|`hl7` | Filter by input source |
| `search` | string | Search by labNo or patientName |
| `from` | date string | Start date (YYYY-MM-DD) |
| `to` | date string | End date (YYYY-MM-DD) |
| `hasAbnormals` | `true` | Only reports with abnormal results |
| `sortBy` | string | Sort field (default: createdAt) |
| `sortOrder` | `asc`\|`desc` | Sort direction |

**Example:** `GET /admin/reports?tenantId=rajagiri&from=2026-06-01&to=2026-06-07&page=1`

**Frontend Usage:**
- Reports list page — data table with filters dropdown, date range picker

---

### GET /admin/reports/:id
**Access:** Admin

Full report detail. Accepts MongoDB `_id` or `labNo`.

**Response includes:** patient info, all abnormal parameters with profile grouping, mapping stats, PDF link, webhook dispatch status.

**Frontend Usage:**
- Report detail page — patient card, abnormals table (red-highlighted), mapping stats

---

### GET /admin/reports/failures
**Access:** Admin

List only failed reports.

**Frontend Usage:**
- Dashboard "Recent Failures" section, or dedicated failures page

---

### GET /admin/reports/unmapped
**Access:** Admin

Reports that had unmapped parameters (new test codes detected).

**Frontend Usage:**
- Alert page: "These clients have tests we don't recognize — may need mapping updates"

---

### GET /admin/reports/stats
**Access:** Admin

Aggregated chart data for reports.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | number | 30 | Period to aggregate |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "last 30 days",
    "perDay": [
      { "_id": "2026-06-01", "count": 15, "failures": 0 },
      { "_id": "2026-06-02", "count": 22, "failures": 1 }
    ],
    "perTenant": [
      { "_id": "rajagiri", "count": 450 },
      { "_id": "demo", "count": 120 }
    ],
    "perSource": [
      { "_id": "json", "count": 500 },
      { "_id": "hl7", "count": 70 }
    ]
  }
}
```

**Frontend Usage:**
- Dashboard line chart (reports per day)
- Dashboard pie/bar chart (reports per client, per source)

---

### GET /admin/users
**Access:** Admin

List all portal users.

**Query Parameters:** `page`, `limit`, `role`, `tenantId`, `search`

**Frontend Usage:**
- User management page — table with role badges, active/inactive status

---

### PATCH /admin/users/:id
**Access:** Admin

Update a user (disable, change role, update name/phone).

**Request:**
```json
{
  "isActive": false
}
```

**Frontend Usage:**
- User management → disable toggle, role dropdown change

---

### GET /admin/audit-log
**Access:** Admin

View history of admin actions.

**Query Parameters:** `page`, `limit`, `action`, `tenantId`, `userId`, `from`, `to`

**Response includes:** who did what, when, to which client, with what details.

**Frontend Usage:**
- Audit log page — table with action badges, timestamp, description

---

## 3. CLIENT APIs

> All `/client/*` routes require `role: client`
> All data is automatically scoped to the user's `tenantId` from their JWT

### GET /client/dashboard
**Access:** Client

The client's home page data.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "labName": "Rajagiri Hospital",
    "plan": "pro",
    "status": "active",
    "subscription": {
      "startDate": "2026-06-01T00:00:00.000Z",
      "endDate": "2026-08-01T00:00:00.000Z",
      "autoRenew": true,
      "daysRemaining": 55
    },
    "credits": {
      "total": 5000,
      "used": 3,
      "remaining": 4997
    },
    "reports": {
      "total": 3,
      "today": 0,
      "thisMonth": 3
    },
    "recentReports": [...]
  }
}
```

**Frontend Usage:**
- Client dashboard — welcome card, credits gauge, subscription countdown, recent reports

---

### GET /client/reports
**Access:** Client

List the client's own reports (automatically scoped by tenantId).

**Query Parameters:** Same as admin reports — `page`, `limit`, `search`, `status`, `from`, `to`, `sortBy`, `sortOrder`

**Frontend Usage:**
- Client reports page — data table with search and date filter

---

### GET /client/reports/:labNo
**Access:** Client

Full detail of a specific report.

**Frontend Usage:**
- Client report detail — patient info, results, PDF download

---

### GET /client/reports/stats
**Access:** Client

Chart data scoped to the client's reports.

**Query Parameters:** `days` (default: 30)

**Response includes:** `perDay` (reports per day), `severityDistribution`

**Frontend Usage:**
- Client dashboard chart (reports per day), severity donut chart

---

### GET /client/credits
**Access:** Client

Credit balance and payment/recharge history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalCredits": 5000,
    "usedCredits": 3,
    "remainingCredits": 4997,
    "payments": [
      {
        "date": "2026-06-07T11:09:10.686Z",
        "amount": 0,
        "credits": 5000,
        "method": "free",
        "note": "Onboarding credits"
      }
    ]
  }
}
```

**Frontend Usage:**
- Client credits page — balance card, payment history table

---

### GET /client/profile
**Access:** Client

Client's lab profile info (read-only config details).

**Frontend Usage:**
- Client settings/profile page

---

### PATCH /client/profile
**Access:** Client

Update contact info only (clients cannot change their own config/branding).

**Allowed fields:** `contactEmail`, `contactPhone`, `address`, `city`, `state`, `website`

**Request:**
```json
{
  "contactEmail": "newlab@rajagiri.com",
  "contactPhone": "+91-8888888888"
}
```

**Frontend Usage:**
- Client settings → "Update Contact Info" form

---

## 4. UTILITY APIs

### GET /health
**Access:** Public

Health check — verifies API is running and database is connected.

**Response (200):**
```json
{
  "status": "healthy",
  "service": "smart-report-portal-api",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-06-07T14:31:51.274Z"
}
```

---

## 5. PLANNED APIs (Not Yet Built)

| Method | Route | Purpose | Needed For |
|--------|-------|---------|-----------|
| GET | `/admin/clients/expiring?days=7` | Clients expiring within N days | Dashboard alert list |
| PATCH | `/admin/clients/:tenantId/extend` | Extend subscription end date | Client detail action |
| GET | `/admin/notifications` | Admin notification feed | Bell icon dropdown |
| PATCH | `/admin/notifications/:id/read` | Mark notification read | Click notification |
| GET | `/client/notifications` | Client notification feed | Client bell icon |
| POST | `/admin/reports/:id/regenerate` | Trigger PDF re-generation | Report detail action |

---

## Environment-Based API URL Configuration

For the frontend to work in both local development and production without code changes:

```env
# .env.local (development)
NEXT_PUBLIC_API_URL=http://localhost:3001

# .env.production (production — set on Vercel/hosting)
NEXT_PUBLIC_API_URL=https://api.smartreport.com
```

Frontend code always uses:
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
fetch(`${API_URL}/auth/login`, { ... });
```

When you deploy the Portal API to AWS Lambda/EC2, just update `NEXT_PUBLIC_API_URL` to the production URL. Zero code changes in the frontend.
