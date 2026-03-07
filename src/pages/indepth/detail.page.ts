/**
 * InDepth — Detail Page  (Option A · Clinical Premium)
 *
 * One page per profile showing the full parameter-level breakdown:
 *
 *  ┌─────────────────────────────────────────────────────┐
 *  │ 1. PROFILE HERO — gradient card                     │
 *  │    Speedometer gauge | Profile name | stat pills    │
 *  ├─────────────────────────────────────────────────────┤
 *  │ 2. ANALYTICS STRIP — metric pill cards              │
 *  │    Total | Abnormal | Normal | Score                │
 *  ├─────────────────────────────────────────────────────┤
 *  │ 3. FLAGGED PARAMETER CARDS (high / low / critical)  │
 *  │    Coloured left-border accent card per parameter   │
 *  │    • Status pill + test name + large value          │
 *  │    • SmartSlider (when numeric range available)     │
 *  │    • Ref range text                                 │
 *  ├─────────────────────────────────────────────────────┤
 *  │ 4. NORMAL PARAMETERS — compact green-tint grid      │
 *  └─────────────────────────────────────────────────────┘
 *
 * ALL data is sourced from ProfileResult / ParameterResult.
 * Unknown / unavailable values display as "Unknown" (never blank).
 *
 * Receives: ProfileResult  (ctx.data)
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { ProfileResult } from '../../domain/models/profile.model';
import type { ParameterResult, ParameterStatus } from '../../domain/models/parameter.model';
import { renderScoreGauge, renderSmartSlider } from '../shared/index';

/* ─────────────────────────────────────────────────────────────────
   Colour helpers
   ───────────────────────────────────────────────────────────────── */

function statusColor(status: ParameterStatus): string {
  switch (status) {
    case 'normal': return '#16A34A';
    case 'low': return '#D97706';
    case 'high': return '#D97706';
    case 'critical': return '#DC2626';
  }
}

function statusBgColor(status: ParameterStatus): string {
  switch (status) {
    case 'normal': return '#F0FDF4';
    case 'low': return '#FFFBEB';
    case 'high': return '#FFFBEB';
    case 'critical': return '#FEF2F2';
  }
}

function statusBorderColor(status: ParameterStatus): string {
  switch (status) {
    case 'normal': return '#BBF7D0';
    case 'low': return '#FCD34D';
    case 'high': return '#FCD34D';
    case 'critical': return '#FCA5A5';
  }
}

function statusAccentColor(status: ParameterStatus): string {
  switch (status) {
    case 'normal': return '#16A34A';
    case 'low': return '#D97706';
    case 'high': return '#D97706';
    case 'critical': return '#DC2626';
  }
}

function statusLabel(status: ParameterStatus): string {
  switch (status) {
    case 'normal': return '✔ NORMAL';
    case 'low': return '▼ LOW';
    case 'high': return '▲ HIGH';
    case 'critical': return '‼ CRITICAL';
  }
}

function severityColor(sev: string): string {
  if (sev === 'healthy') return '#16A34A';
  if (sev === 'monitor') return '#D97706';
  return '#DC2626';
}

function severityBgColor(sev: string): string {
  if (sev === 'healthy') return '#F0FDF4';
  if (sev === 'monitor') return '#FFFBEB';
  return '#FEF2F2';
}

function severityBorderColor(sev: string): string {
  if (sev === 'healthy') return '#86EFAC';
  if (sev === 'monitor') return '#FCD34D';
  return '#FCA5A5';
}

/* ─────────────────────────────────────────────────────────────────
   Safe value helpers — never render a blank
   ───────────────────────────────────────────────────────────────── */

function safeValue(v: number | string | undefined | null): string {
  if (v === undefined || v === null || v === '') return 'Unknown';
  const n = Number(v);
  if (typeof v === 'string' && isNaN(n)) return v;   // text value (e.g. "ABSENT")
  if (isNaN(n)) return 'Unknown';
  return String(v);
}

function safeUnit(u: string | undefined): string {
  return (u && u.trim()) ? u.trim() : '';
}

function formatRange(param: ParameterResult): string {
  if (!param.range) return 'Unknown';
  const { min, max } = param.range;
  if (min === undefined && max === undefined) return 'Unknown';
  if (min === undefined || min === null) return `< ${max}`;
  if (max === undefined || max === null) return `> ${min}`;
  return `${min} – ${max}`;
}

/* ─────────────────────────────────────────────────────────────────
   1. PROFILE HERO
   ───────────────────────────────────────────────────────────────── */

function renderProfileHero(profile: ProfileResult): string {
  const sevColor = severityColor(profile.severity);
  const sevBg = severityBgColor(profile.severity);
  const sevBorder = severityBorderColor(profile.severity);
  const sevLabel = profile.severity.toUpperCase();

  const total = profile.parameters.length;
  const abnormal = profile.abnormalCount;
  const normal = profile.normalCount;
  const unknown = total - (abnormal + normal);

  // Filter out any pills with 0 count except if everything is 0
  const pillData = [
    { label: 'Abnormal', value: String(abnormal), bg: '#FEF2F2', color: '#DC2626' },
    { label: 'Normal', value: String(normal), bg: '#F0FDF4', color: '#16A34A' }
  ];

  if (unknown > 0) {
    pillData.push({ label: 'Unknown', value: String(unknown), bg: '#F8FAFC', color: '#64748B' });
  }

  const pills = pillData.map(p => `
<div class="det-hero-pill" style="background:${p.bg}; min-width: 80px;">
  <div class="det-hero-pill__value" style="color:${p.color};">${p.value}</div>
  <div class="det-hero-pill__label">${p.label}</div>
</div>`).join('');

  return `
<div class="det-hero">
  <!-- Decorative blobs -->
  <div class="det-hero__blob det-hero__blob--tr"></div>
  <div class="det-hero__blob det-hero__blob--bl"></div>

  <div class="det-hero__inner">
    <div class="det-hero__info" style="display: flex; justify-content: space-between; align-items: center; gap: 20px; width: 100%;">
      
      <!-- Left: Title & Badge -->
      <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px; flex: 1; min-width: 0;">
        <h2 class="det-hero__name" style="font-size: 24px; word-wrap: break-word; overflow-wrap: break-word; margin: 0; line-height: 1.2;">${profile.name}</h2>
        <span class="det-hero__sev-badge"
              style="color:${sevColor};background:${sevBg};border:1px solid ${sevBorder};">
          ${sevLabel}
        </span>
      </div>

      <!-- Right: Stat pills -->
      <div class="det-hero__pills" style="margin-bottom: 0; flex-shrink: 0;">
        ${pills}
      </div>

    </div>
  </div>
</div>`;
}

/* ─────────────────────────────────────────────────────────────────
   2. ANALYTICS STRIP — risk distribution bar
   ───────────────────────────────────────────────────────────────── */

function renderAnalyticsStrip(profile: ProfileResult): string {
  const total = profile.parameters.length || 1;
  const abnormal = profile.abnormalCount;
  const normal = profile.normalCount;
  // treat anything that isn't normal and isn't critical as "borderline"
  const critical = profile.parameters.filter(p => p.status === 'critical').length;
  const borderline = abnormal - critical;

  const normalPct = Math.round((normal / total) * 100);
  const borderlinePct = Math.round((borderline / total) * 100);
  const abnormalPct = Math.round((critical / total) * 100);
  // fill any rounding gap into normal
  const adjustedNormal = 100 - borderlinePct - abnormalPct;

  return `
<div class="det-analytics-strip">
  <div class="det-analytics-strip__bar-row">
    <span class="det-analytics-strip__bar-title">Risk Distribution</span>
    <div class="det-analytics-strip__legend">
      <span class="det-legend-dot" style="background:#16A34A;"></span>
      <span class="det-legend-text">Normal (${normalPct}%)</span>
      <span class="det-legend-dot" style="background:#D97706;margin-left:10px;"></span>
      <span class="det-legend-text">Borderline (${borderlinePct}%)</span>
      <span class="det-legend-dot" style="background:#DC2626;margin-left:10px;"></span>
      <span class="det-legend-text">Abnormal (${abnormalPct}%)</span>
    </div>
  </div>
  <div class="det-analytics-strip__bar">
    <div style="width:${adjustedNormal}%;background:#16A34A;border-radius:6px 0 0 6px;"></div>
    <div style="width:${borderlinePct}%;background:#F59E0B;"></div>
    <div style="width:${abnormalPct}%;background:#DC2626;border-radius:0 6px 6px 0;"></div>
  </div>
</div>`;
}

/* ─────────────────────────────────────────────────────────────────
   3. FLAGGED PARAMETER CARD
   ───────────────────────────────────────────────────────────────── */

function renderFlaggedCard(param: ParameterResult, showSlider: boolean): string {
  const color = statusColor(param.status);
  const bgColor = statusBgColor(param.status);
  const borderColor = statusBorderColor(param.status);
  const accentColor = statusAccentColor(param.status);
  const label = statusLabel(param.status);
  const displayVal = safeValue(param.value);
  const unit = safeUnit(param.unit);
  const refRange = formatRange(param);

  // Determine if we can build a smart slider
  let sliderHtml = '';
  if (showSlider) {
    const numVal = typeof param.value === 'number'
      ? param.value
      : parseFloat(String(param.value));

    if (!isNaN(numVal) && param.range) {
      const rawMin = param.range.min;
      const rawMax = param.range.max;

      // Build visual bounds (extend 15 % beyond normal zone)
      let visMin: number;
      let visMax: number;
      let normMin: number | undefined;
      let normMax: number | undefined;

      if (rawMin !== undefined && rawMin !== null && rawMax !== undefined && rawMax !== null) {
        const span = rawMax - rawMin || 1;
        visMin = rawMin - span * 0.15;
        visMax = rawMax + span * 0.15;
        normMin = rawMin;
        normMax = rawMax;
      } else if (rawMax !== undefined && rawMax !== null) {
        // max-only (e.g. "< 100 mg/dL")
        visMin = 0;
        visMax = rawMax * 1.5;
        normMin = 0;
        normMax = rawMax;
      } else if (rawMin !== undefined && rawMin !== null) {
        // min-only (e.g. "> 40 mg/dL")
        visMin = rawMin * 0.5;
        visMax = rawMin * 2;
        normMin = rawMin;
        normMax = rawMin * 1.5;
      } else {
        visMin = 0; visMax = 200;
      }

      // Clamp visMin and visMax so the marker is never outside bounds
      const safeVisMin = Math.min(visMin, numVal * 0.8);
      const safeVisMax = Math.max(visMax, numVal * 1.2);

      sliderHtml = renderSmartSlider({
        value: numVal,
        min: Math.round(safeVisMin * 10) / 10,
        max: Math.round(safeVisMax * 10) / 10,
        normalMin: normMin,
        normalMax: normMax,
        unit,
        status: param.status,
      });
    }
  }

  return `
<div class="det-flagged-card" style="border-left-color:${accentColor};border-color:${borderColor};background:${bgColor};">
  <!-- Card header -->
  <div class="det-flagged-card__header">
    <div class="det-flagged-card__header-left">
      <span class="det-flagged-pill" style="color:${color};background:${bgColor};border:1px solid ${borderColor};">
        ${label}
      </span>
      <span class="det-flagged-ref">Ref: ${refRange}${unit ? ' ' + unit : ''}</span>
    </div>
    <div class="det-flagged-card__value-box" style="background:${bgColor};">
      <div class="det-flagged-card__value" style="color:${color};">${displayVal}</div>
      ${unit ? `<div class="det-flagged-card__unit" style="color:${color};">${unit}</div>` : ''}
    </div>
  </div>

  <!-- Test name -->
  <h3 class="det-flagged-card__name">${param.name}</h3>

  <!-- Smart Slider -->
  ${sliderHtml}
</div>`;
}

/* ─────────────────────────────────────────────────────────────────
   4. NORMAL PARAMETERS GRID
   ───────────────────────────────────────────────────────────────── */

function renderNormalGrid(params: ParameterResult[]): string {
  if (params.length === 0) return '';

  const items = params.map(p => {
    const val = safeValue(p.value);
    const unit = safeUnit(p.unit);
    const ref = formatRange(p);

    return `
<div class="det-normal-row">
  <div class="det-normal-row__icon">
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="white" stroke-width="2.2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </div>
  <div class="det-normal-row__body">
    <div class="det-normal-row__name">${p.name}</div>
    <div class="det-normal-row__val-row">
      <span class="det-normal-row__value">${val}</span>
      ${unit ? `<span class="det-normal-row__unit">${unit}</span>` : ''}
    </div>
    <div class="det-normal-row__ref">Ref: ${ref}</div>
  </div>
</div>`;
  }).join('');

  return `
<div class="det-normal-section">
  <div class="det-section-heading">
    <div class="det-section-heading__bar" style="background:#16A34A;"></div>
    <span class="det-section-heading__text">Normal Parameters</span>
  </div>
  <div class="det-normal-grid">
    ${items}
  </div>
</div>`;
}

/* ─────────────────────────────────────────────────────────────────
   PAGE EXPORT
   ───────────────────────────────────────────────────────────────── */

export const inDepthDetailPage: ReportPage = {
  name: 'indepth-detail',

  generate(ctx: PageRenderContext): string {
    const profile = ctx.data as ProfileResult;
    const strategy = ctx.strategy;

    const showSlider = strategy.allowSliders;

    // Split parameters into flagged (non-normal) and normal
    const flagged = profile.parameters.filter(p => p.status !== 'normal');
    const normal = profile.parameters.filter(p => p.status === 'normal');

    const flaggedCards = flagged
      .map(p => renderFlaggedCard(p, showSlider))
      .join('\n');

    const normalGrid = renderNormalGrid(normal);

    return `
<section class="indepth-detail">

  ${renderProfileHero(profile)}

  ${renderAnalyticsStrip(profile)}

  ${flagged.length > 0 ? `
  <div class="det-section-heading det-section-heading--flagged">
    <div class="det-section-heading__bar" style="background:#DC2626;"></div>
    <span class="det-section-heading__text">Parameters Requiring Attention</span>
  </div>
  <div class="det-flagged-list">
    ${flaggedCards}
  </div>` : `
  <div class="det-all-normal-banner">
    <span>✅ All parameters are within reference range</span>
  </div>`}

  ${normalGrid}

</section>`;
  },
};
