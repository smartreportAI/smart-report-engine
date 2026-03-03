/**
 * InDepth — Summary Page (v2)
 *
 * One-page premium executive snapshot featuring:
 *   - Master Health Score Gauge
 *   - Health status breakdown (Healthy / Monitor / Attention)
 *   - Organ System Summary (Profile cards with scores)
 *   - Key Clinical Observations (Abnormal parameters list)
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';
import type { ProfileResult } from '../../domain/models/profile.model';
import { renderScoreGauge } from '../shared/index';

/* ────────────────────────────────────────────────────────────────── */
/*  Icons Mapping for Organ Systems                                   */
/* ────────────────────────────────────────────────────────────────── */

const ORGAN_ICONS: Record<string, string> = {
  'Blood sugar': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10l4.5 4.5"/><circle cx="12" cy="12" r="10"/></svg>',
  'Vitamin Analysis': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  'Lipid Profile': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 0 0 0 18v-9L12 3Z"/><path d="M12 21a9 9 0 0 1 0-18v9l0 9Z"/></svg>',
  'Thyroid Profile': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12V22"/><path d="M20 12V22"/><path d="M12 2V12"/><path d="M12 12L4 22"/><path d="M12 12L20 22"/></svg>',
  'Liver Profile': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 13s5-3 10-3 10 3 10 3v6s-5-3-10-3-10 3-10 3v-6Z"/></svg>',
  'Kidney Profile': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 1 5 5v10a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5Z"/></svg>',
  'Cardiac Health': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
};

const DEFAULT_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';

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
  const counts = { healthy: 0, monitor: 0, attention: 0 };
  report.profiles.forEach(p => {
    if (p.severity === 'healthy') counts.healthy++;
    else if (p.severity === 'monitor') counts.monitor++;
    else counts.attention++;
  });

  const items = [
    { label: 'Healthy', count: counts.healthy, sev: 'healthy' },
    { label: 'Monitor', count: counts.monitor, sev: 'monitor' },
    { label: 'Attention', count: counts.attention, sev: 'attention' },
  ];

  const cards = items.map(item => {
    const style = getSeverityStyle(item.sev);
    return `
            <div class="status-card" style="background-color:${style.bg}; border-color:${style.color}30">
                <p class="status-card-value" style="color:${style.color}">${item.count}</p>
                <p class="status-card-label" style="color:${style.color}">${item.label}</p>
            </div>
        `;
  }).join('');

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

  // If we have an AI assessment, make it clear that the score is AI-generated
  const introText = report.aiAssessment
    ? `Based on a comprehensive AI evaluation of all parameters, your Master Health Score is <strong style="color:${scoreColor}">${report.overallScore}/100</strong>, ${summaryText}`
    : `Your overall health score is <strong style="color:${scoreColor}">${report.overallScore}/100</strong>, ${summaryText}`;

  return `
        <div class="health-score-breakdown">
            <h2 class="section-heading-v2">Master Health Score</h2>
            <div class="status-grid">${cards}</div>
            <p class="score-summary-text">
                ${introText}
            </p>
        </div>
    `;
}

function renderOrganSystems(report: NormalizedReport): string {
  const systemCards = report.profiles.map(p => {
    const style = getSeverityStyle(p.severity);
    const icon = ORGAN_ICONS[p.name] || DEFAULT_ICON;

    return `
            <div class="organ-card">
                <div class="organ-card-top">
                    <div class="organ-icon-box">${icon}</div>
                    <span class="organ-status-badge" style="background-color:${style.bg}; color:${style.color}">
                        ${p.severity}
                    </span>
                </div>
                <div class="organ-card-name">${p.name}</div>
                <div class="organ-score-row">
                    <span class="organ-score-label">System Score</span>
                    <span class="organ-score-value">${p.profileScore}/100</span>
                </div>
            </div>
        `;
  }).join('');

  return `
        <div>
            <div class="organ-system-header">
                <h2 class="section-heading-v2">Organ System Summary</h2>
                <span class="organ-system-meta">Score out of 100 • ${report.profiles.length} systems analyzed</span>
            </div>
            <div class="organ-system-grid">${systemCards}</div>
        </div>
    `;
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
    <div class="health-score-section">
        <div class="gauge-wrapper">
            ${renderScoreGauge({ score: report.overallScore, size: 140, label: '' })}
        </div>
        ${renderStatusGrid(report)}
    </div>

    <div class="summary-divider" style="margin-top: 24px; margin-bottom: 24px;"></div>

    <!-- ORGAN SYSTEM SUMMARY -->
    ${renderOrganSystems(report)}

    <div class="summary-divider" style="margin-top: 24px; margin-bottom: 24px;"></div>

    <!-- KEY CLINICAL OBSERVATIONS -->
    ${renderClinicalObservations(report)}

    <!-- AI CLINICAL RECOMMENDATIONS (if present) -->
    ${renderAiRecommendations(report)}
</section>`;
  },
};
