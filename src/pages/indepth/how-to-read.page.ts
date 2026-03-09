/**
 * InDepth — How to Read This Report Page
 *
 * Version E: Split Panel Infographic
 *
 * Premium branded title banner at the top, then a split-panel layout:
 *   Left  → vertical flow timeline (Parameters → Sliders → Profiles → Risk → Diet → Lifestyle)
 *   Right → stacked explanation cards describing each section
 *
 * Below the split panel: color legend + disclaimer.
 *
 * This page does NOT depend on report data — it is static content.
 *
 * Receives: NormalizedReport (for patient header only)
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                    */
/* ------------------------------------------------------------------ */

const ICONS = {
  flaskConical: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>`,

  slidersHorizontal: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>`,

  layoutGrid: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,

  activity: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>`,

  salad: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.36 1.78 2.4 2.4 0 0 1 1.09 3.02"/></svg>`,

  heartPulse: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.572l-7.5 7.428l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/><path d="M12 6L12 12"/><path d="M10 10l2 2 2-2"/></svg>`,

  flaskColored: (c: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>`,

  gridColored: (c: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,

  activityColored: (c: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>`,

  saladColored: (c: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.36 1.78 2.4 2.4 0 0 1 1.09 3.02"/></svg>`,
};

/* ------------------------------------------------------------------ */
/*  Mini Face Icons (for slider explanation)                            */
/* ------------------------------------------------------------------ */

const FACE_LOW = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#DBEAFE" stroke="#93C5FD" stroke-width="0.5"/><circle cx="7.5" cy="8" r="1.3" fill="#2563EB"/><circle cx="12.5" cy="8" r="1.3" fill="#2563EB"/><path d="M7 13.5Q10 11 13 13.5" stroke="#2563EB" stroke-width="1.2" stroke-linecap="round"/></svg>';

const FACE_NORMAL = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#DCFCE7" stroke="#86EFAC" stroke-width="0.5"/><circle cx="7.5" cy="8" r="1.3" fill="#16A34A"/><circle cx="12.5" cy="8" r="1.3" fill="#16A34A"/><path d="M6.5 12Q10 15.5 13.5 12" stroke="#16A34A" stroke-width="1.2" stroke-linecap="round"/></svg>';

const FACE_HIGH = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#FEE2E2" stroke="#FCA5A5" stroke-width="0.5"/><circle cx="7.5" cy="8" r="1.3" fill="#DC2626"/><circle cx="12.5" cy="8" r="1.3" fill="#DC2626"/><path d="M7 14Q10 11.5 13 14" stroke="#DC2626" stroke-width="1.2" stroke-linecap="round"/></svg>';

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

interface FlowStep {
  icon: string;
  label: string;
  desc: string;
}

interface ExplainCard {
  iconHtml: string;
  title: string;
  accentColor: string;
  bgTint: string;
  cardBg: string;
  description: string;
}

interface LegendItem {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  desc: string;
}

const FLOW_STEPS: FlowStep[] = [
  { icon: ICONS.flaskConical, label: 'Parameters', desc: 'Your test values' },
  { icon: ICONS.slidersHorizontal, label: 'Range Sliders', desc: 'Visual indicators' },
  { icon: ICONS.layoutGrid, label: 'Health Profiles', desc: 'Grouped markers' },
  { icon: ICONS.activity, label: 'Risk Score', desc: '0\u2013100 health scale' },
  { icon: ICONS.salad, label: 'Diet Plan', desc: 'Food guidance' },
  { icon: ICONS.heartPulse, label: 'Lifestyle', desc: 'Daily habits' },
];

const EXPLAIN_CARDS: ExplainCard[] = [
  {
    iconHtml: ICONS.flaskColored('#2D4496'),
    title: 'PARAMETERS &amp; RANGES',
    accentColor: '#2D4496',
    bgTint: '#EEF3FF',
    cardBg: 'linear-gradient(135deg, #F5F7FF 0%, #EBF0FF 100%)',
    description:
      'Each test value is displayed alongside its reference range. Visual range sliders show exactly where your result falls \u2014 making it easy to see if you are within normal, borderline, or abnormal zones.',
  },
  {
    iconHtml: ICONS.gridColored('#0891B2'),
    title: 'HEALTH PROFILES',
    accentColor: '#0891B2',
    bgTint: '#EFF9FC',
    cardBg: 'linear-gradient(135deg, #F2FBFC 0%, #E5F7FA 100%)',
    description:
      'Related markers are grouped into profiles \u2014 such as Lipid, Liver, Kidney, and Thyroid \u2014 revealing patterns across your body systems rather than isolated numbers.',
  },
  {
    iconHtml: ICONS.activityColored('#BE123C'),
    title: 'RISK SCORE',
    accentColor: '#BE123C',
    bgTint: '#FFF1F4',
    cardBg: 'linear-gradient(135deg, #FFF5F7 0%, #FFECF0 100%)',
    description:
      'An overall health score from 0 to 100, calculated from your profile patterns and clinical guidelines. It gives you a quick, at-a-glance view of your health status.',
  },
  {
    iconHtml: ICONS.saladColored('#249CC9'),
    title: 'DIET &amp; LIFESTYLE',
    accentColor: '#249CC9',
    bgTint: '#F0F9FF',
    cardBg: 'linear-gradient(135deg, #F2FAFF 0%, #E5F3FF 100%)',
    description:
      'Personalized dietary guidance and daily habit recommendations tailored to your specific test results, helping you make targeted adjustments for better health outcomes.',
  },
];

const LEGEND_ITEMS: LegendItem[] = [
  {
    color: '#16A34A',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    label: 'Normal',
    desc: 'Within the healthy reference range. No action needed.',
  },
  {
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    label: 'Low',
    desc: 'Below the reference range. Consult your physician.',
  },
  {
    color: '#DC2626',
    bgColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    label: 'High',
    desc: 'Above the reference range. Consult your physician.',
  },
];

/* ------------------------------------------------------------------ */
/*  Section Renderers                                                   */
/* ------------------------------------------------------------------ */

function renderBanner(): string {
  return `
<div class="htr-banner">
  <div class="htr-banner-bg"></div>
  <div class="htr-banner-dots"></div>
  <div class="htr-banner-content">
    <div class="htr-banner-ornament">
      <span class="htr-ornament-line"></span>
      <span class="htr-ornament-diamond"></span>
      <span class="htr-ornament-line"></span>
    </div>
    <h1 class="htr-banner-title">HOW TO READ YOUR SMART REPORT</h1>
    <p class="htr-banner-subtitle">Understanding your personalized health intelligence results</p>
  </div>
</div>`;
}

function renderFlowTimeline(): string {
  const nodesHtml = FLOW_STEPS.map((step, i) => {
    const isLast = i === FLOW_STEPS.length - 1;
    return `
        <div class="htr-tl-node${isLast ? ' htr-tl-node--last' : ''}">
          <div class="htr-tl-icon">${step.icon}</div>
          <div class="htr-tl-text">
            <p class="htr-tl-label">${step.label}</p>
            <p class="htr-tl-desc">${step.desc}</p>
          </div>
        </div>`;
  }).join('\n');

  return `
<div class="htr-flow-panel">
  <p class="htr-panel-label">YOUR REPORT FLOW</p>
  <div class="htr-timeline">
    <div class="htr-tl-line"></div>
    ${nodesHtml}
  </div>
</div>`;
}

function renderExplainCards(): string {
  const cardsHtml = EXPLAIN_CARDS.map((card) => `
        <div class="htr-explain-card" style="border-left-color:${card.accentColor};background:${card.cardBg}">
          <div class="htr-explain-header">
            <div class="htr-explain-icon" style="background:${card.bgTint}">
              ${card.iconHtml}
            </div>
            <p class="htr-explain-title" style="color:${card.accentColor}">${card.title}</p>
          </div>
          <p class="htr-explain-desc">${card.description}</p>
        </div>`).join('\n');

  return `
<div class="htr-cards-panel">
  <p class="htr-panel-label">WHAT EACH SECTION MEANS</p>
  <div class="htr-explain-stack">
    ${cardsHtml}
  </div>
</div>`;
}

function renderColorLegend(): string {
  const itemsHtml = LEGEND_ITEMS.map((item) => `
      <div class="htr-legend-card" style="background:${item.bgColor};border-color:${item.borderColor}">
        <div class="htr-legend-label-row">
          <div class="htr-legend-dot" style="background:${item.color}"></div>
          <p class="htr-legend-label" style="color:${item.color}">${item.label}</p>
        </div>
        <p class="htr-legend-desc">${item.desc}</p>
      </div>`).join('\n');

  return `
<div class="htr-legend-section">
  <p class="htr-legend-heading">COLOR LEGEND</p>
  <div class="htr-legend-grid">
    ${itemsHtml}
  </div>
</div>`;
}

function renderVisualGuide(): string {
  const miniSlider = `
    <div class="htr-mini-slider">
      <div class="htr-mini-slider__bubble">72</div>
      <div class="htr-mini-slider__tip"></div>
      <div class="htr-mini-slider__track">
        <div class="htr-mini-slider__seg htr-mini-slider__seg--low"></div>
        <div class="htr-mini-slider__seg htr-mini-slider__seg--normal"></div>
        <div class="htr-mini-slider__seg htr-mini-slider__seg--high"></div>
      </div>
      <div class="htr-mini-slider__labels">
        <span class="htr-mini-slider__lbl" style="color:#EF4444;">${FACE_LOW} Low</span>
        <span class="htr-mini-slider__lbl" style="color:#10B981;">${FACE_NORMAL} Normal</span>
        <span class="htr-mini-slider__lbl" style="color:#EF4444;">${FACE_HIGH} High</span>
      </div>
    </div>`;

  const miniGauge = `
    <svg class="htr-mini-gauge" width="90" height="58" viewBox="0 0 90 58">
      <path d="M 13 47 A 32 32 0 0 1 34 18" fill="none" stroke="#f87171" stroke-width="7" stroke-linecap="round"/>
      <path d="M 36 17 A 32 32 0 0 1 63 21" fill="none" stroke="#fbbf24" stroke-width="7" stroke-linecap="round"/>
      <path d="M 65 23 A 32 32 0 0 1 77 47" fill="none" stroke="#4ade80" stroke-width="7" stroke-linecap="round"/>
      <line x1="45" y1="48" x2="62" y2="31" stroke="#334155" stroke-width="2" stroke-linecap="round"/>
      <circle cx="62" cy="31" r="4" fill="#4ade80" stroke="#fff" stroke-width="1.5"/>
      <circle cx="45" cy="48" r="3" fill="#fff" stroke="#334155" stroke-width="1.5"/>
      <text x="8" y="56" font-size="8" fill="#9ca3af" font-family="Inter,sans-serif">0</text>
      <text x="74" y="56" font-size="8" fill="#9ca3af" font-family="Inter,sans-serif">100</text>
    </svg>`;

  return `
<div class="htr-visual-section">
  <p class="htr-panel-label">UNDERSTANDING YOUR VISUALS</p>
  <div class="htr-visual-grid">
    <div class="htr-vis-card">
      <p class="htr-vis-title">Range Slider</p>
      ${miniSlider}
      <p class="htr-vis-desc">
        Each parameter is shown on a 3-zone color track. A floating marker
        displays your measured value and its position \u2014 Low (red),
        Normal (green), or High (red).
      </p>
    </div>
    <div class="htr-vis-card">
      <p class="htr-vis-title">Health Score Gauge</p>
      <div class="htr-vis-gauge-wrap">${miniGauge}</div>
      <p class="htr-vis-desc">
        Your overall score (0\u2013100) on a semi-circular gauge.
        The needle and color zone show your status \u2014 Red for Attention,
        Amber for Monitor, Green for Healthy.
      </p>
    </div>
  </div>
</div>`;
}

function renderDisclaimer(): string {
  const shieldIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`;

  return `
<div class="htr-disclaimer">
  <div class="htr-disclaimer-card">
    <div class="htr-disclaimer-icon">${shieldIcon}</div>
    <div class="htr-disclaimer-body">
      <p class="htr-disclaimer-title">IMPORTANT NOTICE</p>
      <p class="htr-disclaimer-point">This guide is for informational purposes only and does not constitute medical advice.</p>
      <p class="htr-disclaimer-point">Results should always be interpreted by a qualified healthcare professional in the context of your complete medical history.</p>
      <p class="htr-disclaimer-point">Reference ranges may vary between laboratories.</p>
    </div>
  </div>
</div>`;
}

/* ------------------------------------------------------------------ */
/*  Page Export                                                          */
/* ------------------------------------------------------------------ */

export const inDepthHowToReadPage: ReportPage = {
  name: 'indepth-how-to-read',

  generate(ctx: PageRenderContext): string {
    const report = ctx.data as NormalizedReport;
    void report;

    return `
<section class="indepth-how-to-read">
  ${renderBanner()}
  <div class="htr-split-container">
    ${renderFlowTimeline()}
    <div class="htr-split-divider"></div>
    ${renderExplainCards()}
  </div>
  ${renderColorLegend()}
  ${renderVisualGuide()}
  ${renderDisclaimer()}
</section>`;
  },
};
