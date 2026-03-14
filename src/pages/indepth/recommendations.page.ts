/**
 * InDepth — Recommendations Page
 *
 * Uses hardcoded clinical recommendations. Dynamic derivation from
 * NormalizedReport will be wired in a future phase.
 *
 *  'v1' — "Rx Prescription Board"
 *         Brand-gradient header with Rx watermark. Two-column
 *         prescription-slip cards with numbered badges, category
 *         chips, priority strips, and related-test tags.
 *
 *  'v2' — "Clinical Intelligence Feed"
 *         Split dark-panel header with health score arc gauge.
 *         Full-width feed cards: left priority block + content + CTA.
 *
 *  'v3' — "Health Command Center"
 *         Large gradient header with oversized score. Two-column
 *         dashboard: priority action cards left, quick-win tips right.
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';

/* ===================================================================
   ACTIVE DESIGN SWITCH — change to 'v2' or 'v3' to try other designs
   =================================================================== */
const ACTIVE_DESIGN = 'v3' as 'v1' | 'v2' | 'v3';

/* ===================================================================
   HARDCODED RECOMMENDATIONS
   Future phase: replace with dynamic derivation from NormalizedReport.
   =================================================================== */

type RecCategory = 'Medication Alert' | 'Follow-Up Tests' | 'Diet & Nutrition' | 'Lifestyle' | 'Monitor';
type RecPriority = 'critical' | 'important' | 'routine';

interface Recommendation {
  id: number;
  category: RecCategory;
  priority: RecPriority;
  title: string;
  description: string;
  action: string;
  timeframe: string;
  relatedTest: string;
}

/* ─── Rich clinical recommendations (hardcoded until Phase 2) ──── */
const RECOMMENDATIONS: Recommendation[] = [
  {
    id: 1, category: 'Medication Alert', priority: 'critical',
    title: 'Vitamin D Supplementation Required',
    description: 'Vitamin D is critically low at 6.59 ng/mL (normal: 30\u2013100). High-dose oral supplementation (60,000 IU/week for 8\u201312 weeks) followed by a maintenance dose is strongly recommended.',
    action: 'Consult physician immediately', timeframe: 'Within 1 week',
    relatedTest: 'Vitamin D, 25 Hydroxy (OH)',
  },
  {
    id: 2, category: 'Medication Alert', priority: 'critical',
    title: 'Insulin Resistance Detected',
    description: 'Fasting insulin markedly elevated at 70.7 mU/L (ref: 3\u201325). Combined with HOMA-IR score, this indicates significant insulin resistance and metabolic dysfunction requiring prompt medical evaluation.',
    action: 'Schedule endocrinologist consult', timeframe: 'Within 2 weeks',
    relatedTest: 'Insulin, Fasting & HOMA-IR',
  },
  {
    id: 3, category: 'Follow-Up Tests', priority: 'important',
    title: 'HbA1c (Glycated Haemoglobin) Test',
    description: 'HbA1c is essential to assess average blood glucose over 3 months. Combined with elevated fasting insulin, this will confirm or rule out pre-diabetes or Type 2 Diabetes Mellitus.',
    action: 'Order lab test now', timeframe: 'Within 2 weeks',
    relatedTest: 'Plasma Glucose Fasting',
  },
  {
    id: 4, category: 'Follow-Up Tests', priority: 'important',
    title: 'Repeat Liver Function Test (LFT)',
    description: 'SGPT (ALT) and SGOT (AST) are approaching upper limits, suggesting early hepatocellular stress. A repeat LFT after 4\u20136 weeks of dietary improvement and alcohol avoidance is advised.',
    action: 'Book LFT in 4\u20136 weeks', timeframe: '4\u20136 weeks',
    relatedTest: 'SGPT (ALT) \u00b7 SGOT (AST)',
  },
  {
    id: 5, category: 'Diet & Nutrition', priority: 'important',
    title: 'Eliminate Refined Carbohydrates',
    description: 'Immediately reduce white rice, white bread, processed snacks, and sugary beverages. Switch to a low-GI diet with whole grains, legumes, and green vegetables to restore insulin sensitivity.',
    action: 'Start low-GI diet today', timeframe: 'Immediate',
    relatedTest: 'Insulin Fasting \u00b7 Plasma Glucose',
  },
  {
    id: 6, category: 'Diet & Nutrition', priority: 'routine',
    title: 'Boost Vitamin D Through Food & Sunlight',
    description: 'Take 15\u201330 min of early morning sunlight daily. Include fatty fish (salmon, mackerel), egg yolks, and fortified dairy in your regular diet to accelerate Vitamin D recovery.',
    action: 'Daily sun + dietary change', timeframe: 'Ongoing',
    relatedTest: 'Vitamin D, 25 Hydroxy (OH)',
  },
  {
    id: 7, category: 'Lifestyle', priority: 'important',
    title: 'Begin Structured Aerobic Exercise',
    description: '30 minutes of aerobic activity (brisk walking, cycling, swimming) 5 days/week reduces insulin resistance, improves HDL cholesterol, and supports liver enzyme normalisation \u2014 all validated clinically.',
    action: 'Start 30-min/day aerobics', timeframe: 'Start this week',
    relatedTest: 'Insulin Fasting \u00b7 Lipid Profile',
  },
  {
    id: 8, category: 'Lifestyle', priority: 'routine',
    title: 'Optimise Sleep & Stress Management',
    description: 'Chronic cortisol elevation from poor sleep and stress directly worsens insulin resistance and promotes visceral fat accumulation. Target 7\u20138 hours of quality sleep with a consistent schedule.',
    action: 'Establish sleep/stress routine', timeframe: 'Ongoing',
    relatedTest: 'General Wellness',
  },
  {
    id: 9, category: 'Monitor', priority: 'routine',
    title: 'Annual Comprehensive Screening',
    description: 'Thyroid (TSH: 1.7 \u00b5IU/mL), Lipid Profile (Total Cholesterol: 172 mg/dL), and haematology are all within normal limits. Maintain current healthy habits and schedule a full-panel checkup in 12 months.',
    action: 'Book annual screening', timeframe: 'In 12 months',
    relatedTest: 'TSH \u00b7 Lipid Profile \u00b7 CBC',
  },
];

/* ===================================================================
   SHARED COLOR / META HELPERS
   =================================================================== */

const CAT_META: Record<RecCategory, { color: string; bg: string; border: string; gradient: string }> = {
  'Medication Alert': { color: '#be123c', bg: '#fff1f2', border: '#fda4af', gradient: 'linear-gradient(135deg,#be123c,#e11d48)' },
  'Follow-Up Tests':  { color: '#1d4ed8', bg: '#eff6ff', border: '#93c5fd', gradient: 'linear-gradient(135deg,#1d4ed8,#2563eb)' },
  'Diet & Nutrition': { color: '#166534', bg: '#f0fdf4', border: '#86efac', gradient: 'linear-gradient(135deg,#166534,#15803d)' },
  'Lifestyle':        { color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd', gradient: 'linear-gradient(135deg,#6d28d9,#7c3aed)' },
  'Monitor':          { color: '#92400e', bg: '#fffbeb', border: '#fcd34d', gradient: 'linear-gradient(135deg,#92400e,#b45309)' },
};

const PRI_META: Record<RecPriority, { label: string; color: string; bg: string; border: string; barColor: string }> = {
  critical:  { label: 'CRITICAL',  color: '#be123c', bg: '#fff1f2', border: '#fecaca', barColor: '#be123c' },
  important: { label: 'IMPORTANT', color: '#b45309', bg: '#fffbeb', border: '#fde68a', barColor: '#d97706' },
  routine:   { label: 'ROUTINE',   color: '#166534', bg: '#f0fdf4', border: '#bbf7d0', barColor: '#22c55e' },
};

/* \u2500\u2500\u2500 SVG icons \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
const ICONS = {
  rx:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11h6M9 15h6M17 3H7a2 2 0 0 0-2 2v16l3-3 2 3 2-3 2 3 2-3 3 3V5a2 2 0 0 0-2-2z"/></svg>`,
  alert:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  check:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  leaf:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/></svg>`,
  pulse:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  monitor: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  clock:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  flask:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/></svg>`,
  arrow:   `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>`,
};

const CAT_ICON: Record<RecCategory, string> = {
  'Medication Alert': ICONS.alert,
  'Follow-Up Tests':  ICONS.check,
  'Diet & Nutrition': ICONS.leaf,
  'Lifestyle':        ICONS.pulse,
  'Monitor':          ICONS.monitor,
};


/* ===================================================================
   VERSION 1 — "Rx Prescription Board"
   Full-bleed brand-gradient header with Rx watermark.
   Two-column prescription-slip cards with priority strips,
   numbered badges, category chips, and related-test tags.
   =================================================================== */

function renderV1(_report: NormalizedReport, primaryColor: string): string {
  const critical  = RECOMMENDATIONS.filter(r => r.priority === 'critical');
  const important = RECOMMENDATIONS.filter(r => r.priority === 'important');
  const routine   = RECOMMENDATIONS.filter(r => r.priority === 'routine');

  const catCounts = new Map<RecCategory, number>();
  for (const r of RECOMMENDATIONS) catCounts.set(r.category, (catCounts.get(r.category) ?? 0) + 1);

  const catPills = [...catCounts.entries()].map(([cat, n]) => {
    const m = CAT_META[cat];
    return `
      <div class="v1-cat-pill" style="background:${m.bg}; border:1px solid ${m.border};">
        <span style="color:${m.color}; display:inline-flex;">${CAT_ICON[cat]}</span>
        <span class="v1-cat-pill-lbl" style="color:${m.color};">${cat}</span>
        <span class="v1-cat-pill-n" style="background:${m.color}; color:white;">${n}</span>
      </div>`;
  }).join('');

  const cardHtml = RECOMMENDATIONS.map((rec) => {
    const cm = CAT_META[rec.category];
    const pm = PRI_META[rec.priority];
    return `
      <div class="v1-card">
        <div class="v1-card-strip" style="background:${pm.barColor};"></div>
        <div class="v1-card-body">
          <div class="v1-card-head">
            <div class="v1-card-num" style="background:${cm.gradient};">${String(rec.id).padStart(2,'0')}</div>
            <div style="flex:1; min-width:0;">
              <div class="v1-card-chips">
                <span class="v1-chip" style="background:${cm.bg}; color:${cm.color}; border:1px solid ${cm.border};">
                  ${CAT_ICON[rec.category]}&nbsp;${rec.category}
                </span>
                <span class="v1-pri-chip" style="background:${pm.bg}; color:${pm.color}; border:1px solid ${pm.border};">
                  ${pm.label}
                </span>
              </div>
            </div>
          </div>
          <div class="v1-card-title">${rec.title}</div>
          <div class="v1-card-desc">${rec.description}</div>
          <div class="v1-card-footer">
            <span class="v1-card-test">${ICONS.flask}&nbsp;${rec.relatedTest}</span>
            <span class="v1-card-time" style="color:${pm.color}; background:${pm.bg}; border:1px solid ${pm.border};">
              ${ICONS.clock}&nbsp;${rec.timeframe}
            </span>
          </div>
          <div class="v1-card-action" style="background:${cm.bg}; border-top:1px solid ${cm.border};">
            <span style="color:${cm.color}; font-weight:700; display:inline-flex; align-items:center; gap:4px;">${ICONS.arrow}&nbsp;${rec.action}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
<style>
/* ── V1: Rx Prescription Board ─────────────────────────────────── */
.v1-wrap { font-family:'Inter','Segoe UI',system-ui,sans-serif; display:flex; flex-direction:column; gap:12px; }

.v1-header {
  position:relative; overflow:hidden; border-radius:12px;
  background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 55%, #0f172a 100%);
  padding: 16px 22px 14px; color:white;
}
.v1-header-rx {
  position:absolute; right:-8px; top:-12px; font-size:88px; font-weight:900;
  color:rgba(255,255,255,0.06); letter-spacing:-6px; line-height:1; pointer-events:none;
  font-family:'Georgia','Times New Roman',serif;
}
.v1-header-top { display:flex; align-items:center; gap:12px; position:relative; z-index:1; }
.v1-header-icon {
  width:42px; height:42px; border-radius:10px; flex-shrink:0;
  background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.2);
  display:flex; align-items:center; justify-content:center;
}
.v1-header-title { font-size:15px; font-weight:800; letter-spacing:-0.02em; }
.v1-header-sub { font-size:10px; color:rgba(255,255,255,0.7); margin-top:3px; }
.v1-stats { display:flex; gap:0; margin-left:auto; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.15); }
.v1-stat { padding:8px 14px; text-align:center; background:rgba(255,255,255,0.08); border-right:1px solid rgba(255,255,255,0.1); }
.v1-stat:last-child { border-right:none; }
.v1-stat-n { font-size:18px; font-weight:900; line-height:1; }
.v1-stat-l { font-size:8px; font-weight:700; letter-spacing:0.07em; opacity:0.7; margin-top:2px; }

.v1-cats { display:flex; gap:6px; flex-wrap:wrap; }
.v1-cat-pill { display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:20px; }
.v1-cat-pill-lbl { font-size:9.5px; font-weight:700; letter-spacing:0.02em; }
.v1-cat-pill-n { font-size:9px; font-weight:800; padding:1px 6px; border-radius:10px; margin-left:2px; }

.v1-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.v1-card { border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; background:white; box-shadow:0 1px 4px rgba(0,0,0,0.05); display:flex; flex-direction:column; }
.v1-card-strip { height:3px; width:100%; flex-shrink:0; }
.v1-card-body { display:flex; flex-direction:column; flex:1; }
.v1-card-head { display:flex; align-items:flex-start; gap:9px; padding:10px 12px 6px; }
.v1-card-num {
  width:28px; height:28px; border-radius:8px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:900; color:white; letter-spacing:-0.02em;
}
.v1-card-chips { display:flex; gap:4px; flex-wrap:wrap; padding-top:2px; }
.v1-chip { display:inline-flex; align-items:center; gap:3px; font-size:8.5px; font-weight:700; padding:2px 7px; border-radius:12px; letter-spacing:0.03em; }
.v1-pri-chip { font-size:8px; font-weight:800; padding:2px 7px; border-radius:12px; letter-spacing:0.06em; }
.v1-card-title { font-size:11px; font-weight:800; color:#0f172a; padding:0 12px 4px; line-height:1.35; letter-spacing:-0.01em; }
.v1-card-desc { font-size:9.5px; line-height:1.65; color:#475569; padding:0 12px 8px; flex:1; }
.v1-card-footer { display:flex; align-items:center; gap:6px; padding:0 12px 8px; flex-wrap:wrap; }
.v1-card-test { display:inline-flex; align-items:center; gap:3px; font-size:8.5px; color:#64748b; background:#f8fafc; border:1px solid #e2e8f0; padding:2px 8px; border-radius:10px; flex:1; min-width:0; overflow:hidden; white-space:nowrap; }
.v1-card-time { display:inline-flex; align-items:center; gap:3px; font-size:8.5px; font-weight:700; padding:2px 8px; border-radius:10px; flex-shrink:0; }
.v1-card-action { margin-top:auto; padding:7px 12px; display:flex; align-items:center; font-size:9px; letter-spacing:0.02em; }

.v1-disclaimer { font-size:8.5px; color:#94a3b8; line-height:1.6; text-align:center; padding:9px 16px; background:#f8fafc; border-radius:8px; border:1px dashed #e2e8f0; }
</style>

<div class="v1-wrap">
  <div class="v1-header">
    <div class="v1-header-rx">Rx</div>
    <div class="v1-header-top">
      <div class="v1-header-icon">${ICONS.rx}</div>
      <div>
        <div class="v1-header-title">Personalised Health Recommendations</div>
        <div class="v1-header-sub">${RECOMMENDATIONS.length} action items across ${catCounts.size} categories &nbsp;&middot;&nbsp; Consult your physician before acting</div>
      </div>
      <div class="v1-stats">
        <div class="v1-stat"><div class="v1-stat-n" style="color:#fca5a5;">${critical.length}</div><div class="v1-stat-l">CRITICAL</div></div>
        <div class="v1-stat"><div class="v1-stat-n" style="color:#fde68a;">${important.length}</div><div class="v1-stat-l">IMPORTANT</div></div>
        <div class="v1-stat"><div class="v1-stat-n" style="color:#86efac;">${routine.length}</div><div class="v1-stat-l">ROUTINE</div></div>
      </div>
    </div>
  </div>
  <div class="v1-cats">${catPills}</div>
  <div class="v1-grid">${cardHtml}</div>
  <div class="v1-disclaimer">&#9877; These recommendations are based on standard laboratory reference ranges and are intended for informational purposes only. Not a substitute for professional medical advice. Always consult a qualified healthcare provider.</div>
</div>`;
}

/* ===================================================================
   VERSION 2 — "Clinical Intelligence Feed"
   Split dark-panel header with health score arc gauge on the left.
   Full-width feed cards: left priority block + content + action CTA.
   Premium clinical document aesthetic.
   =================================================================== */

function renderV2(_report: NormalizedReport, primaryColor: string): string {
  const critical  = RECOMMENDATIONS.filter(r => r.priority === 'critical');
  const important = RECOMMENDATIONS.filter(r => r.priority === 'important');
  const routine   = RECOMMENDATIONS.filter(r => r.priority === 'routine');

  const SCORE = 72;
  const r = 36, cx = 46, cy = 46;
  const circumference = Math.PI * r;
  const filled = (SCORE / 100) * circumference;
  const scoreColor = SCORE >= 75 ? '#4ade80' : SCORE >= 50 ? '#fbbf24' : '#f87171';

  const feedCards = RECOMMENDATIONS.map((rec, i) => {
    const cm = CAT_META[rec.category];
    const pm = PRI_META[rec.priority];
    const isOdd = i % 2 === 0;
    return `
      <div class="v2-feed-card" style="border-left:4px solid ${pm.barColor}; background:${isOdd ? 'white' : '#fcfcfd'};">
        <div class="v2-feed-num" style="background:${pm.bg}; border-right:1px solid ${pm.border};">
          <div class="v2-feed-num-n" style="color:${pm.color};">${String(rec.id).padStart(2,'0')}</div>
          <div class="v2-feed-num-dot" style="background:${pm.barColor};"></div>
          <div class="v2-feed-num-label" style="color:${pm.color};">${pm.label}</div>
        </div>
        <div class="v2-feed-content">
          <div class="v2-feed-chips">
            <span class="v2-cat-chip" style="background:${cm.bg}; color:${cm.color}; border:1px solid ${cm.border};">
              ${CAT_ICON[rec.category]}&nbsp;${rec.category}
            </span>
          </div>
          <div class="v2-feed-title">${rec.title}</div>
          <div class="v2-feed-desc">${rec.description}</div>
          <div class="v2-feed-meta">
            <span class="v2-feed-test">${ICONS.flask}&nbsp;${rec.relatedTest}</span>
            <span class="v2-feed-time" style="color:${pm.color};">${ICONS.clock}&nbsp;${rec.timeframe}</span>
          </div>
        </div>
        <div class="v2-feed-action" style="background:${cm.gradient};">
          <div class="v2-feed-action-text">${rec.action}</div>
          <div class="v2-feed-action-arrow">${ICONS.arrow}</div>
        </div>
      </div>`;
  }).join('');

  return `
<style>
/* ── V2: Clinical Intelligence Feed ──────────────────────────── */
.v2-wrap { font-family:'Inter','Segoe UI',system-ui,sans-serif; display:flex; flex-direction:column; gap:0; }

.v2-header { display:flex; border-radius:12px; overflow:hidden; margin-bottom:12px; }
.v2-header-left {
  width:160px; flex-shrink:0;
  background:linear-gradient(160deg,#0f172a 0%,#1e293b 100%);
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding:16px 12px; gap:6px;
}
.v2-score-arc-label { font-size:8px; font-weight:700; letter-spacing:0.1em; color:rgba(255,255,255,0.55); text-align:center; margin-top:2px; }
.v2-header-right {
  flex:1; background:${primaryColor}; color:white;
  padding:16px 20px; display:flex; flex-direction:column; justify-content:space-between;
  position:relative; overflow:hidden;
}
.v2-header-right::before { content:''; position:absolute; right:-30px; top:-30px; width:130px; height:130px; border-radius:50%; background:rgba(255,255,255,0.05); }
.v2-header-right::after  { content:''; position:absolute; right:50px; bottom:-50px; width:100px; height:100px; border-radius:50%; background:rgba(255,255,255,0.04); }
.v2-header-title { font-size:15px; font-weight:800; letter-spacing:-0.02em; line-height:1.3; position:relative; z-index:1; }
.v2-header-sub { font-size:10px; color:rgba(255,255,255,0.7); margin-top:4px; position:relative; z-index:1; }
.v2-header-stat-row { display:flex; gap:10px; position:relative; z-index:1; margin-top:6px; }
.v2-hstat { padding:6px 12px; border-radius:8px; text-align:center; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.15); }
.v2-hstat-n { font-size:17px; font-weight:900; line-height:1; }
.v2-hstat-l { font-size:8px; font-weight:700; letter-spacing:0.07em; opacity:0.75; margin-top:1px; }

.v2-feed-list { display:flex; flex-direction:column; gap:0; border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; }
.v2-feed-card { display:flex; align-items:stretch; }
.v2-feed-num { width:58px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px 6px; gap:4px; border-bottom:1px solid #f1f5f9; }
.v2-feed-num-n { font-size:17px; font-weight:900; line-height:1; letter-spacing:-0.02em; }
.v2-feed-num-dot { width:6px; height:6px; border-radius:50%; }
.v2-feed-num-label { font-size:7px; font-weight:800; letter-spacing:0.07em; }
.v2-feed-content { flex:1; padding:10px 14px; border-bottom:1px solid #f1f5f9; min-width:0; }
.v2-feed-chips { display:flex; gap:5px; margin-bottom:5px; }
.v2-cat-chip { display:inline-flex; align-items:center; gap:3px; font-size:8.5px; font-weight:700; padding:2px 8px; border-radius:20px; letter-spacing:0.03em; }
.v2-feed-title { font-size:11px; font-weight:800; color:#0f172a; margin-bottom:4px; line-height:1.3; letter-spacing:-0.01em; }
.v2-feed-desc { font-size:9.5px; line-height:1.65; color:#475569; margin-bottom:6px; }
.v2-feed-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.v2-feed-test { display:inline-flex; align-items:center; gap:3px; font-size:8.5px; color:#64748b; background:#f8fafc; border:1px solid #e2e8f0; padding:2px 8px; border-radius:10px; }
.v2-feed-time { display:inline-flex; align-items:center; gap:3px; font-size:8.5px; font-weight:700; }
.v2-feed-action { width:72px; flex-shrink:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 6px; gap:6px; border-bottom:1px solid rgba(255,255,255,0.1); }
.v2-feed-action-text { font-size:8px; font-weight:700; color:white; text-align:center; line-height:1.3; letter-spacing:0.03em; }
.v2-feed-action-arrow { color:rgba(255,255,255,0.8); display:flex; }

.v2-disclaimer { font-size:8.5px; color:#94a3b8; line-height:1.6; text-align:center; padding:9px 16px; background:#f8fafc; border-radius:8px; border:1px dashed #e2e8f0; margin-top:10px; }
</style>

<div class="v2-wrap">
  <div class="v2-header">
    <div class="v2-header-left">
      <svg width="92" height="55" viewBox="0 0 92 55">
        <path d="M 10 46 A 36 36 0 0 1 82 46" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="7" stroke-linecap="round"/>
        <path d="M 10 46 A 36 36 0 0 1 82 46" fill="none" stroke="${scoreColor}" stroke-width="7" stroke-linecap="round"
          stroke-dasharray="${filled.toFixed(1)} ${(circumference - filled).toFixed(1)}" stroke-dashoffset="0"/>
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="20" font-weight="900" fill="${scoreColor}" font-family="Inter,system-ui,sans-serif">${SCORE}</text>
        <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="8" font-weight="700" fill="rgba(255,255,255,0.55)" font-family="Inter,system-ui,sans-serif" letter-spacing="1">SCORE</text>
      </svg>
      <div class="v2-score-arc-label">HEALTH INDEX</div>
    </div>
    <div class="v2-header-right">
      <div>
        <div class="v2-header-title">Clinical Health Recommendations</div>
        <div class="v2-header-sub">${RECOMMENDATIONS.length} personalised actions &middot; sorted by clinical priority</div>
      </div>
      <div class="v2-header-stat-row">
        <div class="v2-hstat"><div class="v2-hstat-n" style="color:#fca5a5;">${critical.length}</div><div class="v2-hstat-l">CRITICAL</div></div>
        <div class="v2-hstat"><div class="v2-hstat-n" style="color:#fde68a;">${important.length}</div><div class="v2-hstat-l">IMPORTANT</div></div>
        <div class="v2-hstat"><div class="v2-hstat-n" style="color:#86efac;">${routine.length}</div><div class="v2-hstat-l">ROUTINE</div></div>
      </div>
    </div>
  </div>
  <div class="v2-feed-list">${feedCards}</div>
  <div class="v2-disclaimer">&#9877; These recommendations are based on standard laboratory reference ranges for informational purposes only. Not a substitute for professional medical advice. Always consult a qualified healthcare provider.</div>
</div>`;
}

/* ===================================================================
   VERSION 3 — "Health Command Center"
   Large gradient header with oversized score and dot-grid background.
   Horizontal category count strip. Two-column dashboard:
   left = priority action cards with gradient top strips;
   right = quick-win compact list.
   =================================================================== */

function renderV3(_report: NormalizedReport, primaryColor: string): string {
  const critical  = RECOMMENDATIONS.filter(r => r.priority === 'critical');
  const important = RECOMMENDATIONS.filter(r => r.priority === 'important');
  const routine   = RECOMMENDATIONS.filter(r => r.priority === 'routine');
  const urgent    = [...critical, ...important];

  const catCounts = new Map<RecCategory, number>();
  for (const r of RECOMMENDATIONS) catCounts.set(r.category, (catCounts.get(r.category) ?? 0) + 1);

  const catStrip = [...catCounts.entries()].map(([cat, n]) => {
    const m = CAT_META[cat];
    return `
      <div class="v3-cat-strip-item" style="background:${m.bg}; border:1px solid ${m.border};">
        <div class="v3-cat-strip-icon" style="background:${m.color}; color:white;">${CAT_ICON[cat]}</div>
        <div>
          <div class="v3-cat-strip-name" style="color:${m.color};">${cat}</div>
          <div class="v3-cat-strip-count" style="color:${m.color};">${n} item${n > 1 ? 's' : ''}</div>
        </div>
      </div>`;
  }).join('');

  const actionCards = urgent.map((rec) => {
    const cm = CAT_META[rec.category];
    const pm = PRI_META[rec.priority];
    const isCrit = rec.priority === 'critical';
    return `
      <div class="v3-action-card">
        <div class="v3-action-card-top" style="background:${isCrit ? 'linear-gradient(to right,#be123c,#e11d48)' : 'linear-gradient(to right,#b45309,#d97706)'};">
          <div class="v3-action-card-badge">
            <span class="v3-action-badge-num">${String(rec.id).padStart(2,'0')}</span>
            <span class="v3-action-badge-label">${pm.label}</span>
          </div>
          <span class="v3-action-cat-chip" style="background:rgba(255,255,255,0.18); color:white;">
            ${CAT_ICON[rec.category]}&nbsp;${rec.category}
          </span>
        </div>
        <div class="v3-action-card-body">
          <div class="v3-action-title">${rec.title}</div>
          <div class="v3-action-desc">${rec.description}</div>
          <div class="v3-action-footer">
            <span class="v3-action-test">${ICONS.flask}&nbsp;${rec.relatedTest}</span>
            <div class="v3-action-cta" style="background:${cm.gradient};">${rec.action}&nbsp;${ICONS.arrow}</div>
          </div>
          <div class="v3-action-time" style="color:${pm.color}; background:${pm.bg}; border:1px solid ${pm.border};">
            ${ICONS.clock}&nbsp;${rec.timeframe}
          </div>
        </div>
      </div>`;
  }).join('');

  const quickWins = routine.map((rec) => {
    const cm = CAT_META[rec.category];
    return `
      <div class="v3-qw-card">
        <div class="v3-qw-icon" style="background:${cm.gradient};">${CAT_ICON[rec.category]}</div>
        <div>
          <div class="v3-qw-cat" style="color:${cm.color};">${rec.category}</div>
          <div class="v3-qw-title">${rec.title}</div>
          <div class="v3-qw-desc">${rec.description}</div>
          <div class="v3-qw-footer">
            <span class="v3-qw-time">${ICONS.clock}&nbsp;${rec.timeframe}</span>
          </div>
        </div>
      </div>`;
  }).join('');

  return `
<style>
/* ── V3: Health Command Center ────────────────────────────────── */
/* ── wrapper ── */
.v3-hcc { font-family:'Inter','Segoe UI',system-ui,sans-serif; display:flex; flex-direction:column; gap:12px; }

/* ── header ── */
.v3-hdr {
  background:linear-gradient(135deg,#0f172a 0%,#1e293b 45%,${primaryColor} 100%);
  border-radius:14px; padding:22px 24px 18px; position:relative; overflow:hidden;
  color:white;
}
.v3-hdr-bg {
  position:absolute; inset:0; opacity:0.07; pointer-events:none;
  background-image:radial-gradient(circle,rgba(255,255,255,0.9) 1px,transparent 1px);
  background-size:22px 22px;
}
.v3-hdr-inner { position:relative; z-index:1; display:flex; align-items:center; gap:20px; }
.v3-hdr-score { flex-shrink:0; text-align:center; }
.v3-hdr-score-num { font-size:52px; font-weight:900; letter-spacing:-2px; line-height:1; color:white; }
.v3-hdr-score-max { font-size:14px; color:rgba(255,255,255,0.55); font-weight:600; letter-spacing:0.04em; }
.v3-hdr-divider { width:2px; align-self:stretch; background:rgba(255,255,255,0.18); border-radius:1px; flex-shrink:0; }
.v3-hdr-content { flex:1; }
.v3-hdr-title { font-size:18px; font-weight:800; letter-spacing:-0.02em; line-height:1.2; }
.v3-hdr-sub { font-size:11px; color:rgba(255,255,255,0.65); margin-top:5px; line-height:1.6; }
.v3-hdr-tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:10px; }
.v3-hdr-tag {
  font-size:10px; font-weight:700; letter-spacing:0.04em; padding:3px 10px;
  border-radius:20px; border:1.5px solid; white-space:nowrap;
}

/* ── category strip ── */
.v3-cat-strip { display:flex; gap:8px; flex-wrap:wrap; }
.v3-cat-strip-item {
  display:flex; align-items:center; gap:8px; padding:9px 13px;
  border-radius:10px; flex:1; min-width:100px;
}
.v3-cat-strip-icon {
  width:28px; height:28px; border-radius:8px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:14px;
}
.v3-cat-strip-name { font-size:9.5px; font-weight:700; letter-spacing:0.02em; line-height:1.2; }
.v3-cat-strip-count { font-size:11px; font-weight:800; letter-spacing:-0.01em; }

/* ── two-column grid ── */
.v3-grid { display:grid; grid-template-columns:1.15fr 0.85fr; gap:10px; }

/* ── col header ── */
.v3-col-hdr { display:flex; align-items:center; gap:7px; margin-bottom:8px; padding-bottom:8px; border-bottom:2px solid; }
.v3-col-hdr-icon { width:24px; height:24px; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:12px; }
.v3-col-hdr-title { font-size:10.5px; font-weight:800; letter-spacing:0.04em; }
.v3-col-hdr-ct { margin-left:auto; font-size:18px; font-weight:900; line-height:1; }

/* ── action cards (left column) ── */
.v3-action-list { display:flex; flex-direction:column; gap:8px; }
.v3-action-card { border-radius:10px; overflow:hidden; border:1px solid #e2e8f0; background:white; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.v3-action-card-top {
  padding:8px 12px; display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.v3-action-card-badge { display:flex; align-items:baseline; gap:4px; }
.v3-action-badge-num { font-size:18px; font-weight:900; color:white; line-height:1; }
.v3-action-badge-label { font-size:8px; font-weight:700; letter-spacing:0.06em; color:rgba(255,255,255,0.8); text-transform:uppercase; }
.v3-action-cat-chip { font-size:9px; font-weight:700; padding:3px 9px; border-radius:20px; letter-spacing:0.03em; }
.v3-action-card-body { padding:11px 13px 12px; }
.v3-action-title { font-size:11.5px; font-weight:800; color:#0f172a; margin-bottom:4px; }
.v3-action-desc { font-size:9.5px; line-height:1.65; color:#475569; margin-bottom:8px; }
.v3-action-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:7px; }
.v3-action-test { font-size:9px; color:#64748b; background:#f1f5f9; padding:3px 8px; border-radius:6px; }
.v3-action-cta {
  font-size:9px; font-weight:700; color:white; padding:4px 11px;
  border-radius:6px; letter-spacing:0.03em; white-space:nowrap;
}
.v3-action-time { font-size:9px; font-weight:600; padding:3px 9px; border-radius:20px; display:inline-flex; align-items:center; gap:4px; }

/* ── quick-win cards (right column) ── */
.v3-qw-list { display:flex; flex-direction:column; gap:8px; }
.v3-qw-card {
  display:flex; align-items:flex-start; gap:10px; padding:10px 12px;
  background:white; border-radius:10px; border:1px solid #e2e8f0;
}
.v3-qw-icon {
  width:32px; height:32px; border-radius:9px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center; font-size:15px; margin-top:1px;
}
.v3-qw-cat { font-size:9px; font-weight:700; letter-spacing:0.03em; margin-bottom:2px; }
.v3-qw-title { font-size:10.5px; font-weight:700; color:#0f172a; margin-bottom:3px; }
.v3-qw-desc { font-size:9px; line-height:1.6; color:#64748b; margin-bottom:5px; }
.v3-qw-footer { display:flex; align-items:center; gap:6px; }
.v3-qw-time { font-size:8.5px; font-weight:600; color:#94a3b8; background:#f8fafc; padding:2px 7px; border-radius:5px; border:1px solid #e2e8f0; }

/* ── disclaimer ── */
.v3-disclaimer {
  font-size:9px; color:#94a3b8; line-height:1.6; text-align:center;
  padding:10px 16px; background:#f8fafc; border-radius:8px; border:1px dashed #e2e8f0;
}
</style>

<div class="v3-hcc">

  <!-- HEADER -->
  <div class="v3-hdr">
    <div class="v3-hdr-bg"></div>
    <div class="v3-hdr-inner">
      <div class="v3-hdr-score">
        <div class="v3-hdr-score-num">72</div>
        <div class="v3-hdr-score-max">/ 100</div>
      </div>
      <div class="v3-hdr-divider"></div>
      <div class="v3-hdr-content">
        <div class="v3-hdr-title">Health Command Center</div>
        <div class="v3-hdr-sub">
          ${RECOMMENDATIONS.length} personalised recommendations across ${[...new Set(RECOMMENDATIONS.map(r => r.category))].length} health categories
        </div>
        <div class="v3-hdr-tags">
          <span class="v3-hdr-tag" style="border-color:rgba(239,68,68,0.6); color:#fca5a5; background:rgba(239,68,68,0.12);">
            &#9888; ${critical.length} Critical
          </span>
          <span class="v3-hdr-tag" style="border-color:rgba(245,158,11,0.6); color:#fcd34d; background:rgba(245,158,11,0.12);">
            &#33; ${important.length} Important
          </span>
          <span class="v3-hdr-tag" style="border-color:rgba(34,197,94,0.6); color:#86efac; background:rgba(34,197,94,0.12);">
            &#10003; ${routine.length} Routine
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- CATEGORY STRIP -->
  <div class="v3-cat-strip">${catStrip}</div>

  <!-- TWO COLUMNS -->
  <div class="v3-grid">

    <!-- LEFT: Priority Actions -->
    <div>
      <div class="v3-col-hdr" style="border-color:#fecaca;">
        <div class="v3-col-hdr-icon" style="background:#fff1f2; color:#be123c;">&#9888;</div>
        <span class="v3-col-hdr-title" style="color:#be123c;">PRIORITY ACTIONS</span>
        <span class="v3-col-hdr-ct" style="color:#be123c;">${urgent.length}</span>
      </div>
      <div class="v3-action-list">${actionCards}</div>
    </div>

    <!-- RIGHT: Quick Wins -->
    <div>
      <div class="v3-col-hdr" style="border-color:#bbf7d0;">
        <div class="v3-col-hdr-icon" style="background:#f0fdf4; color:#16a34a;">&#10003;</div>
        <span class="v3-col-hdr-title" style="color:#16a34a;">QUICK WINS &amp; MAINTENANCE</span>
        <span class="v3-col-hdr-ct" style="color:#16a34a;">${routine.length}</span>
      </div>
      <div class="v3-qw-list">${quickWins}</div>
    </div>

  </div>

  <!-- DISCLAIMER -->
  <div class="v3-disclaimer">
    &#9877; These recommendations are based on laboratory reference ranges and are for informational purposes only.
    They do not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider.
  </div>

</div>`;
}

/* ===================================================================
   PAGE REGISTRATION
   =================================================================== */

export const inDepthRecommendationsPage: ReportPage = {
  name: 'indepth-recommendations',

  generate(ctx: PageRenderContext): string {
    const report = ctx.data as NormalizedReport;
    const primaryColor = ctx.branding.primaryColor ?? '#4F46E5';

    if (ACTIVE_DESIGN === 'v2') return renderV2(report, primaryColor);
    if (ACTIVE_DESIGN === 'v3') return renderV3(report, primaryColor);
    return renderV1(report, primaryColor);
  },
};
