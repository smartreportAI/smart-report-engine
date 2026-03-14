# Patient Mobile Viewer — Testing & Customization Guide

## What Is This?

When a patient receives a printed lab report, the **cover page and back page both contain a QR code**.
Scanning that QR code opens a **mobile-friendly web page** in their browser — no app install, no login required.

The page shows their lab results in plain language: overall health score, which parameters are flagged, and any recommendations.

---

## How It Works (Flow)

```
1. Lab generates report
   POST /reports/generate  (with VIEWER_BASE_URL set)
        ↓
2. Engine creates a secure token
   viewer/tokens/<64-char-hex>.json  ←  expiry, patientId, tenantId
   viewer/data/<64-char-hex>.json    ←  patient-safe payload (score, profiles, branding)
        ↓
3. Real QR code generated from URL:
   https://{VIEWER_BASE_URL}/view/<token>
        ↓
4. QR is injected into the PDF (cover page + back page)
        ↓
5. Patient scans QR → browser opens → GET /view/<token>
        ↓
6. Server looks up token → renders mobile HTML → sent back in one response
```

---

## Part 1 — How to Test It Yourself

### Step 1: Enable the viewer feature

The viewer is **off by default**. Set the `VIEWER_BASE_URL` environment variable to turn it on:

```bash
# For local testing, use localhost
VIEWER_BASE_URL=http://localhost:3000 npm run dev
```

The server will start and print:
```
Smart Report Engine running on http://0.0.0.0:3000
```

---

### Step 2: Generate a report

In a **second terminal**, send a request to the API:

```bash
curl -s -X POST http://localhost:3000/reports/generate \
  -H "Content-Type: application/json" \
  -d @examples/sample-report.json \
  | python3 -m json.tool | head -5
```

You should see `"success": true`.

---

### Step 3: Find your token

```bash
ls viewer/tokens/
```

You will see a file like:
```
a3f7b9c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1.json
```

That 64-character name **is your token**. Copy it.

```bash
# Read the token metadata
cat viewer/tokens/<your-token>.json
```

Output:
```json
{
  "token": "a3f7b9c1...",
  "tenantId": "demo",
  "patientId": "PAT-2026-SAMPLE",
  "reportDisplayId": "RPT-2026-MPLE",
  "reportDate": "14 March 2026",
  "createdAt": "2026-03-14T08:31:11.617Z",
  "expiresAt": "2026-06-12T08:31:11.617Z"
}
```

---

### Step 4: Open the viewer in your browser

Open this URL in your browser (or on your phone if both are on the same network):

```
http://localhost:3000/view/<your-token>
```

You will see the **animated mobile viewer page** with:
- Branded splash screen (fades after ~2 seconds)
- Animated health score gauge
- Profile cards (tap to expand)
- Range bars for each parameter
- AI recommendations (if the report has them)

---

### Step 5: Test the JSON API

For developers — get the raw patient payload as JSON:

```bash
curl http://localhost:3000/api/viewer/<your-token> | python3 -m json.tool
```

---

### Step 6: Test error pages

**Expired token** — manually edit the token file:
```bash
# Set expiresAt to the past
python3 -c "
import json
with open('viewer/tokens/<your-token>.json') as f: d = json.load(f)
d['expiresAt'] = '2020-01-01T00:00:00.000Z'
with open('viewer/tokens/<your-token>.json', 'w') as f: json.dump(d, f)
print('Done')
"

# Now visit it — should show the expired page
curl http://localhost:3000/view/<your-token> | grep -o '<title>.*</title>'
# Output: <title>Report Link Expired</title>
```

**Invalid token:**
```bash
curl http://localhost:3000/view/notarealtoken | grep -o '<title>.*</title>'
# Output: <title>Invalid Report Link</title>
```

---

### Step 7: Test with a real phone (on same Wi-Fi)

1. Find your machine's local IP:
   ```bash
   ipconfig | grep IPv4   # Windows
   ```
2. Start the server with that IP as the viewer base:
   ```bash
   VIEWER_BASE_URL=http://192.168.1.x:3000 npm run dev
   ```
3. Generate a report (Step 2 above)
4. Get the token (Step 3)
5. On a phone browser, open: `http://192.168.1.x:3000/view/<token>`

Or generate a PDF (`--pdf` flag) and open `output/report.pdf` — the QR codes inside are real and scannable.

---

### Step 8: Verify token auto-cleanup on startup

Tokens expire after 90 days. On server restart, expired tokens are deleted automatically:

```bash
# Create an already-expired token by manipulating expiresAt, then restart the server
# After restart, check viewer/tokens/ — it should be empty
ls viewer/tokens/
```

---

## Part 2 — Customizing the Mobile Frontend

The entire mobile viewer is a **single TypeScript file** that returns an HTML string:

```
src/viewer/templates/viewer.page.ts
```

There is no build step, no React/Vue/Svelte, no bundler — just a function that returns a string of HTML. You edit the file and changes are live on next server restart (or instantly with `npm run dev` hot reload).

---

### File Structure

```
src/viewer/templates/
├── viewer.page.ts        ← MAIN FILE: entire mobile UI lives here
└── viewer-error.page.ts  ← Error pages (expired + invalid link)
```

---

### Sections in viewer.page.ts

The `renderViewerPage(payload)` function builds the page in these sections:

| Section | What it renders | Key CSS class |
|---------|----------------|---------------|
| **Splash screen** | Brand-colored full-screen intro with logo, rings, progress bar | `.splash` |
| **Header** | Sticky top bar with lab logo + name | `.header` |
| **Hero** | Score gauge, severity message, stat pills (normal/flagged/critical) | `.hero` |
| **Profiles** | Expandable accordion cards for each test profile | `.profile-card` |
| **Parameters** | Each parameter row with value, range bar, status pill | `.param-row` |
| **Recommendations** | AI suggestion cards with disclaimer | `.rec-card` |
| **Footer** | Lab contact, disclaimer, branding | `.footer` |

---

### How to Change Colors

Colors come from **CSS variables** set at the top of the `<style>` block. They are built from the tenant's `primaryColor`:

```typescript
// In viewer.page.ts — these variables drive the entire theme
--primary:     ${primary}
--primary-10:  ${primary}1a   (10% opacity version for backgrounds)
--healthy:     #10b981        (green — normal results)
--monitor:     #f59e0b        (amber — needs attention)
--attention:   #ef4444        (red — critical)
```

To change the **overall severity color scheme**, edit these three lines in the CSS variables block.

To change the **tenant's primary color** (the brand color for the header, buttons, gauge), update the tenant config:
```typescript
// src/config/clients.config.ts
branding: {
  primaryColor: '#2D4A9A',   // ← change this
  ...
}
```

---

### How to Change the Splash Screen

Find the `splash` section in `viewer.page.ts`:

```html
<!-- SPLASH SCREEN — rendered as HTML string in viewer.page.ts -->
<div class="splash" id="splash">
  <div class="splash-rings">
    <div class="ring ring-1"></div>
    <div class="ring ring-2"></div>
    <div class="ring ring-3"></div>
  </div>
  <div class="splash-logo">
    <!-- Logo image or initials badge here -->
  </div>
  <div class="splash-lab">${branding.labName}</div>
  <div class="splash-progress-bar">
    <div class="splash-progress-fill"></div>
  </div>
</div>
```

**To change animation duration** — find this CSS:
```css
.splash-progress-fill {
  animation: progress 1.6s ease forwards;  /* ← change 1.6s */
}
```
And the JS timeout:
```javascript
setTimeout(() => { splash.classList.add('hidden'); }, 1900); // ← change 1900ms
```

**To add a tagline** — add text inside `.splash-lab`:
```html
<div class="splash-lab">${branding.labName}</div>
<div class="splash-tagline">Your health, clearly explained</div>
```

---

### How to Change the Score Gauge

The gauge is a **270° SVG arc**. Key values:

```typescript
const GAUGE_RADIUS = 54;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS; // 339.3
const filled = (score / 100) * (GAUGE_CIRCUMFERENCE * 0.75); // 75% of circle = 270°
```

**To change gauge size** — update `GAUGE_RADIUS` and the SVG `width`/`height`/`viewBox`.

**To change gauge colors** — find:
```css
.gauge-fill {
  stroke: var(--primary);   /* ← the filled arc color */
}
.gauge-bg {
  stroke: #e5e7eb;           /* ← the empty arc color */
}
```

**To change the score animation speed** — find:
```javascript
const duration = 1200; // ms ← change this
```

---

### How to Change the Severity Message Text

Find the `getSeverityConfig()` function in `viewer.page.ts`:

```typescript
function getSeverityConfig(severity: string, score: number) {
  if (severity === 'stable')   return { message: 'Your results look healthy', ... };
  if (severity === 'monitor')  return { message: 'Some areas need attention', ... };
  if (severity === 'critical') return { message: 'Please consult your doctor', ... };
}
```

Edit the `message` strings to change what patients see below their score.

---

### How to Change Profile Cards

Each profile displays as an **accordion card**. The expand/collapse logic is pure CSS + 3 lines of JS.

**Card header** — shows profile name + summary:
```html
<div class="profile-header" onclick="toggleProfile(${idx})">
  <span class="profile-name">${profile.name}</span>
  <span class="profile-badge">${badgeHtml}</span>
</div>
```

**To auto-expand all cards** (instead of just flagged ones), find:
```typescript
const isOpen = profile.severity !== 'stable'; // ← change to: const isOpen = true;
```

**To change the parameter row layout**, edit the `renderParamRow()` function — it returns the HTML for each test result row.

---

### How to Change the Range Bar

The range bar is a visual slider showing where the patient's value falls relative to the reference range.

Find `renderRangeBar()` in `viewer.page.ts`:

```typescript
function renderRangeBar(value: number, min?: number, max?: number, status?: string): string {
  const PAD = 0.35; // 35% padding on each side of the reference range
  // ...
}
```

**The green zone** (normal range highlight) is positioned using CSS `left` and `width` percentages.
**The dot** (patient's value) is positioned using `left` percentage.

To change the **green zone color**:
```css
.range-normal-zone {
  background: #bbf7d0;  /* ← change this */
}
```

To change the **dot colors** by status:
```css
.range-dot[data-status="high"]     { background: #ef4444; }
.range-dot[data-status="low"]      { background: #3b82f6; }
.range-dot[data-status="critical"] { background: #7c3aed; }
.range-dot[data-status="normal"]   { background: #10b981; }
```

---

### How to Change the Footer / Disclaimer

Find the footer section near the bottom of `renderViewerPage()`:

```typescript
<div class="footer">
  <div class="disclaimer">
    This report is a summary of laboratory findings...
    <!-- Edit this text -->
  </div>
  <div class="footer-brand">
    Powered by <strong>Smart Health Engine</strong>
  </div>
</div>
```

---

### How to Add a New Section

1. Write a render function that returns an HTML string:
   ```typescript
   function renderMySection(payload: ViewerPayload): string {
     return `
       <section class="my-section">
         <h2>My New Section</h2>
         ...
       </section>
     `;
   }
   ```

2. Add the CSS inside the `<style>` block at the top of `renderViewerPage()`.

3. Call it in the main template string:
   ```typescript
   ${renderHero(payload)}
   ${renderProfiles(payload)}
   ${renderMySection(payload)}   // ← add here
   ${renderRecommendations(payload)}
   ```

---

## Part 3 — Configuration Reference

### Per-Tenant Config (`src/config/clients.config.ts`)

| Flag | Default | Description |
|------|---------|-------------|
| `webViewer` | `false` | **Master switch per tenant.** When `true`, a patient-facing mobile viewer is generated for each report. A real scannable QR code is embedded in the PDF cover and back pages. Requires `VIEWER_BASE_URL` env var to be set. |

Example — enable viewer for a tenant:
```typescript
const MY_CLIENT_CONFIG: TenantConfig = {
  tenantId:   'my-client',
  reportType: 'inDepth',
  pageOrder:  [...INDEPTH_PAGE_ORDER],
  ...DEFAULT_FLAGS,
  webViewer: true,     // ← enable patient mobile viewer
  branding: { ... },
};
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VIEWER_BASE_URL` | *(not set)* | Base URL embedded in QR codes. **Must be set** together with `webViewer: true` to enable real QR codes. When unset, QR codes are decorative even if `webViewer` is true. |
| `VIEWER_TOKEN_TTL_DAYS` | `90` | How many days a viewer token is valid before it expires. |

### Both conditions must be true for real QR codes:

| `webViewer` | `VIEWER_BASE_URL` | Result |
|-------------|-------------------|--------|
| `false` | not set | Decorative QR placeholder |
| `false` | set | Decorative QR placeholder |
| `true` | not set | Decorative QR placeholder + info message |
| `true` | set | **Real scannable QR code + viewer link** |

**Example `.env` for production:**
```env
VIEWER_BASE_URL=https://reports.saihealthlabs.com
VIEWER_TOKEN_TTL_DAYS=90
```

**Example for local development (phone on same Wi-Fi):**
```env
VIEWER_BASE_URL=http://192.168.1.100:3000
VIEWER_TOKEN_TTL_DAYS=7
```

---

## Part 4 — Token Storage

Tokens are stored as plain JSON files on the server filesystem:

```
viewer/
  tokens/
    <64-char-hex>.json    ← metadata: expiry, patientId, tenantId
  data/
    <64-char-hex>.json    ← full patient payload (profiles, scores, branding)
```

- **Lazy cleanup**: when an expired token is visited, both files are deleted immediately.
- **Startup cleanup**: when the server starts, all expired tokens are deleted automatically.
- **Manual revoke**: delete the token file to instantly invalidate that QR code.
  ```bash
  rm viewer/tokens/<token>.json viewer/data/<token>.json
  ```

---

## Part 5 — Error Pages (viewer-error.page.ts)

Two error pages exist in `src/viewer/templates/viewer-error.page.ts`:

| Condition | Function | What patient sees |
|-----------|----------|-------------------|
| Token is 64-char hex but expired/deleted | `renderExpiredPage(labName?)` | Amber icon, "Report Link Expired", contact lab message |
| Token is not a valid hex string | `renderInvalidPage()` | Red icon, "Invalid Report Link" |

To customize the expired page message, edit `renderExpiredPage()`:
```typescript
export function renderExpiredPage(labName?: string): string {
  const contact = labName ?? 'your laboratory';
  return `
    ...
    <p>This report link has expired. Please contact ${contact} ...</p>
    ...
  `;
}
```
