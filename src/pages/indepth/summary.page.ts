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
import type { ParameterResult } from '../../domain/models/parameter.model';
import type { ProfileResult } from '../../domain/models/profile.model';

import { renderScoreGauge, getSeverityStyle as getSharedSeverityStyle } from '../shared/index';
import { renderProfileIconImg } from '../../shared/profile-icons';

/* ────────────────────────────────────────────────────────────────── */
/*  Pre-computed report statistics (single pass)                      */
/* ────────────────────────────────────────────────────────────────── */

interface ParamObservation {
  text: string;
  severity: string;
}

interface ReportStats {
  normalCount: number;
  abnormalCount: number;
  unknownCount: number;
  /** Abnormal parameters collected for clinical observations */
  observations: ParamObservation[];
}

function computeReportStats(report: NormalizedReport): ReportStats {
  let normalCount = 0;
  let abnormalCount = 0;
  let unknownCount = 0;
  const observations: ParamObservation[] = [];

  for (const p of report.profiles) {
    for (const param of p.parameters) {
      const hasRange = param.range && (param.range.min !== undefined || param.range.max !== undefined);
      if (!hasRange) {
        unknownCount++;
      } else if (param.status === 'normal') {
        normalCount++;
      } else {
        abnormalCount++;
      }

      if (param.status !== 'normal') {
        observations.push({
          text: `<strong>${param.name}</strong> is ${param.status.toUpperCase()} (${param.value} ${param.unit || ''}). Found in <em>${p.name}</em> profile.`,
          severity: param.status === 'critical' ? 'attention' : (param.status === 'low' ? 'low' : 'monitor'),
        });
      }
    }
  }

  return { normalCount, abnormalCount, unknownCount, observations };
}

/* ────────────────────────────────────────────────────────────────── */
/*  Helper Renderers                                                  */
/* ────────────────────────────────────────────────────────────────── */

function renderStatusGrid(report: NormalizedReport, stats: ReportStats): string {
  const { normalCount, abnormalCount, unknownCount } = stats;

  const cards = [];

  cards.push(`
    <div class="status-card" style="background-color:#f0fdf4; border: 1px solid #bbf7d0; box-shadow: 0 1px 3px rgba(0,0,0,0.02)">
        <p class="status-card-value" style="color:#16a34a; font-size: 28px; font-weight: 800; margin-bottom: 2px;">${normalCount}</p>
        <p class="status-card-label" style="color:#16a34a; font-size: 10px; font-weight: 700; letter-spacing: 0.05em;">NORMAL</p>
    </div>
  `);

  cards.push(`
    <div class="status-card" style="background-color:#fff8f8; border: 1px solid #fcd5d5; box-shadow: 0 1px 3px rgba(0,0,0,0.02)">
        <p class="status-card-value" style="color:#c0392b; font-size: 28px; font-weight: 800; margin-bottom: 2px;">${abnormalCount}</p>
        <p class="status-card-label" style="color:#c0392b; font-size: 10px; font-weight: 700; letter-spacing: 0.05em;">ABNORMAL</p>
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
    scoreColor = '#f87171';
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
    case 'low': return { bg: '#fff1f1', color: '#c0392b', label: 'Low' };
    case 'high': return { bg: '#fff1f1', color: '#c0392b', label: 'High' };
    case 'critical': return { bg: '#fff1f1', color: '#c0392b', label: 'Critical' };
    default: return { bg: '#f3f4f6', color: '#374151', label: 'Normal' };
  }
}

/* ── Severity sidebar + badge colors ── */
function getSeverityAccent(sev: string): { bar: string; badgeBg: string; badgeColor: string; label: string; headerBg: string } {
  if (sev === 'healthy') return { bar: '#22c55e', badgeBg: '#dcfce7', badgeColor: '#166534', label: '✓ Normal', headerBg: '#f0fdf4' };
  if (sev === 'low') return { bar: '#f87171', badgeBg: '#fff1f1', badgeColor: '#c0392b', label: '↓ Low', headerBg: '#fff8f8' };
  if (sev === 'monitor') return { bar: '#f59e0b', badgeBg: '#fffbeb', badgeColor: '#d97706', label: '⚠ Monitor', headerBg: '#fffbeb' };
  return { bar: '#f87171', badgeBg: '#fff1f1', badgeColor: '#c0392b', label: '✗ Attention', headerBg: '#fff8f8' };
}

/* ── Dot SVG indicator ── */
function paramDot(status: string): string {
  const colors: Record<string, string> = { normal: '#22c55e', low: '#f87171', high: '#f87171', critical: '#f87171' };
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

    // Only show profiles that have at least one abnormal parameter
    const hasAbnormal = knownParams.some(param => param.status !== 'normal');
    if (!hasAbnormal) return '';

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

    // Parameter rows — only abnormal parameters
    const abnormalParams = knownParams.filter(param => param.status !== 'normal');
    const paramRows = abnormalParams.map(param => {
      const ps = getParamStatusStyle(param.status);
      const val = `${param.value}${param.unit ? ' <span class="rs-param-unit">' + param.unit + '</span>' : ''}`;
      const rangeText = param.range
        ? (() => {
            const lo = param.range.min !== undefined && param.range.min !== null ? param.range.min : null;
            const hi = param.range.max !== undefined && param.range.max !== null ? param.range.max : null;
            if (lo !== null && hi !== null) return `Ref: ${lo}–${hi}${param.unit ? ' ' + param.unit : ''}`;
            if (lo !== null) return `Ref: ≥${lo}${param.unit ? ' ' + param.unit : ''}`;
            if (hi !== null) return `Ref: ≤${hi}${param.unit ? ' ' + param.unit : ''}`;
            return '';
          })()
        : '';
      return `
        <div class="rs-param-row rs-param-row--abn">
          <div class="rs-param-dot">${paramDot(param.status)}</div>
          <span class="rs-param-name">${param.name}</span>
          <span class="rs-param-value">${val}</span>
          ${rangeText ? `<span class="rs-param-ref">${rangeText}</span>` : ''}
          <span class="rs-param-pill" style="background:${ps.bg}; color:${ps.color}">${ps.label}</span>
        </div>`;
    }).join('');

    // Abnormal chip
    const abnChip = `<span class="rs-abn-chip">${profileAbnormalCount} flagged</span>`;

    return `
      <div class="rs-profile-block">
        <div class="rs-sidebar" style="background:${accent.bar}"></div>
        <div class="rs-block-body">
          <div class="rs-block-header" style="background:${accent.headerBg ?? '#f8fafc'}">
            <div class="rs-block-header-left">
              ${renderProfileIconImg(p.name, 'rs-profile-icon')}
              <span class="rs-profile-name">${p.name}</span>
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

  const totalParams = totalNormal + totalAbnormal;
  const pct = totalParams > 0 ? Math.round((totalAbnormal / totalParams) * 100) : 0;

  if (renderedProfilesCount === 0) {
    return `
    <div class="rs-section">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
        <div style="width:28px;height:28px;border-radius:8px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9l-3 1.5.5-3.5L2 4.5l3.5-.5z" fill="#22c55e"/></svg>
        </div>
        <div>
          <h2 class="section-heading-v2" style="margin-bottom:0">Abnormal Findings</h2>
          <span class="rs-section-sub">No flags detected — all parameters within range</span>
        </div>
      </div>
      <div style="padding:16px 20px; text-align:center; color:#16a34a; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0; font-size:12px; font-weight:600;">
        ✓ All analyzed parameters are within normal reference ranges.
      </div>
    </div>`;
  }

  return `
    <div class="rs-section">
      <!-- Section header -->
      <div class="rs-section-header" style="margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:28px;height:28px;border-radius:8px;background:#fff1f1;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5L11.5 10.5H1.5L6.5 1.5Z" stroke="#f87171" stroke-width="1.5" stroke-linejoin="round"/><line x1="6.5" y1="5" x2="6.5" y2="8" stroke="#f87171" stroke-width="1.4" stroke-linecap="round"/><circle cx="6.5" cy="9.5" r="0.7" fill="#f87171"/></svg>
          </div>
          <div>
            <h2 class="section-heading-v2" style="margin-bottom:1px;">Abnormal Findings</h2>
            <span class="rs-section-sub">${renderedProfilesCount} profile${renderedProfilesCount !== 1 ? 's' : ''} flagged &nbsp;·&nbsp; ${totalAbnormal} out-of-range parameter${totalAbnormal !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="text-align:right;">
              <div style="font-size:10px;font-weight:700;color:#f87171;">${pct}%</div>
            <div style="font-size:8px;color:#94a3b8;font-weight:500;letter-spacing:0.04em;">OUT OF RANGE</div>
          </div>
          <div style="width:36px;height:36px;position:relative;flex-shrink:0;">
            <svg width="36" height="36" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" stroke-width="4"/>
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f87171" stroke-width="4"
                stroke-dasharray="${Math.round(pct * 0.879)} 87.9"
                stroke-dashoffset="22"
                stroke-linecap="round"
                transform="rotate(-90 18 18)"/>
            </svg>
          </div>
        </div>
      </div>
      <!-- Two-column profile grid -->
      <div class="rs-profiles-grid">
        ${profileBlocks}
      </div>
    </div>`;
}

function renderClinicalObservations(stats: ReportStats): string {
  let observations = stats.observations;

  if (observations.length === 0) {
    observations = [{ text: 'All analyzed parameters are within normal reference ranges.', severity: 'healthy' }];
  }

  const rows = observations.slice(0, 8).map(obs => {
    const style = getSharedSeverityStyle(obs.severity);
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
                    <div class="legend-item"><div class="legend-dot" style="background-color:#f87171"></div><span class="legend-label">High</span></div>
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

    // Single pass over all profiles/parameters — shared by all sections
    const stats = computeReportStats(report);

    return `
<section class="indepth-summary-v2">
    <!-- MASTER HEALTH SCORE SECTION -->
    <div class="health-score-section" style="display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 32px; text-align: left;">
        <div class="gauge-wrapper" style="flex-shrink: 0; padding: 10px; padding-top: 0px;">
            ${renderScoreGauge({ score: report.overallScore, size: 170, label: '' })}
        </div>
        <div style="flex: 1; display: flex; flex-direction: column;">
            <h2 class="section-heading-v2" style="font-size: 15px; margin-bottom: 10px; margin-top:0;">MASTER HEALTH SCORE</h2>
            ${renderStatusGrid(report, stats)}
        </div>
    </div>

    <div class="summary-divider" style="margin-top: 6px; margin-bottom: 6px;"></div>

    <!-- REPORT SUMMARY (profiles + parameters with status) -->
    ${renderReportSummary(report)}



    <!-- AI CLINICAL RECOMMENDATIONS (if present) -->
    ${renderAiRecommendations(report)}
</section>`;
  },
};
