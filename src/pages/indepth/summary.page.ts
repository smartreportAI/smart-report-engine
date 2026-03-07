/**
 * InDepth — Summary Page (v2)
 *
 * One-page premium executive snapshot featuring:
 *   - Master Health Score Gauge
 *   - Health status breakdown (Healthy / Monitor / Attention)
 *   - Report Summary (two-column accordion: every profile + all parameters with status)
 *   - Key Clinical Observations (Abnormal parameters list)
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';

import { renderScoreGauge } from '../shared/index';

/* ────────────────────────────────────────────────────────────────── */
/*  Helper Renderers                                                  */
/* ────────────────────────────────────────────────────────────────── */



function getSeverityStyle(sev: string) {
  if (sev === 'healthy' || sev === 'normal') {
    return { color: '#10b981', bg: '#f0fdf4', dot: '#10b981', label: 'Healthy' };
  }
  if (sev === 'monitor' || sev === 'medium') {
    return { color: '#f59e0b', bg: '#fffbeb', dot: '#f59e0b', label: 'Monitor' };
  }
  if (sev === 'low') {
    return { color: '#3b82f6', bg: '#eff6ff', dot: '#3b82f6', label: 'Low' };
  }
  return { color: '#ef4444', bg: '#fef2f2', dot: '#ef4444', label: 'Attention' };
}

function renderStatusGrid(report: NormalizedReport): string {
  let normalCount = 0;
  let abnormalCount = 0;
  let unknownCount = 0;

  report.profiles.forEach(p => {
    p.parameters.forEach(param => {
      const hasRange = param.range && (param.range.min !== undefined || param.range.max !== undefined);
      if (!hasRange) {
        unknownCount++;
      } else if (param.status === 'normal') {
        normalCount++;
      } else {
        abnormalCount++;
      }
    });
  });

  const cards = [];

  cards.push(`
    <div class="status-card" style="background-color:#f0fdf4; border: 1px solid #bbf7d0; box-shadow: 0 1px 3px rgba(0,0,0,0.02)">
        <p class="status-card-value" style="color:#16a34a; font-size: 28px; font-weight: 800; margin-bottom: 2px;">${normalCount}</p>
        <p class="status-card-label" style="color:#16a34a; font-size: 10px; font-weight: 700; letter-spacing: 0.05em;">NORMAL</p>
    </div>
  `);

  cards.push(`
    <div class="status-card" style="background-color:#fef2f2; border: 1px solid #fecaca; box-shadow: 0 1px 3px rgba(0,0,0,0.02)">
        <p class="status-card-value" style="color:#dc2626; font-size: 28px; font-weight: 800; margin-bottom: 2px;">${abnormalCount}</p>
        <p class="status-card-label" style="color:#dc2626; font-size: 10px; font-weight: 700; letter-spacing: 0.05em;">ABNORMAL</p>
    </div>
  `);

  if (unknownCount > 0) {
    cards.push(`
      <div class="status-card" style="background-color:#f8fafc; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02)">
          <p class="status-card-value" style="color:#64748b; font-size: 28px; font-weight: 800; margin-bottom: 2px;">${unknownCount}</p>
          <p class="status-card-label" style="color:#64748b; font-size: 10px; font-weight: 700; letter-spacing: 0.05em;">UNKNOWN</p>
      </div>
    `);
  }

  const cols = unknownCount > 0 ? 3 : 2;

  let scoreColor = '#10b981';
  let summaryText = 'indicating a stable health profile with most markers within range.';
  if (report.overallScore < 70) {
    scoreColor = '#f59e0b';
    summaryText = 'indicating a generally stable profile with specific areas requiring monitoring.';
  }
  if (report.overallScore < 40) {
    scoreColor = '#ef4444';
    summaryText = 'indicating several areas that require immediate attention and consultation.';
  }

  const introText = report.aiAssessment
    ? `Based on a comprehensive AI evaluation of all <strong>${normalCount + abnormalCount + unknownCount} parameters</strong>, your Master Health Score is <strong style="color:${scoreColor}">${report.overallScore}/100</strong>, ${summaryText}`
    : `Your overall health score is <strong style="color:${scoreColor}">${report.overallScore}/100</strong>, ${summaryText}`;

  return `
        <div class="health-score-breakdown" style="width: 100%;">
            <div class="status-grid" style="grid-template-columns: repeat(${cols}, 1fr); margin-bottom: 20px;">
                ${cards.join('')}
            </div>
            <p class="score-summary-text" style="font-size: 11.5px; line-height: 1.6; color: #4b5563; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6;">
                ${introText}
            </p>
        </div>
    `;
}

/* ── Status pill colors per parameter status ── */
function getParamStatusStyle(status: string): { bg: string; color: string; label: string } {
  switch (status) {
    case 'normal': return { bg: '#dcfce7', color: '#166534', label: 'Normal' };
    case 'low': return { bg: '#dbeafe', color: '#1e40af', label: 'Low' };
    case 'high': return { bg: '#fef3c7', color: '#92400e', label: 'High' };
    case 'critical': return { bg: '#fee2e2', color: '#991b1b', label: 'High' }; // Display critical as High
    default: return { bg: '#f3f4f6', color: '#374151', label: 'Normal' };
  }
}

/* ── Severity sidebar + badge colors ── */
function getSeverityAccent(sev: string): { bar: string; badgeBg: string; badgeColor: string; label: string; headerBg: string } {
  if (sev === 'healthy') return { bar: '#22c55e', badgeBg: '#dcfce7', badgeColor: '#166534', label: '✓ Normal', headerBg: '#f0fdf4' };
  if (sev === 'low') return { bar: '#3b82f6', badgeBg: '#dbeafe', badgeColor: '#1e40af', label: '↓ Low', headerBg: '#eff6ff' };
  if (sev === 'monitor') return { bar: '#f59e0b', badgeBg: '#fef3c7', badgeColor: '#92400e', label: '⚠ High', headerBg: '#fffbeb' };
  return { bar: '#ef4444', badgeBg: '#fee2e2', badgeColor: '#991b1b', label: '✗ High', headerBg: '#fef2f2' } as any;
}

/* ── Dot SVG indicator ── */
function paramDot(status: string): string {
  const colors: Record<string, string> = { normal: '#22c55e', low: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
  const c = colors[status] || '#94a3b8';
  return `<svg width="6" height="6" viewBox="0 0 6 6"><circle cx="3" cy="3" r="3" fill="${c}"/></svg>`;
}

/* ── Main Report Summary renderer (Option B — two-column accordion) ── */
function renderReportSummary(report: NormalizedReport): string {
  let totalNormal = 0;
  let totalAbnormal = 0;
  let renderedProfilesCount = 0;

  // Build each profile block
  const profileBlocks = report.profiles.map(p => {
    // Completely ignore parameters without proper reference ranges
    const knownParams = p.parameters.filter(param => param.range && (param.range.min !== undefined || param.range.max !== undefined));
    if (knownParams.length === 0) return '';

    renderedProfilesCount++;

    let profileAbnormalCount = 0;
    knownParams.forEach(param => {
      if (param.status === 'normal') totalNormal++;
      else {
        totalAbnormal++;
        profileAbnormalCount++;
      }
    });

    const accent = getSeverityAccent(p.severity);

    // Parameter rows
    const paramRows = knownParams.map(param => {
      const ps = getParamStatusStyle(param.status);
      const val = `${param.value}${param.unit ? ' <span class="rs-param-unit">' + param.unit + '</span>' : ''}`;
      const isAbn = param.status !== 'normal';
      return `
        <div class="rs-param-row${isAbn ? ' rs-param-row--abn' : ''}">
          <div class="rs-param-dot">${paramDot(param.status)}</div>
          <span class="rs-param-name">${param.name}</span>
          <span class="rs-param-value">${val}</span>
          <span class="rs-param-pill" style="background:${ps.bg}; color:${ps.color}">${ps.label}</span>
        </div>`;
    }).join('');

    // Abnormal chip in header (only when > 0)
    const abnChip = profileAbnormalCount > 0
      ? `<span class="rs-abn-chip">${profileAbnormalCount} abnormal</span>`
      : `<span class="rs-ok-chip">All normal</span>`;

    return `
      <div class="rs-profile-block">
        <div class="rs-sidebar" style="background:${accent.bar}"></div>
        <div class="rs-block-body">
          <div class="rs-block-header" style="background:${accent.headerBg ?? '#f8fafc'}">
            <div class="rs-block-header-left">
              <span class="rs-profile-name">${p.name}</span>
              <span class="rs-severity-badge" style="background:${accent.badgeBg}; color:${accent.badgeColor}">${accent.label}</span>
            </div>
            <div class="rs-block-header-right">
              ${abnChip}
            </div>
          </div>
          <div class="rs-param-list">
            ${paramRows}
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="rs-section">
      <!-- Section header -->
      <div class="rs-section-header">
        <div class="rs-section-title-group">
          <h2 class="section-heading-v2" style="margin-bottom:0">Tests Summary</h2>
          <span class="rs-section-sub">${renderedProfilesCount} profiles · ${totalNormal + totalAbnormal} parameters</span>
        </div>
        <div class="rs-totals">
          <span class="rs-total-chip rs-total-chip--normal">
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#22c55e"/></svg>
            ${totalNormal} Normal
          </span>
          <span class="rs-total-chip rs-total-chip--abn">
            <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="#ef4444"/></svg>
            ${totalAbnormal} Abnormal
          </span>
        </div>
      </div>
      <!-- Two-column profile grid -->
      <div class="rs-profiles-grid">
        ${profileBlocks}
      </div>
    </div>`;
}

function renderClinicalObservations(report: NormalizedReport): string {
  const observations: Array<{ text: string, severity: string }> = [];

  report.profiles.forEach(p => {
    p.parameters.forEach(param => {
      if (param.status !== 'normal') {
        observations.push({
          text: `<strong>${param.name}</strong> is ${param.status.toUpperCase()} (${param.value} ${param.unit || ''}). Found in <em>${p.name}</em> profile.`,
          severity: param.status === 'critical' ? 'attention' : (param.status === 'low' ? 'low' : 'monitor')
        });
      }
    });
  });

  if (observations.length === 0) {
    observations.push({ text: 'All analyzed parameters are within normal reference ranges.', severity: 'healthy' });
  }

  const rows = observations.slice(0, 8).map(obs => {
    const style = getSeverityStyle(obs.severity);
    return `
            <div class="observation-row" style="background-color:${style.bg}">
                <div class="observation-dot" style="background-color:${style.dot}"></div>
                <p class="observation-text">${obs.text}</p>
            </div>
        `;
  }).join('');

  return `
        <div class="clinical-observations-section">
            <div class="clinical-observations-header">
                <h2 class="section-heading-v2">Key Clinical Observations</h2>
                <div class="clinical-legend">
                    <div class="legend-item"><div class="legend-dot" style="background-color:#ef4444"></div><span class="legend-label">High</span></div>
                    <div class="legend-item"><div class="legend-dot" style="background-color:#f59e0b"></div><span class="legend-label">Medium</span></div>
                    <div class="legend-item"><div class="legend-dot" style="background-color:#3b82f6"></div><span class="legend-label">Low</span></div>
                    <div class="legend-item"><div class="legend-dot" style="background-color:#10b981"></div><span class="legend-label">Normal</span></div>
                </div>
            </div>
            <div class="clinical-list">${rows}</div>
        </div>
    `;
}

function renderAiRecommendations(report: NormalizedReport): string {
  if (!report.aiAssessment || !report.aiAssessment.overallRecommendations.length) {
    return ''; // No AI assessment provided
  }

  const recList = report.aiAssessment.overallRecommendations.map(rec => {
    return `
            <div class="observation-row" style="background-color:#eff6ff">
                <div class="observation-dot" style="background-color:#3b82f6"></div>
                <p class="observation-text">${rec}</p>
            </div>
    `;
  }).join('');

  return `
    <div class="clinical-observations-section">
      <div class="clinical-observations-header">
        <h2 class="section-heading-v2">Top Clinical Recommendations</h2>
      </div>
      <div class="clinical-list">${recList}</div>
    </div>
  `;
}

/* ────────────────────────────────────────────────────────────────── */

export const inDepthSummaryPage: ReportPage = {
  name: 'indepth-summary',

  generate(ctx: PageRenderContext): string {
    const report = ctx.data as NormalizedReport;

    return `
<section class="indepth-summary-v2">
    <!-- MASTER HEALTH SCORE SECTION -->
    <div class="health-score-section" style="display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 32px; text-align: left;">
        <div class="gauge-wrapper" style="flex-shrink: 0; padding: 10px; padding-top: 0px;">
            ${renderScoreGauge({ score: report.overallScore, size: 170, label: '' })}
        </div>
        <div style="flex: 1; display: flex; flex-direction: column;">
            <h2 class="section-heading-v2" style="font-size: 15px; margin-bottom: 10px; margin-top:0;">MASTER HEALTH SCORE</h2>
            ${renderStatusGrid(report)}
        </div>
    </div>

    <div class="summary-divider" style="margin-top: 12px; margin-bottom: 12px;"></div>

    <!-- REPORT SUMMARY (profiles + parameters with status) -->
    ${renderReportSummary(report)}

    <div class="summary-divider" style="margin-top: 12px; margin-bottom: 12px;"></div>

    <!-- KEY CLINICAL OBSERVATIONS -->
    ${renderClinicalObservations(report)}

    <!-- AI CLINICAL RECOMMENDATIONS (if present) -->
    ${renderAiRecommendations(report)}
</section>`;
  },
};
