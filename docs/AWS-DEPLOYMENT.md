# AWS Deployment Guide — Pragnya Smart Report Engine

## Overview

This document covers the complete AWS deployment architecture for the Pragnya Smart Report platform. It explains what's deployed, why each decision was made, and how to update things in the future.

**Company:** Pragnya  
**Region:** `ap-south-1` (Mumbai — closest to Indian users for low latency)  
**AWS Account:** `131166809886` (IAM user: `sai`)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Browser ──→ AWS Amplify ──→ Frontend (Next.js)                     │
│              (CDN + SSR)      http://localhost:3000 locally          │
│                                                                     │
│  Frontend API calls ──→ API Gateway (HTTP API) ──→ Lambda           │
│                         z5gp23l8eh                   (Portal API)   │
│                                                         │           │
│                                                    ┌────┴─────┐     │
│                                                    │ MongoDB  │     │
│                                                    │  Atlas   │     │
│                                                    └────┬─────┘     │
│                                                         │           │
│  Client LIS ──→ API Gateway ──→ Lambda (Report Engine)  │           │
│                  (PENDING)        (PENDING)              │           │
│                                      │                  │           │
│                                      ▼                  │           │
│                                 S3 Bucket               │           │
│                          pragnya-smart-reports          │           │
│                          (PDFs + JSONs stored)          │           │
│                                                         │           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## What's Done ✅

### 1. S3 Bucket — `pragnya-smart-reports`

**Purpose:** Central storage for all client data (input JSONs, generated PDFs) and deployment packages (Lambda zips).

**Settings:**
| Setting | Value | Why |
|---------|-------|-----|
| Region | ap-south-1 | Low latency for Indian users |
| Versioning | Enabled | Protects against accidental overwrites/deletes |
| Encryption | AES-256 (SSE-S3) | Data at rest is encrypted (compliance) |
| Public Access | All blocked | Only accessible via signed URLs or IAM |

**Folder Structure:**
```
pragnya-smart-reports/
├── clients/{tenantId}/
│   ├── inputs/{YYYY}/{MM}/{labNo}.json    ← Client's submitted lab data
│   └── reports/{YYYY}/{MM}/{labNo}.pdf    ← Generated health report PDF
└── system/
    ├── deployments/
    │   ├── engine/                         ← Report Engine Lambda zips
    │   └── portal-api/                     ← Portal API Lambda zips
    └── backups/                            ← Future: DB exports
```

**Why this structure:**
- Partitioned by tenant → can set per-client lifecycle rules or move data independently
- Year/Month subfolder → prevents folders with millions of files, enables Glacier archival by date
- labNo as filename → unique per tenant, directly constructable from the DB record

---

### 2. Portal API Lambda — `pragnya-portal-api`

**Purpose:** Serves all admin dashboard API endpoints (/admin/*, /auth/*, /health).

**Configuration:**
| Setting | Value | Why |
|---------|-------|-----|
| Runtime | Node.js 20.x | Latest LTS, has AWS SDK v3 built-in |
| Memory | 512 MB | Enough for MongoDB queries + JWT processing |
| Timeout | 30 seconds | Longest possible query should complete in <10s |
| Architecture | x86_64 | Standard, widest compatibility |
| Bundle size | 1.97 MB (0.5 MB zipped) | esbuild tree-shaking eliminated 96% of dead code |

**Environment Variables:**
| Variable | Purpose |
|----------|---------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Token signing secret |
| `S3_BUCKET` | `pragnya-smart-reports` |
| `CORS_ORIGIN` | `*` (will be restricted to Amplify domain later) |

**IAM Role:** `pragnya-portal-api-lambda-role`
- `AWSLambdaBasicExecutionRole` — CloudWatch Logs
- `AmazonS3ReadOnlyAccess` — Generate pre-signed URLs for PDF/JSON viewing

**How it works:**
1. API Gateway receives HTTP request
2. Routes to Lambda (catch-all `$default` route)
3. Lambda uses `@fastify/aws-lambda` to convert API Gateway event → Fastify request
4. Fastify processes the request (auth, DB query, etc.)
5. Response sent back through API Gateway to the browser

---

### 3. API Gateway — `pragnya-portal-api`

**Purpose:** Exposes the Lambda as a public HTTPS endpoint.

**Configuration:**
| Setting | Value |
|---------|-------|
| API ID | `z5gp23l8eh` |
| Type | HTTP API (v2) — cheaper and simpler than REST API |
| Endpoint | `https://z5gp23l8eh.execute-api.ap-south-1.amazonaws.com` |
| Stage | `$default` (auto-deploy) |
| Route | `$default` → catch-all to Lambda |

**Why HTTP API (not REST API):**
- 70% cheaper than REST API
- Lower latency (no request transformation layer)
- Automatic deployments
- Sufficient for our use case (no request/response models needed)

---

### 4. S3 Integration in Code

**Report Engine (`src/services/s3.service.ts`):**
- After generating a PDF, uploads both the input JSON and the PDF to S3
- Stores the S3 keys (`s3PdfKey`, `s3InputKey`) in the MongoDB report document
- Non-blocking (fire-and-forget) so it doesn't slow down the API response

**Portal API (`src/modules/admin/storage.route.ts`):**
- `GET /admin/reports/:id/pdf` — generates a 15-minute pre-signed URL for viewing the PDF
- `GET /admin/reports/:id/input` — generates a 15-minute pre-signed URL for viewing the input JSON
- Browser opens these directly (inline view, no download)

---

## What's Pending 🔄

### 5. Report Engine Lambda (Next Priority)

**Challenge:** The engine uses Puppeteer/Chromium for PDF generation (~280 MB). This exceeds Lambda's 250 MB unzipped limit for a single package.

**Solution:** Use Lambda Layers:
- **Layer 1:** `@sparticuz/chromium` (~50 MB compressed) — headless Chrome built specifically for Lambda
- **Layer 2:** `puppeteer-core` (without bundled Chrome) — connects to the layer Chrome

**Steps:**
1. Install `@sparticuz/chromium` and `puppeteer-core`
2. Update `pdf.service.ts` to detect Lambda environment and use the layer Chromium path
3. Bundle with esbuild (externalizing the layer packages)
4. Create Lambda Layers
5. Create the Lambda function with layers attached
6. Create API Gateway route

**Estimated bundle:** ~8 MB function + 50 MB Chromium layer = ~58 MB total (well under 250 MB)

---

### 6. AWS Amplify — Frontend Deployment

**Purpose:** Deploy the Next.js admin dashboard with CDN, SSL, and custom domain.

**Steps:**
1. Create Amplify app connected to git repository
2. Configure build settings for Next.js
3. Set environment variable `NEXT_PUBLIC_API_URL` to the API Gateway endpoint
4. Configure custom domain (when ready)

**Why Amplify (not S3+CloudFront):**
- Native Next.js support (handles SSR, API routes, ISR)
- Git-based auto-deploy (push → builds → deploys)
- Built-in SSL certificate and domain management
- Cheaper than running an EC2 instance

---

### 7. Custom Domain (Future)

Once deployed to Amplify:
- Frontend: `app.pragnya.in` or `portal.pragnya.in`
- API: `api.pragnya.in` (via API Gateway custom domain)

---

## How to Deploy Updates

### Portal API (backend changes)

```bash
cd portal-api

# 1. Bundle for Lambda
npm run bundle:lambda

# 2. Upload to S3
aws s3 cp dist/lambda/portal-api.zip s3://pragnya-smart-reports/system/deployments/portal-api/portal-api.zip --region ap-south-1

# 3. Update the Lambda function
aws lambda update-function-code \
  --function-name pragnya-portal-api \
  --s3-bucket pragnya-smart-reports \
  --s3-key system/deployments/portal-api/portal-api.zip \
  --region ap-south-1
```

### Frontend (after Amplify setup)

```bash
git push origin main
# Amplify auto-deploys on push
```

---

## Costs (Estimated Monthly)

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| Lambda (Portal API) | $0–5 | Free tier: 1M requests/month |
| Lambda (Engine) | $5–20 | Depends on report volume |
| API Gateway | $1–3 | $1/million requests |
| S3 Storage | $1–5 | ~$0.025/GB. 10K reports = ~20 GB |
| MongoDB Atlas | Existing plan | No change |
| Amplify | $0–5 | Free tier: 1000 build minutes |
| **Total** | **~$8–38/month** | Scales to thousands of reports |

---

## Key Decisions & Why

| Decision | Alternative | Why We Chose This |
|----------|------------|-------------------|
| Lambda over EC2 | EC2 instance (~$15/mo minimum) | Serverless = no maintenance, auto-scales, pay-per-use, no servers to patch |
| esbuild bundling | Ship node_modules | 65 MB → 2 MB bundle. Faster cold starts, well under Lambda limits |
| HTTP API over REST API | REST API ($3.50/M) | 70% cheaper ($1/M), lower latency, sufficient features |
| Single S3 bucket | Multiple buckets | Simpler IAM, single lifecycle policy, prefix-based separation is sufficient |
| ap-south-1 region | us-east-1 | Target users are in India — 10x lower latency |
| Amplify over Vercel | Vercel (free tier limited) | Full AWS ecosystem, custom domain included, no vendor lock-in |
| Pre-signed URLs | Public S3 objects | Security — files expire after 15 min, no permanent public links |

---

## Security Notes

- **MongoDB URI** is stored as a Lambda environment variable (encrypted at rest by AWS)
- **JWT Secret** is in Lambda env vars — should be moved to AWS Secrets Manager for production
- **S3 bucket** has all public access blocked — only accessible via IAM or pre-signed URLs
- **API Gateway** currently has no rate limiting — add a usage plan before going live with clients
- **CORS** is set to `*` — restrict to the Amplify domain after frontend deployment
- **AWS Access Key** used for setup should be rotated (it was exposed in this chat session)

---

## Troubleshooting

**Lambda cold start slow (>5s):**
- This is normal for the first request after inactivity
- MongoDB connection is the main factor (~3-4s for Atlas)
- Fix: Enable provisioned concurrency ($) or use Lambda SnapStart

**API returns 503 "DATABASE_UNAVAILABLE":**
- MongoDB Atlas connectivity issue
- Check: Is your Lambda in a VPC? (It shouldn't be for Atlas)
- Check: Is Atlas IP whitelist set to `0.0.0.0/0` or the Lambda's NAT IP?

**Bundle fails:**
- Run `npm run bundle:lambda` and check for errors
- Common issue: importing a native `.node` module (not bundleable)

---

## File Locations

| File | Purpose |
|------|---------|
| `portal-api/src/lambda.ts` | Lambda handler entry point |
| `portal-api/scripts/bundle-lambda.mjs` | esbuild bundler configuration |
| `portal-api/infra/lambda-trust-policy.json` | IAM trust policy for Lambda role |
| `portal-api/dist/lambda/portal-api.zip` | Built deployment package |
| `src/services/s3.service.ts` | Engine S3 upload service |
| `portal-api/src/modules/admin/storage.route.ts` | Pre-signed URL endpoints |

---

*Last updated: 18 June 2026*
