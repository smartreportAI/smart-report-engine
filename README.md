# Smart Report Engine

A TypeScript-based health report generation engine that transforms raw lab data into professional PDF reports.

---

## What It Does

Labs send raw test data (blood tests, urine tests, etc.) → Engine maps parameters to profiles → Generates a visual PDF report → Stores metadata in MongoDB → Dispatches to client webhook.

---

## Architecture

```
Lab sends JSON → API/Lambda Handler
  → Validate Input (Zod schema)
  → Normalize (Gender, Age, flatten observations)
  → ID Mapping (BM0016 → "TSH")
  → Profile Mapping ("TSH" → "Thyroid Profile")
  → Normalize Report (scoring, severity)
  → Build HTML (page registry, templates)
  → Generate PDF (Puppeteer, multi-pass)
  → Save to MongoDB (report + abnormals)
  → Decrement Credits
  → Dispatch to Webhook (if configured)
  → Return PDF base64
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Language | TypeScript |
| Runtime | Node.js |
| PDF Engine | Puppeteer (headless Chrome) |
| Validation | Zod |
| Database | MongoDB Atlas |
| Server (local dev) | Fastify |
| Deployment (production) | AWS Lambda |

---

## Project Structure

```
src/
├── app.ts                          → Fastify server setup (local dev)
├── server.ts                       → Dev server entry point
├── handler.ts                      → AWS Lambda entry point
├── cli/
│   ├── generate.ts                 → CLI: generate report from JSON file
│   └── onboard-client.ts          → CLI: onboard new client to MongoDB
├── config/
│   └── clients.config.ts          → Client configurations (code-level)
├── core/
│   ├── config/                    → Environment config (Zod validated)
│   ├── mapping/                   → Tenant-scoped parameter mapping
│   ├── page-registry/             → Page registration system
│   └── test-database/             → ID + Profile mapping database
│       ├── id-mapping.ts              → 1248 BioMarker IDs (BM0001-BM1248)
│       ├── profile-mapping.ts         → 1248 test names → 43 profiles
│       └── index.ts                   → Mapping pipeline logic
├── database/
│   ├── connection.ts              → MongoDB singleton connection
│   ├── report.service.ts          → Save/query reports
│   ├── client.service.ts          → Client CRUD, credits, validation
│   └── index.ts                   → Exports
├── domain/
│   ├── models/                    → Report, Profile, Parameter models
│   ├── normalization/
│   │   ├── normalize-input.ts         → Raw lab JSON → clean format
│   │   ├── normalize-report.ts        → Scoring, severity calculation
│   │   └── classification.ts          → Parameter status (normal/low/high)
│   └── types/
│       ├── input.types.ts             → Clean internal types
│       └── lab-input.types.ts         → Raw lab JSON types
├── modules/
│   ├── reports/
│   │   ├── report.route.ts           → POST /reports/generate
│   │   └── report.types.ts           → Zod schemas for input validation
│   └── tenants/
│       ├── tenant.route.ts           → GET /tenants/:id
│       └── tenant.types.ts           → TenantConfig type definitions
├── pages/                         → HTML page renderers
│   ├── indepth/                       → InDepth report pages
│   │   ├── cover.page.ts
│   │   ├── summary.page.ts
│   │   ├── detail.page.ts
│   │   ├── recommendations.page.ts
│   │   └── back.page.ts
│   └── shared/                        → Shared components
├── rendering/
│   ├── report-builder.ts         → Orchestrates page rendering
│   ├── html-layout.ts            → Header/footer/layout wrappers
│   ├── design-system.css          → Global CSS design tokens
│   ├── pdf/                       → PDF generation
│   │   ├── pdf.service.ts             → Single-page PDF
│   │   ├── pdf-multipass.ts           → Multi-pass (cover + content + back)
│   │   ├── pdf-merge.ts              → Merge PDFs using pdf-lib
│   │   └── browser-pool.ts           → Puppeteer browser management
│   └── strategies/                → Report type strategies
│       ├── indepth.strategy.ts
│       └── essential.strategy.ts
├── services/
│   ├── client-config.service.ts   → Resolves config (DB + code merged)
│   └── webhook.service.ts         → Dispatches PDF to client webhook
└── shared/
    └── utils/
        └── response.utils.ts      → Standard response format
```

---

## Input Format

The engine accepts raw lab JSON (same format labs currently send):

```json
{
  "tenantId": "rajagiri",
  "labData": {
    "org": "rajagiri",
    "Centre": "rajagiri",
    "LabNo": "RHH2523497J",
    "PName": "Mrs. Veena B Nair",
    "Gender": "F",
    "Age": "35",
    "ReferredBy": "Dr. Abhijith",
    "results": [
      {
        "Package_name": "Health Checkup",
        "investigation": [
          {
            "test_name": "Lipid Profile",
            "barcodeNo": "RHH2523497A",
            "observations": [
              {
                "name": "Total Cholesterol",
                "id": "BM0106",
                "value": "220",
                "MinValue": "",
                "MaxValue": "200",
                "unit": "mg/dL"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Mapping Pipeline

```
Observation arrives with: name="Total Cholesterol", id="BM0106"

Step 1: ID Mapping → BM0106 → "Total Cholesterol" ✓
Step 2: If ID fails → try name matching → "Total Cholesterol" found in profile map ✓
Step 3: Profile Assignment → "Total Cholesterol" → "Lipid Profile" ✓
Step 4: If nothing matches → goes to "Ungrouped"
```

- **1248 BioMarker IDs** (BM0001 to BM1248)
- **1248 parameters** mapped to **43 profiles**
- Client-specific overrides supported (via DB or code config)

---

## MongoDB Collections

### `reports` — Every generated report
```
labNo, tenantId, patientName, age, gender, packageName
totalParameters, mappedCount, unmappedCount, unmappedParameters
normalCount, abnormalCount, abnormalParameters[]
pdfUrl, pdfSize, status, errorMessage, dispatchStatus
createdAt
```

### `clients` — Client configuration and billing
```
tenantId, labName, contactEmail, contactPhone
isLive, liveDate, expiryDate
totalCredits, usedCredits, remainingCredits, payments[]
reportConfig { reportType, pageOrder, colors, features, mappingOverrides }
webhookUrl, webhookFormat
totalReports, createdAt, updatedAt
```

---

## CLI Commands

```bash
# Generate report (PDF)
npm run generate examples/mixed-report.json -- --pdf

# Generate report (HTML for debugging)
npm run generate examples/mixed-report.json

# Onboard new client
npm run onboard -- --tenantId rajagiri --labName "Rajagiri Hospital" --credits 5000

# Run test (generates mixed report as PDF)
npm test

# Type check
npm run typecheck

# Dev server (local)
npm run dev
```

---

## Environment Variables

```env
NODE_ENV=development
LOG_LEVEL=info
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/smart_report_engine
```

---

## How to Onboard a New Client

1. Run CLI:
```bash
npm run onboard -- --tenantId newclient --labName "New Lab" --credits 5000 --webhook https://their-server.com/receive
```

2. Add to `src/config/clients.config.ts`:
```typescript
const NEWCLIENT_CONFIG: TenantConfig = {
  tenantId: 'newclient',
  reportType: 'inDepth',
  pageOrder: [...INDEPTH_PAGE_ORDER],
  ...DEFAULT_FLAGS,
  branding: {
    ...DEFAULT_BRANDING,
    labName: 'New Lab',
    primaryColor: '#1A73E8',
  },
};

// Add to registry:
'newclient': NEWCLIENT_CONFIG,
```

---

## What's Completed

| Feature | Status |
|---------|--------|
| Accept raw lab input (same as Remedies) | ✅ |
| ID mapping (1248 BM codes) | ✅ |
| Profile mapping (1248 → 43 profiles) | ✅ |
| Client-level mapping overrides | ✅ |
| PDF generation (Puppeteer, multi-pass) | ✅ |
| MongoDB integration | ✅ |
| Save reports (abnormals, mapping stats) | ✅ |
| Client credits and validation | ✅ |
| Client config from DB (with code fallback) | ✅ |
| Webhook dispatch | ✅ |
| Client onboarding CLI | ✅ |
| Lambda handler | ✅ |
| Default output = PDF | ✅ |
