# MongoDB Schema — Smart Report Engine

> **Database:** `smart_report_engine`
> **Shared by:** Report Engine (writes reports, reads clients) + Portal API (reads/writes everything)

---

## Collections Overview

| Collection | Written By | Read By | Purpose |
|-----------|-----------|---------|---------|
| `users` | Portal API | Portal API | Admin & client user accounts |
| `clients` | Portal API + Report Engine | Both | Lab/tenant config, credits, subscription |
| `reports` | Report Engine | Portal API | Every generated report metadata |
| `audit_logs` | Portal API | Portal API | Admin action history |
| `notifications` | Portal API | Portal API | In-app notification feed |

---

## 1. `users` Collection

### Purpose
Stores all portal user accounts. Admin users manage everything. Client users can only see their own lab's data.

### Document Shape
```typescript
{
  _id: ObjectId,
  email: string,              // unique, lowercase — login identifier
  password: string,           // bcrypt hash (12 rounds)
  name: string,               // display name
  phone?: string,             // contact number

  role: 'superadmin' | 'admin' | 'client' | 'lab_staff',
  tenantId: string | null,    // null for admin/superadmin, set for client/lab_staff

  isActive: boolean,          // false = account disabled (can't login)
  lastLoginAt?: Date,         // last successful login timestamp

  refreshToken?: string,      // bcrypt-hashed refresh token (for rotation)
  createdBy?: string,         // userId of admin who created this user
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ email: 1 }` — unique
- `{ tenantId: 1 }`
- `{ role: 1 }`
- `{ isActive: 1 }`

### Role Explanation
| Role | tenantId | Can Access |
|------|----------|-----------|
| `superadmin` | null | Everything — system owner |
| `admin` | null | All clients, reports, users — staff |
| `client` | `"rajagiri"` | Only their own lab's data |
| `lab_staff` | `"rajagiri"` | Read-only access to their lab (future) |

---

## 2. `clients` Collection

### Purpose
Each document represents one diagnostic lab/tenant. Contains their subscription, credits, branding, and report configuration.

### Document Shape
```typescript
{
  _id: ObjectId,

  // Identity
  tenantId: string,               // unique slug: 'rajagiri', 'demo', 'apollo-labs'
  labName: string,                // display name: "Rajagiri Hospital"
  contactEmail?: string,
  contactPhone?: string,
  contactPerson?: string,         // primary contact name
  address?: string,
  city?: string,
  state?: string,
  website?: string,
  gstNumber?: string,             // for invoicing

  // Subscription
  plan: 'free' | 'starter' | 'pro' | 'enterprise',
  status: 'onboarding' | 'trial' | 'active' | 'expired' | 'suspended',
  subscriptionStartDate: Date,    // package start
  subscriptionEndDate: Date,      // package end (no reports after this)
  trialEndDate?: Date | null,     // trial period end (null = no trial)
  trialCredits?: number,          // free trial credits
  liveDate?: Date | null,         // when production traffic started
  autoRenew?: boolean,            // notify admin before expiry

  isLive: boolean,                // master kill switch for report generation
  onboardedBy?: string,           // userId of admin who onboarded

  // Credits
  totalCredits: number,
  usedCredits: number,
  remainingCredits: number,
  payments: [{
    date: Date,
    amount: number,               // money (₹)
    credits: number,              // credits added
    method?: string,              // 'upi', 'bank_transfer', 'cash', 'card', 'free'
    reference?: string,           // transaction ID
    invoiceNumber?: string,
    note?: string,
    addedBy?: string              // admin userId
  }],

  // Report Configuration (used by Report Engine)
  reportConfig: {
    reportType: 'inDepth' | 'essential',
    pageOrder: string[],
    profileContinuation?: boolean,
    strictMapping?: boolean,
    webViewer?: boolean,
    branding: {
      labName: string,
      logoUrl?: string,
      primaryColor: string,
      secondaryColor?: string,
      accentHealthy?: string,
      accentMonitor?: string,
      accentAttention?: string,
      fontFamilyHeading?: string,
      fontFamilyBody?: string,
      headerHeight?: string,
      headerMargin?: string,
      footerHeight?: string,
      footerMargin?: string,
      footerText?: string,
      contactEmail?: string,
      contactPhone?: string,
      showPoweredBy?: boolean
    },
    idMappingOverrides?: Record<string, string>,
    profileMappingOverrides?: Record<string, string>
  },

  // Webhook
  webhook?: {
    url: string,
    secret?: string,
    format?: 'json' | 'multipart',
    enabled: boolean,
    lastDispatchAt?: Date,
    lastDispatchStatus?: 'success' | 'failed',
    failureCount?: number
  },

  // Stats (updated by Report Engine after each generation)
  totalReports: number,
  totalFailures: number,
  lastReportAt?: Date,

  // Metadata
  notes?: string,                 // admin internal notes
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
- `{ tenantId: 1 }` — unique
- `{ isLive: 1 }`
- `{ status: 1 }`
- `{ remainingCredits: 1 }`
- `{ subscriptionEndDate: 1 }`
- `{ createdAt: -1 }`

---

## 3. `reports` Collection

### Purpose
Every report generated by the Report Engine is saved here. The Portal API only reads this collection.

### Document Shape
```typescript
{
  _id: ObjectId,

  labNo: string,                  // lab number from the LIS
  tenantId: string,               // which client generated this

  // Patient
  patientName: string,
  age: number,
  gender: string,
  referredBy?: string,
  packageName?: string,

  // Mapping Stats
  totalParameters: number,
  mappedCount: number,
  unmappedCount: number,
  unmappedParameters: string[],

  // Results
  normalCount: number,
  abnormalCount: number,
  abnormalParameters: [{
    name: string,
    value: number | string,
    unit?: string,
    min?: number,
    max?: number,
    status: string,               // 'high' | 'low' | 'critical'
    profileName: string
  }],
  overallScore?: number,          // 0-100
  overallSeverity?: string,       // 'stable' | 'monitor' | 'critical'

  // Output
  pdfUrl?: string,                // S3 URL (future)
  pdfSize?: number,               // bytes

  // Status
  status: 'completed' | 'failed' | 'pending',
  errorMessage?: string,

  // Webhook Dispatch
  dispatchStatus: 'sent' | 'failed' | 'pending' | 'none',
  dispatchedAt?: Date,

  // Viewer
  viewerToken?: string,

  // Source & Performance
  source: 'json' | 'fhir' | 'hl7',
  generationTimeMs?: number,

  createdAt: Date
}
```

### Indexes
- `{ tenantId: 1, createdAt: -1 }` — client's reports sorted by date
- `{ labNo: 1, tenantId: 1 }` — lookup specific report
- `{ status: 1 }`
- `{ createdAt: -1 }`
- `{ abnormalCount: 1 }`

---

## 4. `audit_logs` Collection

### Purpose
Immutable log of every admin action. Never updated or deleted.

### Document Shape
```typescript
{
  _id: ObjectId,
  userId: string,                 // who did it
  userEmail: string,              // denormalized for display
  userRole: string,               // role at time of action

  action: string,                 // 'client.create', 'client.addCredits', etc.
  description?: string,           // "Added 500 credits to rajagiri"
  details?: object,               // action-specific data

  targetTenantId?: string,        // which client was affected
  ip?: string,                    // request IP

  createdAt: Date
}
```

### Indexes
- `{ userId: 1, createdAt: -1 }`
- `{ action: 1 }`
- `{ targetTenantId: 1 }`
- `{ createdAt: -1 }`

---

## 5. `notifications` Collection

### Purpose
In-app notifications displayed in the dashboard bell icon.

### Document Shape
```typescript
{
  _id: ObjectId,
  userId?: string,                // target specific user (null = broadcast)
  tenantId?: string,              // scope to client's users
  targetRole?: string,            // 'admin' | 'client'

  type: string,                   // 'credits_low', 'report_failed', etc.
  title: string,                  // "Credits Low"
  message: string,                // "Rajagiri has 45 credits remaining"
  actionUrl?: string,             // "/admin/clients/rajagiri"

  isRead: boolean,
  createdAt: Date
}
```

### Notification Types
| Type | Who Sees | When Triggered |
|------|----------|---------------|
| `credits_low` | admin + client | Credits below 100 |
| `credits_exhausted` | admin + client | Credits = 0 |
| `report_failed` | admin | Report generation failed |
| `unmapped_param` | admin | New unknown test code detected |
| `client_onboarded` | admin | New client created |
| `client_disabled` | admin | Client was disabled |
| `webhook_failed` | admin | Webhook dispatch failed 3+ times |
| `system` | admin | System alerts |
| `info` | either | General info messages |

### Indexes
- `{ userId: 1, isRead: 1, createdAt: -1 }`
- `{ tenantId: 1, createdAt: -1 }`
