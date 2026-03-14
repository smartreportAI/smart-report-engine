# Patient Mobile Viewer — Complete Guide

## What Is This?

When a patient receives a printed lab report, the **cover page and back page both contain a QR code**.

- **Scan it** with a phone camera → opens the mobile viewer in the browser
- **Click it** in a PDF viewer (Chrome, Adobe, etc.) → opens the same URL directly

No app install. No login. Just a link that works on any phone browser.

The page shows their results in plain language: overall health score, flagged parameters, and AI recommendations.

---

## How It Works (Flow)

```
Tenant config:  webViewer: true
Environment:    VIEWER_BASE_URL=https://your-domain.com
                         ↓
Report generated (CLI or API)
                         ↓
Secure 64-char token created
  viewer/tokens/<token>.json   ← expiry, patientId, tenantId
  viewer/data/<token>.json     ← patient-safe payload (score, profiles, branding)
                         ↓
Real QR code generated: https://your-domain.com/view/<token>
QR injected into cover page + back page of PDF
QR is also a clickable <a href> link in the PDF
                         ↓
CLI output shows:
  🔗 Patient Viewer
    URL:  https://your-domain.com/view/<token>
                         ↓
Patient scans QR or clicks link
  GET /view/<token>  → renders mobile HTML page
  GET /api/viewer/<token>  → returns JSON payload
```

Both conditions must be true to get a real QR code:

| `webViewer` in tenant config | `VIEWER_BASE_URL` env var | Result |
|---|---|---|
| `false` | not set | Decorative placeholder QR |
| `false` | set | Decorative placeholder QR |
| `true` | not set | Decorative placeholder QR |
| `true` | set | **Real scannable + clickable QR** |

---

## Part 1 — Enabling the Viewer (Per-Tenant Config)

The viewer is controlled **per tenant** in `src/config/clients.config.ts`.

### Current Status

| Tenant | `webViewer` | Notes |
|--------|-------------|-------|
| `demo` | `true` | Sai Health Labs — viewer enabled |
| `tenant-beta` | `true` | NexaHealth Analytics — viewer enabled |
| `tenant-alpha` | `false` | Essential tier — no cover/back pages, disabled |

### To Enable for a Tenant

Open `src/config/clients.config.ts` and add `webViewer: true`:

```typescript
const MY_CLIENT_CONFIG: TenantConfig = {
  tenantId:   'my-client',
  reportType: 'inDepth',
  pageOrder:  [...INDEPTH_PAGE_ORDER],
  ...DEFAULT_FLAGS,
  webViewer: true,      // ← add this line
  branding: {
    ...DEFAULT_BRANDING,
    labName:      'My Lab Name',
    primaryColor: '#1A73E8',
    // ...
  },
};
```

Then register it in `CLIENT_REGISTRY` at the bottom of the same file. No other file needs to change.

### To Disable for a Tenant

Either set `webViewer: false` or remove the line entirely (defaults to `false`).

---

## Part 2 — Environment Setup

### Local Development

```bash
# Start the server with viewer enabled
VIEWER_BASE_URL=http://localhost:3000 npm run dev
```

### Test on a Real Phone (Same Wi-Fi)

```bash
# Find your machine's local IP first
ipconfig | grep IPv4    # Windows
# e.g. 192.168.1.34

# Start with your LAN IP
VIEWER_BASE_URL=http://192.168.1.34:3000 npm run dev
```

Then scan the QR code in the PDF with your phone — it will open on your phone's browser.

### Production

```env
VIEWER_BASE_URL=https://reports.yourdomain.com
VIEWER_TOKEN_TTL_DAYS=90
```

The `VIEWER_BASE_URL` must be publicly reachable — it's the domain your patients will hit when they scan the QR.

---

## Part 3 — How to Test It Yourself

### Method A — Using `npm test` (quickest)

`npm test` automatically sets `VIEWER_BASE_URL=http://localhost:3000` and generates a PDF.

```bash
npm test
```

Output will include:

```
✓ PDF generated successfully
  File:     D:\...\output\report.pdf
  Size:     2166.9 KB
  Score:    90/100
  ...

🔗 Patient Viewer
  URL:  http://localhost:3000/view/cd327c70cdb91f1456af331...
```

1. Start the server: `npm run dev`
2. Open that URL in your browser
3. Or open `output/report.pdf` and **click** the QR code on the cover or back page

---

### Method B — Using the API

**Step 1** — Start the server with `VIEWER_BASE_URL`:
```bash
VIEWER_BASE_URL=http://localhost:3000 npm run dev
```

**Step 2** — Generate a report:
```bash
curl -s -X POST http://localhost:3000/reports/generate \
  -H "Content-Type: application/json" \
  -d @examples/indepth-report.json | python3 -m json.tool | head -10
```

**Step 3** — Find the token:
```bash
ls viewer/tokens/
# a3f7b9c1d4e5...64chars....json
```

**Step 4** — Open the viewer:
```
http://localhost:3000/view/<your-token>
```

**Step 5** — Get raw JSON data:
```bash
curl http://localhost:3000/api/viewer/<your-token> | python3 -m json.tool
```

---

### Testing Error Pages

**Expired token:**
```bash
# Manually expire a token
python3 -c "
import json
token = open('viewer/tokens/').readline()   # get filename
with open(f'viewer/tokens/{token}') as f: d = json.load(f)
d['expiresAt'] = '2020-01-01T00:00:00.000Z'
with open(f'viewer/tokens/{token}', 'w') as f: json.dump(d, f)
"
# Visit the link — shows amber 'Report Link Expired' page
```

**Invalid token:**
```bash
curl http://localhost:3000/view/notarealtoken
# Shows red 'Invalid Report Link' page
```

---

### Manually Revoking a QR Code

Delete both files to immediately invalidate the link:
```bash
rm viewer/tokens/<token>.json viewer/data/<token>.json
```

Any attempt to open that URL will now show the expired page.

---

## Part 4 — The PDF QR Code (Clickable + Scannable)

The QR code in the PDF does two things:

| Action | Works when |
|--------|-----------|
| **Scan with phone camera** | `webViewer: true` + `VIEWER_BASE_URL` set |
| **Click in PDF viewer** | Same — QR is wrapped in an `<a href>` link |

When `webViewer` is `false` or `VIEWER_BASE_URL` is not set, the QR is a **decorative branded placeholder** — it looks like a QR code but is not scannable and not clickable.

The QR appears on two pages:
- **Cover page** — top-right of the patient card, labelled `SCAN TO VIEW`
- **Back page** — bottom-right of the footer area, labelled `Scan to view your results`

---

## Part 5 — Editing the Mobile Viewer HTML

The entire mobile viewer UI lives in **one file**:

```
src/viewer/templates/viewer.page.ts
```

It is a TypeScript function that returns a plain HTML string. No React, no Vue, no bundler. Just edit the file and restart the server — changes appear immediately with `npm run dev` hot reload.

### File Map

```
src/viewer/
├── viewer.types.ts          ← data types (ViewerPayload, ViewerProfile, etc.)
├── viewer.service.ts        ← builds ViewerPayload from NormalizedReport
├── token.service.ts         ← create/lookup/cleanup tokens (files)
├── qr.service.ts            ← generates QR SVG from URL
├── viewer.route.ts          ← HTTP routes: GET /view/:token, GET /api/viewer/:token
└── templates/
    ├── viewer.page.ts       ← MAIN FILE: entire mobile UI
    └── viewer-error.page.ts ← expired + invalid link error pages
```

---

### Page Sections (viewer.page.ts)

The `renderViewerPage(payload)` function builds the page top-to-bottom:

| Section | What the patient sees | Key function / CSS class |
|---------|----------------------|--------------------------|
| **Splash** | Full-screen brand color, logo, pulsing rings, progress bar. Fades in ~2 sec | `#splash` |
| **Header** | Sticky top bar with lab name and logo | `.header` |
| **Hero** | Animated score gauge (270° arc), severity message, stat pills | `.hero`, `.gauge-wrap` |
| **Profiles** | Accordion cards — one per test (e.g. CBC, Lipid Panel) | `.profile-card` |
| **Parameters** | Each test result row: value, range bar, status badge | `.param-row`, `renderParamRow()` |
| **Recommendations** | AI suggestion cards with disclaimer (only if present) | `.rec-card` |
| **Footer** | Lab name, disclaimer text, "Powered by" | `.footer` |

---

### How to Change the Brand Color

The viewer automatically uses the tenant's `primaryColor` from `clients.config.ts`. To change it:

```typescript
// src/config/clients.config.ts
branding: {
  primaryColor: '#f97407',   // ← change this hex value
}
```

That one change updates the header, gauge, splash screen, buttons, and badges — everything uses CSS variables derived from this color.

---

### How to Change the Splash Screen

Find the splash HTML block inside `renderViewerPage()` in `viewer.page.ts`.

**Change how long it shows:**
```css
/* Inside the <style> block in viewer.page.ts */
.splash-progress-fill {
  animation: progress 1.6s ease forwards;  /* ← change 1.6s */
}
```
```javascript
// Inside the <script> block at the bottom
setTimeout(() => { splash.classList.add('hidden'); }, 1900); // ← match the CSS (+ ~300ms)
```

**Add a tagline under the lab name:**
```html
<div class="splash-lab">${branding.labName}</div>
<div class="splash-tagline">Your health, clearly explained</div>  <!-- ← add this -->
```
Then add CSS for `.splash-tagline` inside the `<style>` block.

**Change the ring colors:**
```css
.ring {
  border-color: rgba(255, 255, 255, 0.15);  /* ← change opacity or color */
}
```

---

### How to Change the Score Gauge

The gauge is a 270° SVG arc drawn with `stroke-dasharray`.

**Change gauge size:**
```typescript
// In viewer.page.ts — find these constants
const GAUGE_RADIUS = 54;           // ← makes gauge bigger/smaller
const GAUGE_SIZE   = 140;          // ← SVG viewBox size
```
Also update the SVG `width`, `height`, and `viewBox` attributes to match.

**Change gauge arc color:**
```css
.gauge-fill {
  stroke: var(--primary);  /* ← uses tenant primary color — change to any hex */
}
.gauge-bg {
  stroke: #e5e7eb;          /* ← the unfilled part of the arc */
}
```

**Change score counter animation speed:**
```javascript
const duration = 1200; // ms  ← find this in the <script> block
```

**Change severity message text** (what shows below the score):
```typescript
// Find getSeverityConfig() in viewer.page.ts
function getSeverityConfig(severity: string, score: number) {
  if (severity === 'stable')   return { label: 'Healthy',   message: 'Your results look great' };
  if (severity === 'monitor')  return { label: 'Monitor',   message: 'Some areas need attention' };
  if (severity === 'critical') return { label: 'Critical',  message: 'Please consult your doctor' };
  //                                              ↑ label on badge        ↑ text below score — edit these
}
```

---

### How to Change Profile Cards

**Auto-expand all cards** (default: only flagged profiles are open):
```typescript
// Find this line in renderProfiles() in viewer.page.ts
const isOpen = profile.severity !== 'stable';
// Change to:
const isOpen = true;  // ← all expanded
// Or:
const isOpen = false; // ← all collapsed
```

**Change what each parameter row shows:**
Edit the `renderParamRow()` function. It receives a `ViewerParameter` object:
```typescript
interface ViewerParameter {
  name:         string;   // e.g. "Haemoglobin"
  value:        number;
  unit:         string;   // e.g. "g/dL"
  referenceMin: number | undefined;
  referenceMax: number | undefined;
  status:       string;   // "normal" | "high" | "low" | "critical"
  displayName:  string | undefined;
}
```

---

### How to Change the Range Bar

The range bar visually shows where the patient's value falls within the reference range.

**Change the green "normal zone" color:**
```css
.range-normal-zone {
  background: #bbf7d0;   /* ← change this */
}
```

**Change the dot color by status:**
```css
.range-dot[data-status="normal"]   { background: #10b981; }  /* green */
.range-dot[data-status="high"]     { background: #ef4444; }  /* red */
.range-dot[data-status="low"]      { background: #3b82f6; }  /* blue */
.range-dot[data-status="critical"] { background: #7c3aed; }  /* purple */
```

**Change the padding around the reference range** (how much extra space shows on each side):
```typescript
function renderRangeBar(...) {
  const PAD = 0.35;  // 35% padding each side ← change this (0.0 = no padding, 0.5 = 50% padding)
}
```

---

### How to Change the Footer / Disclaimer Text

Find the footer section near the bottom of `renderViewerPage()`:

```typescript
// Inside the HTML template string in renderViewerPage()
<p class="disclaimer-text">
  This report is a summary of laboratory findings and is generated by Smart Health Engine.
  <!-- ↑ Edit this text directly -->
</p>
```

---

### How to Add a New Section

1. Write a render function in `viewer.page.ts`:
```typescript
function renderMyNewSection(payload: ViewerPayload): string {
  return `
    <section class="my-section app-section">
      <h2 class="section-title">My New Section</h2>
      <p>${payload.patientName ?? 'Patient'}, here is some extra info...</p>
    </section>
  `;
}
```

2. Add CSS for it inside the `<style>` block at the top of `renderViewerPage()`.

3. Call it in the main template string — place it between whichever sections make sense:
```typescript
// Inside the return `...` template literal
${renderHero(payload)}
${renderProfiles(payload)}
${renderMyNewSection(payload)}      // ← add here
${renderRecommendations(payload)}
${renderFooter(payload)}
```

---

## Part 6 — Editing the Error Pages

Error pages live in `src/viewer/templates/viewer-error.page.ts`.

| Situation | Page shown | Styling |
|-----------|-----------|---------|
| Token looks like a valid hex but is expired or deleted | "Report Link Expired" | Amber icon |
| Token is not a valid hex string (garbled URL) | "Invalid Report Link" | Red icon |

**To change the expired page message:**
```typescript
export function renderExpiredPage(labName?: string): string {
  const contact = labName ?? 'your laboratory';
  return `
    ...
    <h1>Report Link Expired</h1>          <!-- ← change heading -->
    <p>This report link is no longer active.
       Please contact ${contact} to get a new copy.</p>   <!-- ← change message -->
    ...
  `;
}
```

**To change the invalid page message:**
```typescript
export function renderInvalidPage(): string {
  return `
    ...
    <h1>Invalid Report Link</h1>           <!-- ← change heading -->
    <p>This link does not appear to be valid...</p>   <!-- ← change message -->
    ...
  `;
}
```

---

## Part 7 — Token Storage & Lifetime

```
viewer/
  tokens/
    <64-char-hex>.json   ← metadata: token, tenantId, patientId, createdAt, expiresAt
  data/
    <64-char-hex>.json   ← full patient payload (profiles, scores, branding)
```

- Tokens live for **90 days** by default (`VIEWER_TOKEN_TTL_DAYS` env var to change)
- This is **independent** of the 7-day report cache — patient can scan on Day 60 and it still works
- **Lazy delete**: accessing an expired token deletes both files immediately
- **Startup cleanup**: server startup scans and deletes all expired tokens automatically
- **Manual revoke**: `rm viewer/tokens/<token>.json viewer/data/<token>.json`

---

## Part 8 — Environment Variable Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `VIEWER_BASE_URL` | *(not set)* | Public base URL for QR codes. Both `webViewer: true` AND this must be set for real QR codes. Example: `https://reports.yourdomain.com` |
| `VIEWER_TOKEN_TTL_DAYS` | `90` | Days before a viewer token expires. |

---

## Quick Reference

```bash
# Run test — generates PDF + shows viewer URL
npm test

# Start server with viewer enabled (local)
VIEWER_BASE_URL=http://localhost:3000 npm run dev

# Start server with viewer enabled (phone on same Wi-Fi)
VIEWER_BASE_URL=http://192.168.1.34:3000 npm run dev

# Generate a report with viewer link via CLI
VIEWER_BASE_URL=http://localhost:3000 npm run generate examples/indepth-report.json -- --pdf --no-cache --no-audit

# Viewer routes
GET /view/<token>         → mobile HTML page
GET /api/viewer/<token>   → raw JSON payload

# Revoke a token immediately
rm viewer/tokens/<token>.json viewer/data/<token>.json
```
