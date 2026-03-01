/**
 * InDepth — Summary Page
 *
 * One-page executive snapshot of the entire report:
 *   - Patient header
 *   - Speedometer for overall score
 *   - Profile-level summary table (one row per profile — name, score, severity, abnormal count)
 *   - Abnormal parameters call-out list (all abnormal params across all profiles)
 *   - Key takeaways / flags strip
 *
 * Receives: NormalizedReport (full report)
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';
import type { ProfileResult } from '../../domain/models/profile.model';
import { renderScoreGauge, renderPatientHeader } from '../shared/index';

/* ------------------------------------------------------------------ */

function severityColor(sev: string): string {
    if (sev === 'stable' || sev === 'healthy') return '#2E7D32';
    if (sev === 'monitor') return '#F9A825';
    return '#C62828';
}

function severityBg(sev: string): string {
    if (sev === 'stable' || sev === 'healthy') return 'var(--color-healthy)';
    if (sev === 'monitor') return 'var(--color-monitor)';
    return 'var(--color-attention)';
}

function renderProfileSummaryRow(profile: ProfileResult, primaryColor: string): string {
    const bg = severityBg(profile.severity);
    const scoreBarWidth = Math.max(0, Math.min(100, profile.profileScore));

    return `
<tr class="summary-table__row">
  <td class="summary-table__profile-name">${profile.name}</td>
  <td>
    <div class="summary-score-bar">
      <div class="summary-score-bar__fill"
           style="width:${scoreBarWidth}%;background:${bg}"></div>
    </div>
    <span class="summary-score-num" style="color:${bg}">${profile.profileScore}</span>
  </td>
  <td>
    <span class="summary-badge" style="background:${bg}">
      ${profile.severity.toUpperCase()}
    </span>
  </td>
  <td class="summary-table__abnormal">
    ${profile.abnormalCount > 0
            ? `<span style="color:#C62828;font-weight:600">${profile.abnormalCount}</span>`
            : `<span style="color:#2E7D32">—</span>`}
  </td>
</tr>`;
}

function renderAbnormalCallout(report: NormalizedReport): string {
    type AbnItem = { profile: string; name: string; value: string | number; unit?: string; status: string };
    const items: AbnItem[] = [];

    for (const profile of report.profiles) {
        for (const param of profile.parameters) {
            if (param.status !== 'normal') {
                items.push({
                    profile: profile.name,
                    name: param.name,
                    value: param.value,
                    unit: param.unit,
                    status: param.status,
                });
            }
        }
    }

    if (items.length === 0) {
        return `
<div class="callout callout--good">
  <div class="callout__icon">✅</div>
  <div class="callout__text">All parameters are within normal reference ranges.</div>
</div>`;
    }

    const rows = items
        .slice(0, 12) // cap at 12 on summary page; detail page shows all
        .map(
            (item) => `
    <div class="abn-row">
      <span class="abn-row__profile">${item.profile}</span>
      <span class="abn-row__name">${item.name}</span>
      <span class="abn-row__value">${item.value}${item.unit ? ` ${item.unit}` : ''}</span>
      <span class="abn-row__status abn-status--${item.status}">${item.status.toUpperCase()}</span>
    </div>`,
        )
        .join('');

    const more = items.length > 12
        ? `<div class="abn-more">+${items.length - 12} more — see detailed pages below</div>`
        : '';

    return `
<div class="abn-callout">
  <div class="abn-callout__header">⚠️ Parameters Requiring Attention</div>
  ${rows}
  ${more}
</div>`;
}

/* ------------------------------------------------------------------ */

export const inDepthSummaryPage: ReportPage = {
    name: 'indepth-summary',

    generate(ctx: PageRenderContext): string {
        const report = ctx.data as NormalizedReport;
        const strategy = ctx.strategy;
        const primaryColor = 'var(--color-primary)';

        const today = new Date().toLocaleDateString('en-IN', {
            day: '2-digit', month: 'long', year: 'numeric',
        });

        const gauge = renderScoreGauge({ score: report.overallScore, size: 180, label: 'Health Score' });
        const patientHeader = renderPatientHeader({ report, primaryColor, reportDate: today });

        const profileRows = report.profiles
            .map((p) => renderProfileSummaryRow(p, primaryColor))
            .join('');

        const abnormalCallout = renderAbnormalCallout(report);

        // Analytics strip (strategy-gated for inDepth this is always true)
        const totalProfiles = report.profiles.length;
        const totalParams = report.profiles.reduce((s, p) => s + p.parameters.length, 0);
        const totalAbnormal = report.profiles.reduce((s, p) => s + p.abnormalCount, 0);

        return `
<section class="indepth-summary">
  <h1 class="summary-title">Executive Summary</h1>
  ${patientHeader}

  <div class="summary-top-row">
    <!-- Score gauge -->
    <div class="summary-gauge-col">
      ${gauge}
      <div class="summary-severity-chip"
           style="background:${severityBg(report.overallSeverity)}">
        ${report.overallSeverity.toUpperCase()}
      </div>
    </div>

    <!-- Quick stats -->
    <div class="summary-stats-col">
      <div class="summary-stat-box">
        <div class="summary-stat-box__value">${totalProfiles}</div>
        <div class="summary-stat-box__label">Profiles Tested</div>
      </div>
      <div class="summary-stat-box">
        <div class="summary-stat-box__value">${totalParams}</div>
        <div class="summary-stat-box__label">Parameters</div>
      </div>
      <div class="summary-stat-box" style="border-color:#C62828">
        <div class="summary-stat-box__value" style="color:#C62828">${totalAbnormal}</div>
        <div class="summary-stat-box__label">Abnormal</div>
      </div>
    </div>
  </div>

  <!-- Profile-level summary table -->
  <h2 class="summary-section-heading">Profile Overview</h2>
  <table class="summary-table">
    <thead>
      <tr>
        <th>Profile</th>
        <th>Score</th>
        <th>Status</th>
        <th>Abnormal</th>
      </tr>
    </thead>
    <tbody>${profileRows}</tbody>
  </table>

  <!-- Abnormal parameter callout -->
  <h2 class="summary-section-heading">Abnormal Parameters</h2>
  ${abnormalCallout}
</section>`;
    },
};
