# Smart Report Engine — Complete Documentation

> **What is this project?**
>
> Smart Report Engine is a system that takes raw lab test data (blood tests, thyroid panels, lipid panels, etc.) and converts it into a **beautiful, branded health report** — either as an HTML page or a print-ready A4 PDF.
>
> Think of it like this: A pathology lab sends us raw numbers. We turn those numbers into a **premium, color-coded, easy-to-read report** with scores, charts, and status badges — all branded with the lab's own logo, colors, and name.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [How to Run](#2-how-to-run)
3. [Folder Structure](#3-folder-structure)
4. [Core Concepts](#4-core-concepts)
5. [File-by-File Guide](#5-file-by-file-guide)
6. [How Data Flows](#6-how-data-flows)
7. [How to Add a New Page](#7-how-to-add-a-new-page)
8. [How to Onboard a New Client](#8-how-to-onboard-a-new-client)
9. [How to Generate a Report](#9-how-to-generate-a-report)
10. [How the White-Label System Works](#10-how-the-white-label-system-works)
11. [How Testing Works](#11-how-testing-works)
12. [Glossary](#12-glossary)

---

## 1. Project Overview

### What does it do?

```
Lab sends raw data ──→ Engine processes it ──→ Out comes a beautiful report
```

**Input:** Raw lab test results (JSON format)
```json
{
  "patientId": "PAT-001",
  "age": 35,
  "gender": "male",
  "profiles": [
    {
      "profileName": "Complete Blood Count",
      "parameters": [
        { "testName": "Hemoglobin", "value": 14.2, "unit": "g/dL", "referenceRange": { "min": 13.5, "max": 17.5 } }
      ]
    }
  ]
}
```

**Output:** A fully branded health report (HTML or PDF) with:
- Overall health score (0–100) shown as a visual ring
- Color-coded status for every test (green = normal, yellow = watch, red = critical)
- Visual range sliders showing where your value falls
- The lab's own logo, colors, and name throughout

### Who uses it?

- **Pathology labs** (clients/tenants) — they send us their patients' raw test data
- **Patients** — they receive the final beautiful report
- **Developers** — they add new pages, onboard new labs, and maintain the system

---

## 2. How to Run

### Start the API server
```bash
npm run dev
```
This starts the server at `http://localhost:3000`. You can then send lab data via API and get back reports.

### Generate a report from command line
```bash
# HTML output
npm run generate -- examples/sample-report.json

# PDF output
npm run generate -- examples/sample-report.json --pdf
```
Output files are saved to the `output/` folder.

### Run tests
```bash
npm test
```

### Check for code errors (without running)
```bash
npm run typecheck
```

### All available commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the development server with auto-reload |
| `npm run build` | Compiles TypeScript to JavaScript for production |
| `npm start` | Runs the compiled production server |
| `npm run typecheck` | Checks for TypeScript errors without running |
| `npm test` | Runs all automated tests |
| `npm run generate -- <file>` | Generates HTML report from input JSON |
| `npm run generate -- <file> --pdf` | Generates PDF report from input JSON |

---

## 3. Folder Structure

```
Smart Report Engine/
│
├── examples/                          ← Sample input files for testing
│   └── sample-report.json
│
├── output/                            ← Generated reports land here (CLI only)
│   ├── report.html
│   └── report.pdf
│
├── src/                               ← All source code lives here
│   │
│   ├── server.ts                      ← App entry point — starts everything
│   ├── app.ts                         ← Configures the web server (routes, error handling)
│   │
│   ├── cli/                           ← Command-line report generator
│   │   └── generate.ts
│   │
│   ├── core/                          ← Foundational infrastructure
│   │   ├── config/                    ← Environment configuration
│   │   │   ├── config.schema.ts
│   │   │   ├── config.service.ts
│   │   │   └── config.types.ts
│   │   └── page-registry/             ← Page registration system
│   │       ├── page.registry.ts
│   │       └── page.types.ts
│   │
│   ├── domain/                        ← Business logic (THE BRAIN)
│   │   ├── models/                    ← Data structure definitions
│   │   │   ├── parameter.model.ts
│   │   │   ├── profile.model.ts
│   │   │   └── report.model.ts
│   │   ├── normalization/             ← Data processing + scoring
│   │   │   ├── classification.ts
│   │   │   └── normalize-report.ts
│   │   ├── types/                     ← Input data shapes
│   │   │   └── input.types.ts
│   │   └── __tests__/                 ← Domain logic tests
│   │       └── normalization.test.ts
│   │
│   ├── modules/                       ← API endpoints
│   │   ├── health/                    ← Health check endpoint
│   │   │   └── health.route.ts
│   │   ├── reports/                   ← Report generation endpoint
│   │   │   ├── report.route.ts
│   │   │   └── report.types.ts
│   │   └── tenants/                   ← Client/tenant management
│   │       ├── tenant.route.ts
│   │       └── tenant.types.ts
│   │
│   ├── pages/                         ← Visual page templates
│   │   ├── master-overview.page.ts
│   │   └── profile-detail.page.ts
│   │
│   ├── rendering/                     ← Report building engine
│   │   ├── design-system.css          ← All visual styling
│   │   ├── html-layout.ts            ← Page wrapper (header, footer, CSS)
│   │   ├── report-builder.ts          ← Orchestrates the full report
│   │   ├── pdf/                       ← PDF generation
│   │   │   ├── pdf.service.ts
│   │   │   └── test-pdf-request.json
│   │   ├── strategies/                ← Feature toggles by report type
│   │   │   ├── report-strategy.types.ts
│   │   │   ├── essential.strategy.ts
│   │   │   ├── indepth.strategy.ts
│   │   │   └── index.ts
│   │   └── __tests__/                 ← Rendering tests
│   │       └── pdf.test.ts
│   │
│   └── shared/                        ← Reusable utilities
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           └── response.utils.ts
│
├── package.json                       ← Project config + dependencies
├── tsconfig.json                      ← TypeScript compiler settings
└── DOCUMENTATION.md                   ← This file
```

---

## 4. Core Concepts

### 🔵 Tenants (Clients)

A **tenant** is a lab or healthcare company that uses our system. Each tenant has:
- Their own **brand identity** (logo, colors, name)
- Their own **report type** (essential or in-depth)
- Their own **page order** (which sections appear in their report)

**Example:** "Alpha Diagnostics" is a tenant. They want a simple report with blue branding. "Beta Health Labs" is another tenant — they want a premium red-themed report with analytics.

### 🟢 Profiles

A **profile** is a group of related lab tests. For example:
- "Complete Blood Count" (CBC) → contains Hemoglobin, WBC, Platelet Count, etc.
- "Lipid Panel" → contains Total Cholesterol, LDL, HDL, Triglycerides
- "Thyroid Panel" → contains TSH, Free T3, Free T4

### 🟡 Parameters

A **parameter** is a single lab test result within a profile. For example:
- Hemoglobin = 14.2 g/dL (reference range: 13.5–17.5)
- TSH = 4.8 mIU/L (reference range: 0.4–4.0) → this is HIGH

### 🔴 Status Classification

Every parameter is classified as one of:

| Status | Meaning | Color | When |
|---|---|---|---|
| `normal` | Within reference range | 🟢 Green | Value is between min and max |
| `low` | Below reference range | 🟡 Yellow | Value is below min (but not dangerously) |
| `high` | Above reference range | 🟡 Yellow | Value is above max (but not dangerously) |
| `critical` | Dangerously out of range | 🔴 Red | Value deviates more than 50% from the nearest bound |

### 📊 Severity Levels

**Profile severity** (per group of tests):
- `healthy` → almost all parameters normal
- `monitor` → 15-39% of parameters abnormal
- `attention` → 40%+ abnormal OR any critical parameter

**Overall severity** (whole report):
- `stable` → all profiles healthy
- `monitor` → at least one profile is "monitor"
- `critical` → at least one profile is "attention"

### 📋 Report Types (Strategies)

| Type | What it includes | Use case |
|---|---|---|
| `essential` | Score ring + organ cards (no analytics strip, no sliders) | Quick overview for routine checkups |
| `inDepth` | Everything: analytics strip, range sliders, score bars | Premium detailed analysis |

---

## 5. File-by-File Guide

### Root Files

#### `package.json`
**What:** Project identity card. Lists the project name, version, all dependencies (libraries we use), and available commands.

**Key sections:**
- `scripts` — the commands you can run (`npm run dev`, `npm test`, etc.)
- `dependencies` — libraries the project needs to run (Fastify for the web server, Zod for data validation, Puppeteer for PDF generation)
- `devDependencies` — libraries only needed during development (Vitest for testing)

#### `tsconfig.json`
**What:** Configuration for the TypeScript compiler. Tells TypeScript how strict to be, which files to compile, and where to put the output.

**Key settings:**
- `"strict": true` — maximum type safety, catches bugs at compile time
- `"module": "CommonJS"` — the output format Node.js understands
- `"outDir": "./dist"` — compiled JavaScript goes here

---

### `src/server.ts` — The Starting Point

**What:** This is the **first file that runs** when you start the application. It does three things:

1. **Registers all pages** — tells the system which report pages exist (master overview, profile detail, placeholders for future pages)
2. **Builds the web server** — calls `buildApp()` to set up the HTTP server
3. **Starts listening** — opens port 3000 and waits for requests

**Think of it as:** The receptionist who opens the office in the morning, sets up all the desks, and unlocks the front door.

---

### `src/app.ts` — Server Configuration

**What:** Configures the Fastify web server. Registers three groups of API endpoints:
- `/health` — "Is the server alive?"
- `/tenants/:id` — "Give me info about this lab client"
- `/reports/generate` — "Generate a report from this data"

Also sets up error handling — if something goes wrong, the user gets a clean error message instead of a crash dump.

**Think of it as:** The floor plan of the office — which rooms exist and what happens in each one.

---

### `src/cli/generate.ts` — Command-Line Generator

**What:** Lets you generate a report directly from your terminal without starting the server.

**How it works:**
1. Reads a JSON file from the path you provide
2. Validates the data (same rules as the API)
3. Looks up the tenant configuration
4. Runs the full report pipeline
5. Writes the result to `output/report.html` or `output/report.pdf`

**Example:**
```bash
npm run generate -- examples/sample-report.json --pdf
```
```
⏳ Generating PDF...

✓ PDF generated successfully
  File:     D:\project\output\report.pdf
  Size:     165.2 KB
  Score:    91/100
  Severity: critical
  Pages:    master-overview, profile-detail:cbc, profile-detail:lipid-panel
```

---

### `src/core/config/` — Configuration

| File | Purpose |
|---|---|
| `config.schema.ts` | Defines what environment variables the app expects (PORT, HOST, NODE_ENV, LOG_LEVEL) and their default values |
| `config.service.ts` | Loads the `.env` file, validates the variables, and exports a typed `config` object |
| `config.types.ts` | TypeScript type definition for the config object |

**Example:** If you set `PORT=4000` in a `.env` file, the server starts on port 4000. If you don't set anything, it defaults to port 3000.

---

### `src/core/page-registry/` — Page Registry

**What:** A central catalog of all available report pages. Like a phonebook — "I need the master-overview page" → registry finds it and returns it.

| File | Purpose |
|---|---|
| `page.registry.ts` | The registry itself — `register()` to add a page, `resolve()` to find one by name |
| `page.types.ts` | Defines the contract every page must follow: a `name` and a `generate()` function |

**Why it exists:** When a tenant says "my report should have pages: cover, master-overview, profile-detail", the report builder looks up each name in this registry to find the actual page renderer.

**The `PageRenderContext`:** Every page receives this envelope:
```typescript
{
  data: ...,      // The report data this page needs
  strategy: ...,  // Feature flags (show sliders? show analytics?)
}
```
This ensures pages are "pure" — they only use what's given to them, never reaching out to read files or environment variables on their own.

---

### `src/domain/` — The Brain (Business Logic)

This is the most important folder. It contains the **rules for processing lab data** — how to classify a test result, how to score a profile, how to determine overall severity. **No visual/display code here** — just pure data logic.

#### `domain/types/input.types.ts`
**What:** Defines the shape of raw lab data coming in from external sources.

**Key types:**
- `RawParameterInput` — a single test result (name, value, unit, reference range)
- `RawProfileInput` — a group of related test results (profile name + array of parameters)
- `RawReportInput` — the complete patient submission (patient info + array of profiles)

#### `domain/models/parameter.model.ts`
**What:** Defines what a **processed** parameter looks like after normalization.

Every raw test result gets transformed into a `ParameterResult`:
```
Raw:      { testName: "Hemoglobin", value: 11.2, referenceRange: { min: 13.5, max: 17.5 } }
                                    ↓
Processed: { id: "hemoglobin", name: "Hemoglobin", value: 11.2, status: "low", signalScore: 83 }
```

#### `domain/models/profile.model.ts`
**What:** Defines a processed profile — a group of processed parameters with aggregate statistics.

```
ProfileResult: {
  name: "Complete Blood Count",
  profileScore: 75,           ← average of all parameter scores
  severity: "monitor",         ← derived from abnormal ratio
  abnormalCount: 3,
  normalCount: 5,
  parameters: [...]            ← array of ParameterResult
}
```

#### `domain/models/report.model.ts`
**What:** The top-level report structure. Contains the patient info, all profiles, overall score, and overall severity.

```
NormalizedReport: {
  patientId: "PAT-001",
  overallScore: 91,
  overallSeverity: "critical",    ← "critical" if ANY profile is "attention"
  profiles: [...]                  ← array of ProfileResult
}
```

#### `domain/normalization/classification.ts`
**What:** The classification engine. Given a numeric value and a reference range, it determines:
- Is this value **normal**, **low**, **high**, or **critical**?
- What's the **signal score** (0–100)?

**Rules:**
- Value within range → `normal`, score = 100
- Value slightly outside → `low` or `high`, score = 100 minus how far off it is
- Value more than 50% outside → `critical`, score = 10

**Example:**
```
classifyParameter(11.2, 13.5, 17.5)
  → { status: "low", signalScore: 83 }

classifyParameter(350, 100, 200)
  → { status: "critical", signalScore: 10 }
```

#### `domain/normalization/normalize-report.ts`
**What:** The main processing pipeline. Takes raw lab data and produces a fully scored, classified `NormalizedReport`.

**Steps:**
1. For each profile → for each parameter → classify it (normal/low/high/critical)
2. Calculate profile score (average of parameter scores)
3. Determine profile severity (based on what % of parameters are abnormal)
4. Calculate overall score (average of profile scores)
5. Determine overall severity (escalates if any profile is severe)

---

### `src/modules/` — API Endpoints

#### `modules/health/health.route.ts`
**What:** The "is the server alive?" endpoint.

```
GET /health → { status: "ok", uptime: 334, registeredPages: [...] }
```

Useful for monitoring dashboards and load balancers.

#### `modules/tenants/tenant.types.ts`
**What:** Defines the structure of a tenant (lab client) configuration, including all branding options.

**Key types:**
- `TenantBrandingConfig` — logo, colors, fonts, footer text, contact info
- `TenantConfig` — tenant ID, report type, page order, branding

All fields are **validated with Zod** — if a tenant has an invalid hex color or a broken URL, it's rejected immediately with a clear error.

#### `modules/tenants/tenant.route.ts`
**What:** API endpoint to fetch tenant configuration.

```
GET /tenants/tenant-alpha → { branding: { labName: "Alpha Diagnostics", ... } }
```

Currently uses mock data (hardcoded tenants). In a future phase, this will read from a database.

#### `modules/reports/report.types.ts`
**What:** Defines the request/response shapes for report generation.

**Request schema** (validated with Zod):
- `tenantId` — which lab client (required)
- `output` — `"html"` or `"pdf"` (defaults to `"html"`)
- `reportData` — the patient data (required)

#### `modules/reports/report.route.ts`
**What:** The main report generation endpoint.

```
POST /reports/generate
Body: { tenantId, output, reportData }
```

**Flow:**
1. Validate the request body
2. Look up the tenant
3. Normalize the raw data
4. Build the HTML report
5. If `output = "pdf"` → convert to PDF via Puppeteer
6. Return the result

---

### `src/pages/` — Visual Page Templates

These files define **what each page of the report looks like**. They receive data and a strategy, and return HTML strings.

#### `pages/master-overview.page.ts`
**What:** The first page of the report — the "dashboard" view.

**Contains:**
- **SVG Score Ring** — a large circular visualization showing the overall score (0–100)
- **Severity Label** — a colored pill showing "STABLE", "MONITOR", or "CRITICAL"
- **Analytics Strip** — three key numbers: Total Profiles, Abnormal Parameters, Critical Flags *(only shown in `inDepth` reports)*
- **Profile Grid** — cards for each test group (CBC, Lipid, etc.) with score bars and abnormal badges

#### `pages/profile-detail.page.ts`
**What:** A detail page for each test profile. One page is generated per profile.

**Contains:**
- **Profile Heading** — name, score, severity badge
- **Parameter Cards** — for each test: name, value, unit, status pill, and a mini range slider *(sliders only shown in `inDepth` reports)*
- **Fallback Table** — if a profile has more than 20 parameters, it switches to a compact table layout instead of cards

---

### `src/rendering/` — Report Building Engine

This is the **rendering pipeline** — it takes the processed data and turns it into a complete HTML document.

#### `rendering/design-system.css`
**What:** All the visual styling for the entire report. This is a single CSS file that defines:

- **Design tokens** — colors, font sizes, spacing, shadows, border radius (all as CSS variables)
- **Page layout** — the report page shell, header with logo, footer with branding
- **Component styles** — score ring, analytics strip, profile cards, parameter cards, range sliders, status pills, tables
- **Print styles** — special rules for PDF generation (page breaks, no clipping, force background colors)

**Key CSS variables:**
```css
--color-primary: #1565C0;     /* tenant's brand color — overridden per-client */
--color-healthy: #2E7D32;     /* green for normal values */
--color-monitor: #F9A825;     /* yellow for watch values */
--color-attention: #C62828;   /* red for critical values */
```

#### `rendering/html-layout.ts`
**What:** Wraps page content into a complete HTML document with:
- The tenant's logo and name in the header
- The tenant's footer text
- Page numbers ("Page 1 of 4")
- All CSS embedded inline (so the HTML file works standalone)
- Brand-specific CSS variables injected to override default colors

**Key function: `generateBrandCSSVariables(branding)`**
Takes a tenant's branding config and generates CSS that overrides the defaults:
```css
:root {
  --color-primary: #E53935;        /* tenant's red instead of default blue */
  --color-healthy: #388E3C;        /* tenant's custom green */
  --font-family-heading: 'Outfit'; /* tenant's custom heading font */
}
```

#### `rendering/report-builder.ts`
**What:** The orchestrator — the conductor of the orchestra. It:

1. Receives the processed data and tenant config
2. Resolves the report strategy (essential vs inDepth)
3. Loops through the tenant's page order
4. For each page name, finds the page renderer in the registry
5. Calls `page.generate()` with the data and strategy
6. Wraps each page with the branded layout (header, footer, page numbers)
7. Combines everything into one complete HTML document

#### `rendering/pdf/pdf.service.ts`
**What:** Converts HTML into a print-ready A4 PDF using Puppeteer (a headless Chrome browser).

**Key settings:**
- A4 portrait format
- 20mm top/bottom margins, 15mm left/right
- All background colors preserved (printBackground: true)
- Waits for images and fonts to load before capturing
- Returns a Buffer (raw bytes), doesn't write to disk

**Lambda-compatible:** Uses special Chrome flags for deployment in containerized environments (AWS Lambda, Docker).

#### `rendering/strategies/`
**What:** Feature toggles that control which visual features are enabled.

| File | Strategy | Analytics Strip | Sliders | Executive Summary | Recommendations |
|---|---|---|---|---|---|
| `essential.strategy.ts` | Lean report | ❌ | ❌ | ❌ | ❌ |
| `indepth.strategy.ts` | Premium report | ✅ | ✅ | ✅ | ✅ |
| `index.ts` | Resolver: maps `reportType` → strategy | — | — | — | — |
| `report-strategy.types.ts` | TypeScript interface definition | — | — | — | — |

**How it's used:** When a tenant has `reportType: "essential"`, pages receive the essential strategy and skip the premium features. When `reportType: "inDepth"`, everything is enabled.

---

### `src/shared/` — Reusable Utilities

#### `shared/types/index.ts`
**What:** Shared TypeScript types used across the whole project.

- `ApiResponse<T>` — standard success response shape: `{ success: true, data: T, timestamp: "..." }`
- `ApiError` — standard error response shape: `{ success: false, error: { code, message }, timestamp: "..." }`

#### `shared/utils/response.utils.ts`
**What:** Helper functions to build consistent API responses.

```typescript
successResponse(data)    → { success: true, data, timestamp: "2026-02-28T..." }
errorResponse(code, msg) → { success: false, error: { code, message }, timestamp: "..." }
```

---

### `src/domain/__tests__/normalization.test.ts`
**What:** Automated tests (15 tests) that verify the classification and scoring logic works correctly.

**Tests include:**
- Normal value → status should be "normal", score should be 100
- Value above max → status should be "high"
- Value below min → status should be "low"
- Value way outside range → status should be "critical", score should be 10
- Severity escalation logic (20% abnormal → monitor, 40% → attention, any critical → attention)
- Overall score computation (average of profile scores)

### `src/rendering/__tests__/pdf.test.ts`
**What:** Automated smoke tests (2 tests) that verify PDF generation works.

- Generating a PDF from minimal HTML produces a valid PDF buffer
- The PDF preserves background colors (critical for our colored reports)

---

### `examples/sample-report.json`
**What:** A ready-to-use sample input file with 4 profiles (CBC, Lipid Panel, Thyroid Panel, Liver Function Test) and 18 parameters — a mix of normal and abnormal values.

Use it to test the system:
```bash
npm run generate -- examples/sample-report.json --pdf
```

---

## 6. How Data Flows

Here's the complete journey of data through the system:

```
┌──────────────────────────────────────────────────────────────────┐
│  1. RAW INPUT (from API or CLI)                                  │
│     { patientId, age, gender, profiles: [...] }                  │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. VALIDATION (report.types.ts)                                 │
│     Zod schema checks all fields are present and correct         │
│     ✗ Invalid → 400 error with details                          │
│     ✓ Valid → continue                                           │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. TENANT LOOKUP                                                │
│     Find the lab client's configuration (branding, report type)  │
│     ✗ Not found → 404 error                                    │
│     ✓ Found → continue                                          │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. NORMALIZATION (normalize-report.ts)                          │
│     For each parameter:                                          │
│       → classify as normal/low/high/critical                     │
│       → compute signal score (0–100)                             │
│     For each profile:                                            │
│       → compute profile score (average of parameter scores)      │
│       → derive severity (healthy/monitor/attention)              │
│     Overall:                                                     │
│       → compute overall score (average of profile scores)        │
│       → derive overall severity (stable/monitor/critical)        │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. STRATEGY RESOLUTION (strategies/index.ts)                    │
│     reportType = "essential" → no sliders, no analytics          │
│     reportType = "inDepth"   → all premium features              │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  6. REPORT BUILDING (report-builder.ts)                          │
│     For each page in tenant's pageOrder:                         │
│       → find page renderer in registry                           │
│       → call page.generate({ data, strategy })                   │
│       → wrap with branded layout (header + footer + page #)      │
│     Combine all pages into one HTML document                     │
│     Inject design-system.css + brand CSS variables               │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  7. OUTPUT                                                       │
│     output = "html" → return HTML string in JSON envelope        │
│     output = "pdf"  → Puppeteer converts to A4 PDF → raw bytes  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 7. How to Add a New Page

Adding a new page takes 3 steps:

### Step 1: Create the page file

Create a new file in `src/pages/`:

```typescript
// src/pages/recommendations.page.ts
import type { ReportPage, PageRenderContext } from '../core/page-registry/page.types';
import type { NormalizedReport } from '../domain/models/report.model';

export const recommendationsPage: ReportPage = {
  name: 'recommendations',   // ← this ID is used in pageOrder

  generate(ctx: PageRenderContext): string {
    const report = ctx.data as NormalizedReport;

    // Build your HTML here using the data
    const items = report.profiles
      .filter(p => p.severity !== 'healthy')
      .map(p => `<li>${p.name}: Score ${p.profileScore}/100</li>`)
      .join('');

    return `
    <section>
      <h1 class="heading">Recommendations</h1>
      <ul>${items}</ul>
    </section>`;
  },
};
```

### Step 2: Register it in server.ts

```typescript
import { recommendationsPage } from './pages/recommendations.page';

function seedPageRegistry(): void {
  pageRegistry.register(masterOverviewPage);
  pageRegistry.register(profileDetailPage);
  pageRegistry.register(recommendationsPage);  // ← add this line
  // ...
}
```

### Step 3: Add it to a tenant's page order

In the tenant config (currently in `report.route.ts` and `tenant.route.ts`):

```typescript
pageOrder: ['master-overview', 'profile-detail', 'recommendations'],
```

**That's it!** The report builder automatically finds and renders the page.

---

## 8. How to Onboard a New Client

### Step 1: Add tenant config

Add a new entry in the `MOCK_TENANTS` object in **both** `src/modules/tenants/tenant.route.ts` and `src/modules/reports/report.route.ts`:

```typescript
'tenant-sunrise': {
  tenantId: 'tenant-sunrise',
  reportType: 'inDepth',     // or 'essential'
  pageOrder: ['master-overview', 'profile-detail'],
  branding: {
    // REQUIRED
    labName: 'Sunrise Diagnostics',
    logoUrl: 'https://your-cdn.com/sunrise/logo.png',
    primaryColor: '#6A1B9A',   // the lab's brand color

    // OPTIONAL — everything below falls back to defaults if omitted
    secondaryColor: '#00897B',
    accentHealthy: '#2E7D32',
    accentMonitor: '#F9A825',
    accentAttention: '#C62828',
    footerText: 'Sunrise Diagnostics — Your Health Partner',
    contactEmail: 'reports@sunrise.com',
    contactPhone: '+91 98765 43210',
    fontFamilyHeading: 'Outfit',
    fontFamilyBody: 'Inter',
    showPoweredBy: false,
  },
},
```

### Step 2: Test it

```bash
# Create a test input file with tenantId: "tenant-sunrise"
npm run generate -- my-test.json --pdf
```

### Minimum required vs optional branding fields

| Field | Required? | What happens if omitted |
|---|---|---|
| `labName` | ✅ Yes | — |
| `logoUrl` | ✅ Yes | — |
| `primaryColor` | ✅ Yes | — |
| `secondaryColor` | ❌ No | Not used in current design |
| `accentHealthy` | ❌ No | Falls back to default green `#2E7D32` |
| `accentMonitor` | ❌ No | Falls back to default yellow `#F9A825` |
| `accentAttention` | ❌ No | Falls back to default red `#C62828` |
| `footerText` | ❌ No | Uses `labName` as footer |
| `contactEmail` | ❌ No | Not shown |
| `contactPhone` | ❌ No | Not shown |
| `fontFamilyHeading` | ❌ No | Uses system default (Inter) |
| `fontFamilyBody` | ❌ No | Uses system default (Inter) |
| `showPoweredBy` | ❌ No | Defaults to `false` |

---

## 9. How to Generate a Report

### Option A: Command Line (easiest)

```bash
# Generate HTML
npm run generate -- examples/sample-report.json

# Generate PDF
npm run generate -- examples/sample-report.json --pdf
```

Output goes to `output/report.html` or `output/report.pdf`.

### Option B: API Server

Start the server first:
```bash
npm run dev
```

Then send a request:

```bash
# HTML (returns JSON with HTML string)
curl -X POST http://localhost:3000/reports/generate \
  -H "Content-Type: application/json" \
  -d @examples/sample-report.json

# PDF (returns raw PDF binary)
curl -X POST http://localhost:3000/reports/generate \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"tenant-beta","output":"pdf","reportData":{...}}' \
  --output report.pdf
```

### Option C: Postman / Thunder Client

1. Create a POST request to `http://localhost:3000/reports/generate`
2. Set header `Content-Type: application/json`
3. Paste the contents of `examples/sample-report.json` as the body
4. Add `"output": "pdf"` to the JSON body if you want a PDF
5. Send!

### Input JSON format

```json
{
  "tenantId": "tenant-beta",        ← which lab client
  "output": "pdf",                   ← "html" or "pdf" (default: "html")
  "reportData": {
    "patientId": "PAT-001",          ← patient identifier
    "age": 35,                       ← patient age
    "gender": "male",                ← "male", "female", or "other"
    "profiles": [                    ← array of test groups
      {
        "profileName": "CBC",        ← group name
        "parameters": [              ← individual tests
          {
            "testName": "Hemoglobin",
            "value": 14.2,           ← the measured value
            "unit": "g/dL",          ← optional unit
            "referenceRange": {      ← optional reference range
              "min": 13.5,
              "max": 17.5
            }
          }
        ]
      }
    ]
  }
}
```

---

## 10. How the White-Label System Works

The white-label system ensures that **every report looks like it belongs to the lab that ordered it** — no mention of our engine, no generic branding.

### What gets customized per tenant

| Element | Source | Example for "Sunrise Diagnostics" |
|---|---|---|
| Page title | `branding.labName` | "Sunrise Diagnostics — Health Report" |
| Header logo | `branding.logoUrl` | Lab's own logo image |
| Header bar color | `branding.primaryColor` | Purple `#6A1B9A` |
| Score ring color | `branding.primaryColor` | Purple ring |
| Footer text | `branding.footerText` | "Sunrise Diagnostics — Your Health Partner" |
| Normal value color | `branding.accentHealthy` | Custom green (or default) |
| Warning value color | `branding.accentMonitor` | Custom yellow (or default) |
| Critical value color | `branding.accentAttention` | Custom red (or default) |
| Heading font | `branding.fontFamilyHeading` | "Outfit" (or default "Inter") |

### How it works technically

1. The tenant's branding config is loaded
2. `generateBrandCSSVariables(branding)` creates CSS overrides:
   ```css
   :root {
     --color-primary: #6A1B9A;
   }
   ```
3. These overrides are injected **after** the base design system CSS
4. CSS cascade rules mean the tenant's colors **win** over the defaults
5. If a tenant doesn't provide an optional color, the design system default stays

**Result:** One codebase, unlimited visual identities. Zero code changes per tenant.

---

## 11. How Testing Works

### Running tests

```bash
npm test
```

### Test structure

```
src/
├── domain/__tests__/
│   └── normalization.test.ts    ← 15 tests for data classification & scoring
└── rendering/__tests__/
    └── pdf.test.ts              ← 2 tests for PDF generation
```

### What's tested

| Test area | # Tests | What it verifies |
|---|---|---|
| Normal classification | 3 | Values within range → status "normal", score 100 |
| High classification | 2 | Values above max → status "high" |
| Low classification | 2 | Values below min → status "low" |
| Critical classification | 3 | Extreme values → status "critical", score 10 |
| Single-bound ranges | 2 | Works with only min or only max |
| Severity derivation | 3 | Profile severity based on abnormal % |
| Overall escalation | 1 | Any "attention" profile → overall "critical" |
| Score computation | 1 | Overall score = average of profile scores |
| PDF generation | 1 | Returns valid PDF buffer with `%PDF-` magic bytes |
| PDF colors | 1 | Background colors are preserved in PDF output |

### Adding new tests

Create a file ending in `.test.ts` anywhere under `src/`. Vitest automatically discovers and runs it.

```typescript
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
  it('should do something', () => {
    expect(1 + 1).toBe(2);
  });
});
```

---

## 12. Glossary

| Term | Meaning |
|---|---|
| **Tenant** | A lab or healthcare company that uses our system. Each tenant has their own branding and configuration. |
| **Profile** | A group of related lab tests (e.g., "Complete Blood Count", "Lipid Panel"). |
| **Parameter** | A single lab test result (e.g., "Hemoglobin = 14.2 g/dL"). |
| **Normalization** | The process of converting raw lab data into a processed, scored format. |
| **Classification** | Determining whether a test value is normal, low, high, or critical. |
| **Signal Score** | A 0–100 number representing how healthy a single test result is. 100 = perfectly normal. |
| **Profile Score** | Average of all parameter signal scores within a profile. |
| **Overall Score** | Average of all profile scores. The main "health number" on the report. |
| **Severity** | A category (stable/monitor/critical) that summarizes the overall situation. |
| **Strategy** | A set of feature flags that control which visual elements appear (essential vs inDepth). |
| **Page Registry** | A central catalog that maps page names to their renderers. |
| **White Label** | Making the report look like it belongs to the tenant — their logo, colors, and name. |
| **Design System** | A CSS file with all visual rules — colors, fonts, spacing, component styles. |
| **Puppeteer** | A library that controls a headless Chrome browser to convert HTML to PDF. |
| **Zod** | A validation library that checks incoming data matches expected shapes. |
| **Fastify** | The web server framework that handles HTTP requests. |
| **Vitest** | The testing framework for running automated tests. |

---

> **Last updated:** February 28, 2026
>
> **Phases completed:** Phase 1 (Foundation) → Phase 2 (Domain) → Phase 3 (Report Engine) → Phase 4 (Visual System) → Phase 5 (White Label) → Phase 6 (PDF Engine) → Phase 8.5 (CLI + Tests)
