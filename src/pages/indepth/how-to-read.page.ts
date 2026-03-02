/**
 * InDepth — How to Read This Report Page
 *
 * Static explainer page that teaches the patient how to interpret
 * the Smart Report's visual language:
 *   - Smart Report Flow (Parameters → Sliders → Profiles → Risk Score → Diet → Lifestyle)
 *   - What Parameters, Profiles, and Risk Score mean
 *   - Diet & Recommendations explained
 *   - Color legend (Normal / Borderline / High-Low)
 *
 * This page does NOT depend on the report data — it is static content
 * driven only by strategy flags (premium pages include more detail).
 *
 * Receives: NormalizedReport (for patient header only)
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons (Lucide-style, 24×24 viewBox)                     */
/* ------------------------------------------------------------------ */

const ICONS = {
  flaskConical: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>`,

  slidersHorizontal: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>`,

  layoutGrid: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,

  activity: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>`,

  salad: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.36 1.78 2.4 2.4 0 0 1 1.09 3.02"/></svg>`,

  heartPulse: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19.5 12.572l-7.5 7.428l-7.5-7.428A5 5 0 1 1 12 6.006a5 5 0 1 1 7.5 6.572"/><path d="M12 6L12 12"/><path d="M10 10l2 2 2-2"/></svg>`,

  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#249CC9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,

  // Colored icon variants for the three-column section
  flaskConicalColored: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/></svg>`,

  layoutGridColored: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,

  activityColored: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>`,

  saladColored: (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 21h10"/><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.36 1.78 2.4 2.4 0 0 1 1.09 3.02"/></svg>`,
};

/* ------------------------------------------------------------------ */
/*  Flow Steps Data                                                     */
/* ------------------------------------------------------------------ */

interface FlowStep {
  icon: string;
  label: string;
  desc: string;
}

const FLOW_STEPS: FlowStep[] = [
  { icon: ICONS.flaskConical, label: 'Parameters', desc: 'Test values' },
  { icon: ICONS.slidersHorizontal, label: 'Sliders', desc: 'Range indicator' },
  { icon: ICONS.layoutGrid, label: 'Profiles', desc: 'Marker groups' },
  { icon: ICONS.activity, label: 'Risk Score', desc: '0–100 scale' },
  { icon: ICONS.salad, label: 'Diet Plan', desc: 'Food guidance' },
  { icon: ICONS.heartPulse, label: 'Lifestyle', desc: 'Daily habits' },
];

/* ------------------------------------------------------------------ */
/*  Three Column Data                                                   */
/* ------------------------------------------------------------------ */

interface ColumnData {
  heading: string;
  iconHtml: string;
  bgColor: string;
  lines: string[];
}

const COLUMNS: ColumnData[] = [
  {
    heading: 'PARAMETERS',
    iconHtml: ICONS.flaskConicalColored('#2D4496'),
    bgColor: '#EEF3FF',
    lines: [
      'Individual test values',
      'with reference ranges',
      'showing normal / abnormal',
      'status for each marker',
    ],
  },
  {
    heading: 'PROFILES',
    iconHtml: ICONS.layoutGridColored('#0891B2'),
    bgColor: '#EFF9FC',
    lines: [
      'Grouped markers',
      'showing pattern',
      'across related tests',
      'e.g. Lipid, Liver, Kidney',
    ],
  },
  {
    heading: 'RISK SCORE',
    iconHtml: ICONS.activityColored('#BE123C'),
    bgColor: '#FFF1F4',
    lines: [
      'Overall score',
      '0–100 scale',
      'based on profile patterns',
      'and clinical guidelines',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Color Legend Data                                                    */
/* ------------------------------------------------------------------ */

interface LegendItem {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  desc: string;
}

const LEGEND_ITEMS: LegendItem[] = [
  {
    color: '#4CAF50',
    bgColor: '#F0FBF0',
    borderColor: '#C8E6C9',
    label: 'Normal',
    desc: 'Result is within the healthy reference range. No action needed.',
  },
  {
    color: '#F4B400',
    bgColor: '#FFFBEE',
    borderColor: '#FFE082',
    label: 'Borderline',
    desc: 'Result is close to the limit. Monitor and take precautionary steps.',
  },
  {
    color: '#E57373',
    bgColor: '#FFF5F5',
    borderColor: '#FFCDD2',
    label: 'High / Low',
    desc: 'Result is outside the reference range. Consult your physician.',
  },
];

/* ------------------------------------------------------------------ */
/*  Section Renderers                                                   */
/* ------------------------------------------------------------------ */

function renderTitleSection(): string {
  return `
<div class="htr-title-section">
  <h1 class="htr-title">HOW TO READ YOUR SMART REPORT</h1>
  <div class="htr-title-underline"></div>
  <p class="htr-subtitle">
    This page explains how results, profiles, and recommendations are connected.
  </p>
</div>`;
}

function renderFlowDiagram(): string {
  const stepsHtml = FLOW_STEPS.map((step, i) => {
    const chevron = i < FLOW_STEPS.length - 1
      ? `<div class="htr-flow-chevron">${ICONS.chevronRight}</div>`
      : '';

    return `
      <div class="htr-flow-step-wrapper">
        <div class="htr-flow-step">
          <div class="htr-flow-icon">${step.icon}</div>
          <p class="htr-flow-label">${step.label}</p>
          <p class="htr-flow-desc">${step.desc}</p>
        </div>
        ${chevron}
      </div>`;
  }).join('\n');

  return `
<div class="htr-flow-container">
  <p class="htr-flow-heading">Smart Report Flow</p>
  <div class="htr-flow-row">
    ${stepsHtml}
  </div>
</div>`;
}

function renderThreeColumnSection(): string {
  const colsHtml = COLUMNS.map((col) => {
    const linesHtml = col.lines.map(line => `<p class="htr-col-line">${line}</p>`).join('\n        ');

    return `
      <div class="htr-col-card" style="background:${col.bgColor}">
        <div class="htr-col-header">
          <div class="htr-col-icon-box">${col.iconHtml}</div>
          <p class="htr-col-heading">${col.heading}</p>
        </div>
        <div class="htr-col-body">
          ${linesHtml}
        </div>
      </div>`;
  }).join('\n');

  return `
<div class="htr-three-cols">
  ${colsHtml}
</div>`;
}

function renderDietSection(): string {
  return `
<div class="htr-diet-section">
  <div class="htr-diet-header">
    ${ICONS.saladColored('#249CC9')}
    <p class="htr-diet-title">DIET &amp; RECOMMENDATIONS EXPLAINED</p>
  </div>
  <p class="htr-diet-text">
    Based on your profile and risk score, personalized guidance is provided in later sections.
    Each recommendation is tailored to your specific test results, helping you make targeted
    lifestyle and dietary adjustments for better health outcomes.
  </p>
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
  <p class="htr-legend-heading">Color Legend</p>
  <div class="htr-legend-grid">
    ${itemsHtml}
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
    void report; // not used — static content only

    return `
<section class="indepth-how-to-read">
  ${renderTitleSection()}
  ${renderFlowDiagram()}
  ${renderThreeColumnSection()}
  ${renderDietSection()}
  ${renderColorLegend()}
</section>`;
  },
};
