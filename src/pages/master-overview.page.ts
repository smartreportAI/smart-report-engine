import type { ReportPage, PageRenderContext } from '../core/page-registry/page.types';
import type { NormalizedReport } from '../domain/models/report.model';
import type { ProfileResult } from '../domain/models/profile.model';
import type { ReportStrategy } from '../rendering/strategies/report-strategy.types';

/* ---------------------------------------------------------------
   Color helpers — map severity strings to design-system classes
   --------------------------------------------------------------- */

function severityColorVar(severity: string): string {
  switch (severity) {
    case 'healthy':
    case 'stable':
      return 'var(--color-healthy)';
    case 'monitor':
      return 'var(--color-monitor)';
    case 'attention':
    case 'critical':
      return 'var(--color-attention)';
    default:
      return 'var(--color-healthy)';
  }
}

function overallColorVar(severity: string): string {
  switch (severity) {
    case 'stable':
      return 'var(--color-primary)';
    case 'monitor':
      return 'var(--color-monitor)';
    case 'critical':
      return 'var(--color-attention)';
    default:
      return 'var(--color-primary)';
  }
}

function overallBgClass(severity: string): string {
  switch (severity) {
    case 'stable':
      return 'bg-stable';
    case 'monitor':
      return 'bg-sev-monitor';
    case 'critical':
      return 'bg-critical';
    default:
      return 'bg-stable';
  }
}

/* ---------------------------------------------------------------
   SVG Radial Progress Ring
   --------------------------------------------------------------- */

function renderScoreRing(score: number, severity: string): string {
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;
  const ringColor = overallColorVar(severity);

  return `
    <div class="score-ring-wrapper">
      <svg class="score-ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle class="score-ring-track"
                cx="${size / 2}" cy="${size / 2}" r="${radius}" />
        <circle class="score-ring-fill"
                cx="${size / 2}" cy="${size / 2}" r="${radius}"
                stroke="${ringColor}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${dashOffset}" />
      </svg>
      <div class="score-ring-value">
        <div class="score-ring-number" style="color:${ringColor}">${score}</div>
        <div class="score-ring-label">/ 100</div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------
   Analytics Strip (strategy-gated)
   --------------------------------------------------------------- */

function renderAnalyticsStrip(report: NormalizedReport): string {
  const totalProfiles = report.profiles.length;
  const totalAbnormal = report.profiles.reduce(
    (sum, p) => sum + p.abnormalCount,
    0,
  );
  const criticalFlags = report.profiles.filter(
    (p) => p.severity === 'attention',
  ).length;

  return `
    <div class="analytics-strip">
      <div class="analytics-item">
        <div class="analytics-value text-primary">${totalProfiles}</div>
        <div class="analytics-label">Total Profiles</div>
      </div>
      <div class="analytics-item">
        <div class="analytics-value" style="color:var(--color-monitor)">${totalAbnormal}</div>
        <div class="analytics-label">Abnormal Parameters</div>
      </div>
      <div class="analytics-item">
        <div class="analytics-value" style="color:var(--color-attention)">${criticalFlags}</div>
        <div class="analytics-label">Critical Flags</div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------
   Premium Profile / Organ Card
   --------------------------------------------------------------- */

function renderProfileCard(profile: ProfileResult): string {
  const barColor = severityColorVar(profile.severity);
  const barWidth = Math.max(0, Math.min(100, profile.profileScore));

  const badgeHtml =
    profile.abnormalCount > 0
      ? `<span class="card-badge-corner bg-attention">${profile.abnormalCount} abnormal</span>`
      : '';

  return `
    <div class="profile-card">
      ${badgeHtml}
      <div class="card-name">${profile.name}</div>
      <div class="card-score-value" style="color:${barColor}">${profile.profileScore}</div>
      <div class="card-score-bar">
        <div class="card-score-bar-fill"
             style="width:${barWidth}%;background:${barColor}"></div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------
   Page Export
   --------------------------------------------------------------- */

export const masterOverviewPage: ReportPage = {
  name: 'master-overview',

  generate(ctx: PageRenderContext): string {
    const report = ctx.data as NormalizedReport;
    const strategy: ReportStrategy = ctx.strategy;

    const labelClass = overallBgClass(report.overallSeverity);
    const scoreRing = renderScoreRing(
      report.overallScore,
      report.overallSeverity,
    );

    // Analytics strip is strategy-gated
    const analyticsStrip = strategy.allowAnalyticsStrip
      ? renderAnalyticsStrip(report)
      : '';

    const profileCards = report.profiles.map(renderProfileCard).join('\n');

    return `
<section class="master-overview">
  <h1 class="section-title">Master Health Overview</h1>

  ${scoreRing}
  <br />
  <span class="severity-label ${labelClass}">${report.overallSeverity}</span>

  ${analyticsStrip}

  <h3 class="section-title">Profile Summary</h3>

  <div class="profile-grid">
    ${profileCards}
  </div>
</section>`;
  },
};
