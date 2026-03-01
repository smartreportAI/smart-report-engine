/**
 * InDepth — Detail Page
 *
 * One page per profile showing the full parameter-level breakdown:
 *   - Profile name + score + severity badge
 *   - Speedometer for the profile score
 *   - Every parameter as a rich card with:
 *       – Value + unit + status pill
 *       – Range slider (strategy-gated)
 *       – Mini speedometer (strategy-gated)
 *       – Reference range text
 *
 * This page is expanded in report-builder: one page per profile
 * (same pattern as the existing 'profile-detail' page).
 *
 * Receives: ProfileResult
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { ProfileResult } from '../../domain/models/profile.model';
import type { ParameterResult, ParameterStatus } from '../../domain/models/parameter.model';
import { renderScoreGauge } from '../shared/index';

/* ------------------------------------------------------------------ */

function statusColor(status: ParameterStatus): string {
    switch (status) {
        case 'normal': return 'var(--color-healthy)';
        case 'low':
        case 'high': return 'var(--color-monitor)';
        case 'critical': return 'var(--color-attention)';
    }
}

function statusBg(status: ParameterStatus): string {
    switch (status) {
        case 'normal': return 'var(--color-healthy)';
        case 'low': return 'var(--color-monitor)';
        case 'high': return 'var(--color-monitor)';
        case 'critical': return 'var(--color-attention)';
    }
}

function severityBg(sev: string): string {
    if (sev === 'stable' || sev === 'healthy') return 'var(--color-healthy)';
    if (sev === 'monitor') return 'var(--color-monitor)';
    return 'var(--color-attention)';
}

function formatRange(param: ParameterResult): string {
    if (!param.range) return '—';
    const parts: string[] = [];
    if (param.range.min !== undefined) parts.push(String(param.range.min));
    if (param.range.max !== undefined) parts.push(String(param.range.max));
    return parts.join(' – ') || '—';
}

/* Range slider — identical to profile-detail.page.ts but extracted cleanly */
function renderRangeSlider(param: ParameterResult): string {
    const color = statusColor(param.status);
    const numVal = typeof param.value === 'number' ? param.value : parseFloat(String(param.value));
    if (isNaN(numVal) || !param.range) return '';

    const min = param.range.min ?? 0;
    const max = param.range.max ?? min + 100;
    const span = max - min || 1;
    const visualMin = min - span * 0.15;
    const visualMax = max + span * 0.15;
    const visualSpan = visualMax - visualMin || 1;
    const dotPct = Math.max(0, Math.min(100, ((numVal - visualMin) / visualSpan) * 100));
    const rangeStartPct = Math.max(0, ((min - visualMin) / visualSpan) * 100);
    const rangeEndPct = Math.min(100, ((max - visualMin) / visualSpan) * 100);

    return `
<div class="range-slider">
  <div class="range-slider-fill"
       style="left:${rangeStartPct}%;width:${rangeEndPct - rangeStartPct}%;background:var(--color-bg-light);opacity:0.5"></div>
  <div class="range-slider-fill"
       style="left:0;width:${dotPct}%;background:${color}"></div>
  <div class="range-slider-dot"
       style="left:${dotPct}%;background:${color}"></div>
</div>
<div class="range-slider-bounds">
  <span class="range-bound-label">${param.range.min ?? ''}</span>
  <span class="range-bound-label">${param.range.max ?? ''}</span>
</div>`;
}

/* ------------------------------------------------------------------ */

function renderDetailParamCard(param: ParameterResult, showSlider: boolean, showGauge: boolean): string {
    const color = statusColor(param.status);
    const bgCls = `det-status--${param.status}`;
    const slider = showSlider ? renderRangeSlider(param) : '';

    let miniGauge = '';
    if (showGauge && param.range) {
        const numVal = typeof param.value === 'number' ? param.value : parseFloat(String(param.value));
        if (!isNaN(numVal)) {
            miniGauge = renderScoreGauge({
                score: Math.round(Math.max(0, Math.min(100,
                    ((numVal - (param.range.min ?? 0)) / ((param.range.max ?? 100) - (param.range.min ?? 0))) * 100,
                ))),
                size: 72,
                label: '',
            });
        }
    }

    return `
<div class="det-param-card ${param.status !== 'normal' ? 'det-param-card--flagged' : ''}">
  <div class="det-param-card__top">
    <div class="det-param-card__name">${param.name}</div>
    <span class="det-status-pill ${bgCls}">${param.status.toUpperCase()}</span>
  </div>
  <div class="det-param-card__value-row">
    <span class="det-param-card__value" style="color:${color}">${param.value}</span>
    ${param.unit ? `<span class="det-param-card__unit">${param.unit}</span>` : ''}
    ${miniGauge ? `<div class="det-param-card__mini-gauge">${miniGauge}</div>` : ''}
  </div>
  <div class="det-param-card__range-row">
    <span class="det-param-card__range-label">Ref: ${formatRange(param)}</span>
    ${param.unit ? `<span class="det-param-card__range-unit">${param.unit}</span>` : ''}
  </div>
  ${slider}
</div>`;
}

/* ------------------------------------------------------------------ */

export const inDepthDetailPage: ReportPage = {
    name: 'indepth-detail',

    generate(ctx: PageRenderContext): string {
        const profile = ctx.data as ProfileResult;
        const strategy = ctx.strategy;

        const showSlider = strategy.allowSliders;
        // For inDepth, show mini gauges for strategy.allowAnalyticsStrip (all features on)
        const showGauge = strategy.allowAnalyticsStrip;

        const profGauge = renderScoreGauge({
            score: profile.profileScore,
            size: 120,
            label: 'Profile Score',
        });

        const cards = profile.parameters
            .map((p) => renderDetailParamCard(p, showSlider, showGauge))
            .join('\n');

        const abnCard = profile.abnormalCount > 0
            ? `<div class="det-abnormal-flag">⚠️ ${profile.abnormalCount} parameter${profile.abnormalCount > 1 ? 's' : ''} outside reference range</div>`
            : `<div class="det-normal-flag">✅ All parameters within reference range</div>`;

        return `
<section class="indepth-detail">
  <div class="det-profile-header">
    <div class="det-profile-header__left">
      <h2 class="det-profile-name">${profile.name}</h2>
      ${abnCard}
    </div>
    <div class="det-profile-header__right">
      ${profGauge}
    </div>
    <div class="det-profile-badge" style="background:${severityBg(profile.severity)}">
      ${profile.severity.toUpperCase()}
    </div>
  </div>

  <div class="det-param-grid">
    ${cards}
  </div>
</section>`;
    },
};
