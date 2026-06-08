# Smart Report Engine — Admin & Client Dashboard

## Frontend Implementation Plan

---

## Can Start Without Deployment? ✅ YES

```
Terminal 1: cd portal-api && npm run dev         → http://localhost:3001 (API)
Terminal 2: cd portal-frontend && npm run dev    → http://localhost:3000 (Frontend)
```

No AWS, no Lambda needed. Both run locally.

---

## Deployment Target: AWS Amplify

- Push to GitHub → Amplify auto-builds and deploys
- Supports Next.js App Router with SSR natively
- Set `NEXT_PUBLIC_API_URL` in Amplify console for production
- Zero code changes between local and production

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 16 (App Router) | AWS Amplify native support, SSR, file-based routing |
| Language | TypeScript 5.x | Type safety end-to-end |
| UI Components | shadcn/ui | Professional, customizable, no lock-in |
| Styling | Tailwind CSS v4 | Utility-first, rapid development |
| Animations | Framer Motion 12 | Smooth page transitions, stagger effects |
| Charts | Recharts 2 | SVG-based, SSR-friendly |
| Tables | TanStack Table 8 | Sorting, filtering, pagination |
| State/API | TanStack Query 5 | Caching, refetch, loading states |
| Forms | React Hook Form + Zod | Matches API validation schemas |
| Icons | Lucide React | Used by shadcn natively |
| Fonts | Inter + JetBrains Mono | Professional, highly readable |
| Toasts | Sonner | Clean notification toasts |

---

## Visual Design — Clean White Professional Theme

### Design Philosophy
- **White/light background** — professional, trustworthy, healthcare-appropriate
- **Blue primary accent** — trust, reliability, healthcare standard
- **Clean borders, soft shadows** — not flat, not heavy. Subtle depth.
- **Inspired by:** Stripe Dashboard, Notion, Linear (light mode), Figma Admin

### Color Palette

| Role | Hex | Usage |
|------|-----|-------|
| Background | `#ffffff` | Page background |
| Surface | `#f8fafc` | Cards, sidebar, table headers |
| Surface Hover | `#f1f5f9` | Hover, selected rows |
| Border | `#e2e8f0` | Card borders, dividers |
| Text Primary | `#0f172a` | Headings, key data |
| Text Secondary | `#475569` | Body text |
| Text Muted | `#94a3b8` | Labels, placeholders |
| **Primary Blue** | `#2563eb` | Buttons, links, active nav |
| Primary Hover | `#1d4ed8` | Button hover |
| Primary Light BG | `#eff6ff` | Active nav item background |
| Healthy Green | `#16a34a` | Normal, active status |
| Monitor Amber | `#f59e0b` | Warning, attention |
| Critical Red | `#ef4444` | Error, failure |
| Credits Violet | `#7c3aed` | Credits, subscription |
| Info Sky | `#0ea5e9` | Info badges |

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Page Headings | Inter | 700 | 28px |
| Section Headings | Inter | 600 | 20px |
| Card Titles | Inter | 600 | 16px |
| Body | Inter | 400 | 14px |
| Labels | Inter | 500 | 11px uppercase |
| Stat Numbers | Inter | 700 | 36px |
| Data/IDs | JetBrains Mono | 500 | 13px |

### Component Styles

**Cards:**
- White bg, 1px border `#e2e8f0`, radius 12px
- Shadow: `0 1px 3px rgba(0,0,0,0.04)`
- Padding: 24px

**Sidebar (Desktop):**
- White bg, right border `#e2e8f0`
- Width: 240px (expanded) / 64px (collapsed)
- Active: Blue left border + blue bg `#eff6ff` + blue text
- Logo + company name at top

**Sidebar (Mobile):**
- Sheet drawer from left side
- Hamburger icon in header

**Buttons:**
- Primary: Blue `#2563eb`, white text, radius 8px
- Secondary: White bg, gray border, dark text
- Destructive: Red bg, white text

**Status Badges (Pills):**
- Active: Green bg `#dcfce7` + green text `#166534`
- Trial: Blue bg `#dbeafe` + blue text `#1e40af`
- Expired: Red bg `#fee2e2` + red text `#991b1b`
- Suspended: Gray bg `#f1f5f9` + gray text `#475569`

### Animations

| Element | Effect | Duration |
|---------|--------|----------|
| Page enter | Fade up 8px + opacity | 200ms |
| Stat cards | Stagger appear | 80ms each |
| Numbers | Count-up | 800ms |
| Charts | Draw-in | 500ms |
| Sidebar | Width transition | 200ms |
| Mobile nav | Sheet slide-in | 200ms |
| Card hover | Shadow increase + translateY(-1px) | 150ms |
| Table rows | Fade in staggered | 40ms |
| Button press | Scale(0.98) spring | 100ms |
| Toasts | Slide from top-right | 200ms |
| Modals | Scale(0.96→1) + fade | 200ms |

### Responsive Breakpoints

| Size | Layout |
|------|--------|
| ≥1280px | Full sidebar (240px) + content |
| ≥768px | Mini sidebar (64px icons) + content |
| <768px | No sidebar → hamburger → Sheet |
| Stat cards | 4 cols → 2 cols → 1 col |
| Tables | Horizontal scroll on small screens |

---

## Company Branding (Placeholder)

| Element | Value |
|---------|-------|
| Name | Smart Report Engine |
| Short | SRE |
| Logo | Medical cross + chart icon (SVG) |
| Tagline | Intelligent Health Report Platform |

*(You will change these later)*

---

## Build Phases & Checklist

### Phase F1: Project Setup
- [ ] Create Next.js project (App Router, TypeScript, Tailwind)
- [ ] Install & configure shadcn/ui (light theme)
- [ ] Install: framer-motion, recharts, @tanstack/react-query, @tanstack/react-table, react-hook-form, zod, lucide-react, sonner
- [ ] Set up Inter + JetBrains Mono fonts
- [ ] Configure Tailwind with design tokens
- [ ] Create API client with auth refresh
- [ ] Create auth context + useAuth hook
- [ ] Add TanStack Query provider
- [ ] Placeholder logo SVG

### Phase F2: Auth Flow
- [ ] Login page — centered card, blue button, clean
- [ ] Auth context: token storage, refresh, role detection
- [ ] Protected route guard
- [ ] Role-based redirect (admin → dashboard, client → their dashboard)
- [ ] Logout

### Phase F3: Admin Layout + Dashboard
- [ ] White sidebar with blue active states
- [ ] Header: breadcrumb, user menu, notification bell
- [ ] Mobile hamburger → Sheet drawer
- [ ] Stat cards: Clients, Reports Today, Failures, Low Credits, Expiring
- [ ] Animated count-up numbers
- [ ] Line chart: reports per day (30 days)
- [ ] Recent failures list

### Phase F4: Admin — Clients
- [ ] Data table: search, status filter, plan filter
- [ ] Status pills (Active/Trial/Expired/Suspended)
- [ ] Click → client detail page
- [ ] Detail: info card, credits progress, subscription countdown
- [ ] Payment history
- [ ] "Add Credits" modal
- [ ] "Toggle" switch
- [ ] "Onboard Client" form (creates client + user together)

### Phase F5: Admin — Reports
- [ ] Data table with filters (client, date, status)
- [ ] Abnormal count badge per row
- [ ] Report detail: patient info, abnormals, mapping stats

### Phase F6: Admin — Users & Audit
- [ ] Users table with role badges
- [ ] Disable/enable toggle
- [ ] Audit log table

### Phase F7: Client Dashboard
- [ ] Simpler sidebar (Dashboard, Reports, Credits, Settings)
- [ ] Welcome + credits ring + subscription countdown
- [ ] Mini chart + recent reports

### Phase F8: Client — Reports & Settings
- [ ] My reports list + detail
- [ ] Credits history
- [ ] Profile settings form

### Phase F9: Polish
- [ ] Page transitions
- [ ] Loading skeletons
- [ ] Toast notifications
- [ ] Empty states
- [ ] Mobile testing
- [ ] Error boundaries

---

## AWS Amplify Deployment

```bash
# 1. Push to GitHub
git push origin main

# 2. In Amplify Console:
#    → New App → Host Web App → Connect GitHub
#    → Select repo + branch
#    → Add env var: NEXT_PUBLIC_API_URL=https://api.yourdomain.com
#    → Deploy
```

No `amplify.yml` customization needed for standard Next.js apps.
