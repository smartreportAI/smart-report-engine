import type { ReportPage, PageRenderContext } from '../core/page-registry/page.types';
import type { ProfileResult } from '../domain/models/profile.model';
import type {
  ParameterResult,
  ParameterStatus,
} from '../domain/models/parameter.model';
import type { ReportStrategy } from '../rendering/strategies/report-strategy.types';

/** Threshold: if more than this many params, fall back to compact table */
const CARD_LAYOUT_THRESHOLD = 20;

/* ---------------------------------------------------------------
   Color helpers
   --------------------------------------------------------------- */

function statusColorVar(status: ParameterStatus): string {
  switch (status) {
    case 'normal':
      return 'var(--color-healthy)';
    case 'low':
    case 'high':
      return 'var(--color-monitor)';
    case 'critical':
      return 'var(--color-attention)';
  }
}

function statusBgClass(status: ParameterStatus): string {
  switch (status) {
    case 'normal':
      return 'bg-normal';
    case 'low':
      return 'bg-low';
    case 'high':
      return 'bg-high';
    case 'critical':
      return 'bg-status-critical';
  }
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case 'healthy':
      return 'bg-healthy';
    case 'monitor':
      return 'bg-monitor';
    case 'attention':
      return 'bg-attention';
    default:
      return 'bg-healthy';
  }
}

/* ---------------------------------------------------------------
   Range formatting
   --------------------------------------------------------------- */

function formatRange(param: ParameterResult): string {
  if (!param.range) return '—';
  const parts: string[] = [];
  if (param.range.min !== undefined) parts.push(`${param.range.min}`);
  if (param.range.max !== undefined) parts.push(`${param.range.max}`);
  return parts.join(' – ') || '—';
}

/* ---------------------------------------------------------------
   Mini Range Slider (strategy-gated via allowSliders)

   Rules:
   - Gray background track
   - Green/yellow/red fill based on status
   - Dot marker positioned by value within range
   --------------------------------------------------------------- */

function renderRangeSlider(param: ParameterResult): string {
  const color = statusColorVar(param.status);
  const numVal = typeof param.value === 'number' ? param.value : parseFloat(String(param.value));

  // Guard: if we cannot compute a numeric position, skip the slider
  if (isNaN(numVal) || !param.range) {
    return '';
  }

  const min = param.range.min ?? 0;
  const max = param.range.max ?? min + 100;
  const span = max - min || 1;

  // Allow the slider to extend slightly beyond bounds for out-of-range values
  const visualMin = min - span * 0.15;
  const visualMax = max + span * 0.15;
  const visualSpan = visualMax - visualMin || 1;

  // Dot position (clamped 0–100%)
  const dotPct = Math.max(0, Math.min(100, ((numVal - visualMin) / visualSpan) * 100));

  // Fill spans from the visual start to the dot
  const fillPct = dotPct;

  // Healthy zone indicators (for the range bounds)
  const rangeStartPct = Math.max(0, ((min - visualMin) / visualSpan) * 100);
  const rangeEndPct = Math.min(100, ((max - visualMin) / visualSpan) * 100);

  return `
    <div class="range-slider">
      <div class="range-slider-fill"
           style="left:${rangeStartPct}%;width:${rangeEndPct - rangeStartPct}%;background:var(--color-bg-light);opacity:0.5"></div>
      <div class="range-slider-fill"
           style="left:0;width:${fillPct}%;background:${color}"></div>
      <div class="range-slider-dot"
           style="left:${dotPct}%;background:${color}"></div>
    </div>
    <div class="range-slider-bounds">
      <span class="range-bound-label">${param.range.min ?? ''}</span>
      <span class="range-bound-label">${param.range.max ?? ''}</span>
    </div>`;
}

/* ---------------------------------------------------------------
   Parameter Card (premium layout)
   --------------------------------------------------------------- */

function renderParameterCard(
  param: ParameterResult,
  strategy: ReportStrategy,
): string {
  // Slider is strategy-gated
  const slider = strategy.allowSliders ? renderRangeSlider(param) : '';

  return `
    <div class="param-card">
      <div class="param-card-header">
        <span class="param-card-name">${param.name}</span>
        <span class="status-pill ${statusBgClass(param.status)}">${param.status}</span>
      </div>
      <div class="param-card-value-row">
        <span class="param-card-value">${param.value}</span>
        ${param.unit ? `<span class="param-card-unit">${param.unit}</span>` : ''}
      </div>
      ${slider}
    </div>`;
}

/* ---------------------------------------------------------------
   Fallback Table Row (>20 params)
   --------------------------------------------------------------- */

function renderParameterRow(param: ParameterResult): string {
  return `
    <tr>
      <td>${param.name}</td>
      <td><strong>${param.value}</strong>${param.unit ? ` ${param.unit}` : ''}</td>
      <td>${formatRange(param)}</td>
      <td><span class="status-pill ${statusBgClass(param.status)}">${param.status}</span></td>
    </tr>`;
}

function renderFallbackTable(parameters: ParameterResult[]): string {
  const rows = parameters.map(renderParameterRow).join('\n');
  return `
  <table class="param-table">
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Value</th>
        <th>Range</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>`;
}

/* ---------------------------------------------------------------
   Page Export
   --------------------------------------------------------------- */

export const profileDetailPage: ReportPage = {
  name: 'profile-detail',

  generate(ctx: PageRenderContext): string {
    const profile = ctx.data as ProfileResult;
    const strategy: ReportStrategy = ctx.strategy;

    const useCards = profile.parameters.length <= CARD_LAYOUT_THRESHOLD;

    const body = useCards
      ? `<div class="param-cards-grid">
          ${profile.parameters
        .map((p) => renderParameterCard(p, strategy))
        .join('\n')}
        </div>`
      : renderFallbackTable(profile.parameters);

    return `
<section class="profile-detail">
  <div class="profile-heading">
    <h2>${profile.name}</h2>
    <span class="detail-score">Score: ${profile.profileScore}/100</span>
    <span class="detail-badge ${severityBadgeClass(profile.severity)}">${profile.severity}</span>
  </div>

  ${body}
</section>`;
  },
};
