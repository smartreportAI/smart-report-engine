import type { ViewerPayload, ViewerProfile, ViewerParameter } from '../viewer.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(v: unknown): string {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function severityColor(s: string, branding: ViewerPayload['branding']): string {
    if (s === 'healthy' || s === 'normal' || s === 'stable') return branding.accentHealthy ?? '#16A34A';
    if (s === 'monitor')                                      return branding.accentMonitor  ?? '#d97706';
    return branding.accentAttention ?? '#dc2626';
}

function severityLabel(s: string): string {
    if (s === 'healthy' || s === 'stable') return 'Looking Good';
    if (s === 'monitor')                   return 'Needs Attention';
    return 'Consult Your Doctor';
}

function severityIcon(s: string): string {
    if (s === 'healthy' || s === 'stable') return '✓';
    if (s === 'monitor')                   return '⚠';
    return '!';
}

function profileSeverityBadge(s: string, branding: ViewerPayload['branding']): string {
    const col = severityColor(s, branding);
    const label = s === 'healthy' ? 'Healthy' : s === 'monitor' ? 'Monitor' : 'Attention';
    const icon  = s === 'healthy' ? '✓' : s === 'monitor' ? '⚠' : '!';
    return `<span class="sev-badge" style="background:${col}18;color:${col};border:1px solid ${col}40">${icon} ${label}</span>`;
}

function statusBadge(s: string): string {
    const map: Record<string, [string, string]> = {
        normal:   ['#16A34A', 'Normal'],
        low:      ['#d97706', 'Low'],
        high:     ['#d97706', 'High'],
        critical: ['#dc2626', 'Critical'],
    };
    const [col, label] = map[s] ?? ['#64748b', s];
    return `<span class="status-badge" style="background:${col}18;color:${col};border:1px solid ${col}40">${label}</span>`;
}

function renderRangeBar(param: ViewerParameter): string {
    const val = typeof param.value === 'number' ? param.value : parseFloat(String(param.value));
    const r = param.range;
    if (isNaN(val) || !r || (r.min === undefined && r.max === undefined)) return '';

    const rMin = r.min ?? 0;
    const rMax = r.max ?? 200;
    const span = rMax - rMin;
    const pad  = span * 0.35;

    const wMin = rMin - pad;
    const wMax = rMax + pad;
    const wSpan = wMax - wMin;

    const nStart = Math.round(((rMin - wMin) / wSpan) * 100);
    const nEnd   = Math.round(((rMax - wMin) / wSpan) * 100);
    const vPos   = Math.round(((Math.max(wMin, Math.min(wMax, val)) - wMin) / wSpan) * 100);

    const col = param.status === 'normal' ? '#16A34A' : param.status === 'critical' ? '#dc2626' : '#d97706';

    return `
<div class="rng-bar">
  <div class="rng-track">
    <div class="rng-normal" style="left:${nStart}%;width:${nEnd - nStart}%"></div>
    <div class="rng-marker" style="left:${vPos}%;background:${col};box-shadow:0 0 0 3px ${col}30"></div>
  </div>
  <div class="rng-labels"><span>${rMin}${param.unit ? ' '+param.unit : ''}</span><span>${rMax}${param.unit ? ' '+param.unit : ''}</span></div>
</div>`;
}

function renderParameter(param: ViewerParameter, idx: number): string {
    const valStr = `${esc(param.value)}${param.unit ? ` <span class="param-unit">${esc(param.unit)}</span>` : ''}`;
    const rangeBar = renderRangeBar(param);
    const isAbnormal = param.status !== 'normal';

    return `
<div class="param-row ${isAbnormal ? 'param-abnormal' : 'param-normal'}">
  <div class="param-top">
    <span class="param-name">${esc(param.name)}</span>
    <div class="param-right">
      <span class="param-value">${valStr}</span>
      ${statusBadge(param.status)}
    </div>
  </div>
  ${rangeBar}
</div>`;
}

function renderProfile(profile: ViewerProfile, idx: number, branding: ViewerPayload['branding']): string {
    const abnormal = profile.parameters.filter(p => p.status !== 'normal');
    const normal   = profile.parameters.filter(p => p.status === 'normal');

    const abnParams = abnormal.map((p, i) => renderParameter(p, i)).join('');
    const normParams = normal.map((p, i) => renderParameter(p, i)).join('');

    const normSection = normal.length > 0 ? `
<div class="norm-group">
  <div class="norm-header">
    <span class="norm-title">✓ Normal Parameters (${normal.length})</span>
  </div>
  ${normParams}
</div>` : '';

    const totalCount = profile.parameters.length;
    const col = severityColor(profile.severity, branding);

    return `
<div class="profile-card" id="pcard-${idx}">
  <button class="profile-header" onclick="toggleProfile(${idx})" aria-expanded="false" aria-controls="pbody-${idx}">
    <div class="profile-left">
      <div class="profile-icon" style="background:${col}18;color:${col}">${severityIcon(profile.severity)}</div>
      <div class="profile-info">
        <div class="profile-name">${esc(profile.name)}</div>
        <div class="profile-meta">
          ${profile.abnormalCount > 0
              ? `<span class="meta-flag" style="color:${col}">${profile.abnormalCount} flagged</span>`
              : `<span class="meta-ok">All in range</span>`}
          <span class="meta-sep">·</span>
          <span class="meta-total">${totalCount} tests</span>
        </div>
      </div>
    </div>
    <div class="profile-right">
      ${profileSeverityBadge(profile.severity, branding)}
      <svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  </button>
  <div class="profile-body" id="pbody-${idx}" aria-hidden="true">
    <div class="profile-body-inner">
      ${abnormal.length > 0 ? `<div class="flag-group">${abnParams}</div>` : ''}
      ${normSection}
    </div>
  </div>
</div>`;
}

function renderRecommendations(recs: string[]): string {
    const items = recs.map(r => `
<div class="rec-item">
  <div class="rec-dot"></div>
  <p class="rec-text">${esc(r)}</p>
</div>`).join('');

    return `
<section class="recs-section">
  <div class="section-header">
    <div class="section-pip recs-pip"></div>
    <h2 class="section-title">Recommendations</h2>
  </div>
  <div class="recs-card">
    <div class="recs-items">${items}</div>
    <div class="recs-disclaimer">
      <span class="disc-icon">⚕</span>
      <span>AI-generated suggestions. Always consult your physician before making health decisions.</span>
    </div>
  </div>
</section>`;
}

// ---------------------------------------------------------------------------
// Main template
// ---------------------------------------------------------------------------

export function renderViewerPage(payload: ViewerPayload): string {
    const { branding, overallScore, overallSeverity, profiles, recommendations } = payload;

    const primary      = branding.primaryColor;
    const scoreColor   = severityColor(overallSeverity, branding);
    const severityMsg  = severityLabel(overallSeverity);
    const severityIcon_ = severityIcon(overallSeverity);

    // Count totals across all profiles
    let totalNormal   = 0;
    let totalAbnormal = 0;
    let totalCritical = 0;
    for (const p of profiles) {
        totalNormal += p.normalCount;
        totalAbnormal += p.abnormalCount;
        for (const param of p.parameters) {
            if (param.status === 'critical') totalCritical++;
        }
    }

    // Gauge SVG geometry (r=80, 270° arc)
    const R   = 80;
    const C   = 2 * Math.PI * R;        // ≈ 502.65
    const arc = (270 / 360) * C;        // ≈ 376.99 — the track length
    const fill = (overallScore / 100) * arc;

    // Profile sections
    const profilesHtml = profiles.map((p, i) => renderProfile(p, i, branding)).join('');
    const recsHtml = recommendations && recommendations.length > 0
        ? renderRecommendations(recommendations)
        : '';

    const contactHtml = [
        branding.contactPhone ? `<a href="tel:${esc(branding.contactPhone)}" class="contact-link">📞 ${esc(branding.contactPhone)}</a>` : '',
        branding.contactEmail ? `<a href="mailto:${esc(branding.contactEmail)}" class="contact-link">✉ ${esc(branding.contactEmail)}</a>` : '',
    ].filter(Boolean).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="${primary}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <title>${esc(branding.labName)} — Health Report</title>
  <style>
    /* ── Reset & Base ────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: ${primary};
      --healthy: ${branding.accentHealthy ?? '#16A34A'};
      --monitor: ${branding.accentMonitor ?? '#d97706'};
      --attention: ${branding.accentAttention ?? '#dc2626'};
      --score-color: ${scoreColor};
      --bg: #f1f5f9;
      --card: #ffffff;
      --text: #0f172a;
      --sub: #64748b;
      --border: #e2e8f0;
      --radius: 16px;
      --shadow: 0 2px 12px rgba(0,0,0,.08);
      --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    }
    html { font-family: var(--font); background: var(--bg); color: var(--text); }
    body { min-height: 100vh; overflow-x: hidden; }
    a { text-decoration: none; }
    button { font-family: var(--font); cursor: pointer; }
    img { display: block; }

    /* ── Splash Screen ───────────────────────────────────── */
    #splash {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: linear-gradient(160deg, ${primary} 0%, ${primary}cc 100%);
      transition: opacity .6s ease, transform .6s ease;
    }
    #splash.splash-exit {
      opacity: 0; transform: translateY(-40px); pointer-events: none;
    }
    .splash-ring-wrap {
      position: relative; width: 140px; height: 140px; margin-bottom: 28px;
    }
    .splash-ring {
      position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.3);
      animation: pulse-ring 2s cubic-bezier(.4,0,.6,1) infinite;
    }
    .splash-ring:nth-child(2) { animation-delay: .4s; }
    .splash-ring:nth-child(3) { animation-delay: .8s; }
    @keyframes pulse-ring {
      0%   { transform: scale(.85); opacity: .9; }
      50%  { transform: scale(1.1); opacity: .3; }
      100% { transform: scale(.85); opacity: .9; }
    }
    .splash-logo-wrap {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,.15); border-radius: 50%;
      backdrop-filter: blur(8px);
    }
    .splash-logo { width: 70px; height: 70px; object-fit: contain; border-radius: 12px; }
    .splash-lab  { font-size: 22px; font-weight: 700; color: #fff; letter-spacing: -.3px; margin-bottom: 8px; }
    .splash-sub  { font-size: 14px; color: rgba(255,255,255,.75); margin-bottom: 32px; }
    .splash-progress-wrap {
      width: 200px; height: 4px; background: rgba(255,255,255,.2); border-radius: 99px; overflow: hidden;
    }
    .splash-progress {
      height: 100%; background: #fff; border-radius: 99px;
      animation: load-bar 1.6s cubic-bezier(.4,0,.2,1) forwards;
    }
    @keyframes load-bar {
      0%   { width: 0%; }
      30%  { width: 45%; }
      70%  { width: 75%; }
      100% { width: 100%; }
    }

    /* ── App Shell ───────────────────────────────────────── */
    #app {
      max-width: 480px; margin: 0 auto;
      padding-bottom: calc(24px + env(safe-area-inset-bottom));
      opacity: 0; transform: translateY(24px);
      transition: opacity .5s ease, transform .5s ease;
    }
    #app.app-visible { opacity: 1; transform: translateY(0); }

    /* ── Sticky Header ───────────────────────────────────── */
    .header {
      position: sticky; top: 0; z-index: 100;
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px 12px calc(16px + env(safe-area-inset-left));
      background: ${primary};
      box-shadow: 0 2px 16px rgba(0,0,0,.18);
    }
    .header-logo { width: 36px; height: 36px; object-fit: contain; border-radius: 8px; flex-shrink: 0; }
    .header-name { flex: 1; font-size: 16px; font-weight: 700; color: #fff; letter-spacing: -.2px; }
    .header-sev  {
      font-size: 11px; font-weight: 700; color: ${primary};
      background: #fff; border-radius: 20px; padding: 4px 10px;
      letter-spacing: .2px;
    }

    /* ── Patient Bar ─────────────────────────────────────── */
    .patient-bar {
      background: var(--card); margin: 0; padding: 14px 16px;
      display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
      border-bottom: 1px solid var(--border);
    }
    .patient-name { font-size: 15px; font-weight: 700; color: var(--text); }
    .patient-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-left: auto; }
    .patient-pill {
      font-size: 11px; color: var(--sub); background: var(--bg);
      border: 1px solid var(--border); border-radius: 20px; padding: 3px 9px;
    }
    .patient-report {
      width: 100%; font-size: 11px; color: var(--sub);
      display: flex; align-items: center; gap: 8px; padding-top: 4px;
    }
    .patient-report-id { color: var(--primary); font-weight: 600; }

    /* ── Hero Score ──────────────────────────────────────── */
    .hero {
      background: var(--card); margin: 12px 12px 0;
      border-radius: var(--radius); box-shadow: var(--shadow);
      padding: 28px 20px 24px;
      display: flex; flex-direction: column; align-items: center;
      position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute; top: -60px; right: -60px;
      width: 200px; height: 200px; border-radius: 50%;
      background: ${primary}0d;
    }
    .gauge-wrap { position: relative; width: 200px; height: 200px; }
    .gauge-svg  { width: 200px; height: 200px; transform: rotate(-225deg); }
    .gauge-track {
      fill: none; stroke: #e2e8f0; stroke-width: 13; stroke-linecap: round;
      stroke-dasharray: ${arc.toFixed(1)} ${C.toFixed(1)};
    }
    .gauge-arc {
      fill: none; stroke: ${scoreColor}; stroke-width: 14; stroke-linecap: round;
      stroke-dasharray: 0 ${C.toFixed(1)};
      animation: gauge-fill 1.8s cubic-bezier(.4,0,.2,1) 2s forwards;
    }
    @keyframes gauge-fill {
      to { stroke-dasharray: ${fill.toFixed(1)} ${C.toFixed(1)}; }
    }
    .gauge-center {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .gauge-score-num {
      font-size: 52px; font-weight: 800; color: var(--text); line-height: 1;
      letter-spacing: -2px;
    }
    .gauge-score-denom { font-size: 16px; color: var(--sub); font-weight: 500; margin-top: 2px; }

    .sev-msg {
      display: flex; align-items: center; gap: 10px;
      margin-top: 20px;
    }
    .sev-icon {
      width: 36px; height: 36px; border-radius: 50%;
      background: ${scoreColor}18; color: ${scoreColor};
      font-size: 18px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .sev-text { font-size: 17px; font-weight: 700; color: var(--text); }

    .score-pills {
      display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; justify-content: center;
    }
    .score-pill {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      padding: 10px 18px; border-radius: 12px; background: var(--bg); min-width: 76px;
    }
    .score-pill-num  { font-size: 22px; font-weight: 800; }
    .score-pill-lbl  { font-size: 11px; color: var(--sub); font-weight: 600; }

    /* ── Section Headers ─────────────────────────────────── */
    .section-header {
      display: flex; align-items: center; gap: 10px;
      padding: 20px 16px 10px;
    }
    .section-pip { width: 4px; height: 20px; border-radius: 2px; }
    .profiles-pip  { background: var(--primary); }
    .recs-pip      { background: #3b82f6; }
    .section-title { font-size: 17px; font-weight: 700; color: var(--text); letter-spacing: -.3px; }

    /* ── Profile Cards ───────────────────────────────────── */
    .profiles-section { padding: 0 12px; }
    .profile-card {
      background: var(--card); border-radius: var(--radius);
      box-shadow: var(--shadow); margin-bottom: 10px; overflow: hidden;
    }
    .profile-header {
      width: 100%; background: none; border: none; padding: 16px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; text-align: left;
    }
    .profile-left  { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
    .profile-icon  {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800; flex-shrink: 0;
    }
    .profile-info  { min-width: 0; }
    .profile-name  { font-size: 15px; font-weight: 700; color: var(--text); line-height: 1.2; }
    .profile-meta  { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
    .meta-flag     { font-size: 12px; font-weight: 600; }
    .meta-ok       { font-size: 12px; color: var(--healthy); font-weight: 600; }
    .meta-sep      { color: var(--sub); font-size: 12px; }
    .meta-total    { font-size: 12px; color: var(--sub); }
    .profile-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .sev-badge     { font-size: 11px; font-weight: 700; padding: 4px 9px; border-radius: 20px; white-space: nowrap; }
    .chevron       {
      color: var(--sub); flex-shrink: 0;
      transition: transform .3s cubic-bezier(.4,0,.2,1);
    }
    .profile-card.open .chevron { transform: rotate(180deg); }

    /* Profile accordion body */
    .profile-body  {
      max-height: 0; overflow: hidden;
      transition: max-height .4s cubic-bezier(.4,0,.2,1);
    }
    .profile-card.open .profile-body { max-height: 4000px; }
    .profile-body-inner { padding: 0 16px 16px; }

    /* ── Flagged Parameters ──────────────────────────────── */
    .flag-group { margin-bottom: 8px; }
    .norm-group { }
    .norm-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 0 6px; border-top: 1px solid var(--border); margin-top: 8px;
    }
    .norm-title  { font-size: 12px; font-weight: 700; color: var(--healthy); }

    .param-row   { padding: 10px 0; border-bottom: 1px solid var(--border); }
    .param-row:last-child { border-bottom: none; }
    .param-abnormal  { }
    .param-normal    { opacity: .85; }
    .param-top  { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .param-name { font-size: 14px; font-weight: 600; color: var(--text); flex: 1; line-height: 1.3; }
    .param-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .param-value { font-size: 14px; font-weight: 700; color: var(--text); }
    .param-unit  { font-size: 11px; color: var(--sub); font-weight: 500; }
    .status-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }

    /* ── Range Bar ───────────────────────────────────────── */
    .rng-bar { margin-top: 8px; }
    .rng-track {
      height: 5px; background: #e2e8f0; border-radius: 9999px;
      position: relative; margin-bottom: 4px;
    }
    .rng-normal {
      position: absolute; top: 0; height: 100%; background: #bbf7d0; border-radius: 9999px;
    }
    .rng-marker {
      position: absolute; top: 50%; transform: translate(-50%, -50%);
      width: 12px; height: 12px; border-radius: 50%;
      border: 2px solid #fff;
    }
    .rng-labels {
      display: flex; justify-content: space-between;
      font-size: 10px; color: var(--sub); padding: 0 2px;
    }

    /* ── AI Recommendations ──────────────────────────────── */
    .recs-section { padding: 0 12px; }
    .recs-card { background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow); padding: 16px; }
    .recs-items { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }
    .rec-item   { display: flex; gap: 12px; align-items: flex-start; }
    .rec-dot    { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; margin-top: 6px; flex-shrink: 0; }
    .rec-text   { font-size: 14px; color: var(--text); line-height: 1.6; }
    .recs-disclaimer {
      display: flex; align-items: flex-start; gap: 8px;
      background: #eff6ff; border-radius: 10px; padding: 10px 12px;
      font-size: 12px; color: #3b82f6; line-height: 1.5;
    }
    .disc-icon  { font-size: 16px; flex-shrink: 0; }

    /* ── Footer ──────────────────────────────────────────── */
    .footer {
      margin: 16px 12px 0;
      background: var(--card); border-radius: var(--radius); box-shadow: var(--shadow);
      padding: 20px 16px;
    }
    .footer-logo-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .footer-logo { width: 36px; height: 36px; object-fit: contain; border-radius: 8px; }
    .footer-lab  { font-size: 15px; font-weight: 700; color: var(--text); }
    .footer-contacts { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .contact-link { font-size: 13px; color: var(--primary); font-weight: 600; }
    .footer-divider { height: 1px; background: var(--border); margin-bottom: 12px; }
    .footer-disc {
      font-size: 11px; color: var(--sub); line-height: 1.6;
      background: var(--bg); border-radius: 10px; padding: 12px;
    }
    .footer-powered { font-size: 11px; color: var(--sub); text-align: center; margin-top: 12px; }
    .footer-powered strong { color: var(--primary); }
  </style>
</head>
<body>

<!-- ══════════════════ SPLASH ══════════════════ -->
<div id="splash">
  <div class="splash-ring-wrap">
    <div class="splash-ring"></div>
    <div class="splash-ring"></div>
    <div class="splash-ring"></div>
    <div class="splash-logo-wrap">
      <img src="${esc(branding.logoUrl)}" class="splash-logo" alt="${esc(branding.labName)}" onerror="this.style.display='none'">
    </div>
  </div>
  <div class="splash-lab">${esc(branding.labName)}</div>
  <div class="splash-sub">Preparing your health report…</div>
  <div class="splash-progress-wrap">
    <div class="splash-progress"></div>
  </div>
</div>

<!-- ══════════════════ APP ══════════════════ -->
<div id="app">

  <!-- ── Sticky Header ── -->
  <header class="header">
    <img src="${esc(branding.logoUrl)}" class="header-logo" alt="${esc(branding.labName)}" onerror="this.style.display='none'">
    <div class="header-name">${esc(branding.labName)}</div>
    <div class="header-sev">${esc(severityMsg)}</div>
  </header>

  <!-- ── Patient Info ── -->
  <div class="patient-bar">
    <span class="patient-name">${esc(payload.patientName ?? 'Confidential Patient')}</span>
    <div class="patient-pills">
      <span class="patient-pill">${esc(payload.age)} yrs</span>
      <span class="patient-pill">${esc(payload.gender.charAt(0).toUpperCase() + payload.gender.slice(1))}</span>
    </div>
    <div class="patient-report">
      <span>Report ID: <span class="patient-report-id">${esc(payload.reportId)}</span></span>
      <span>·</span>
      <span>${esc(payload.reportDate)}</span>
    </div>
  </div>

  <!-- ── Score Hero ── -->
  <div class="hero">
    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${R}" class="gauge-track"/>
        <circle cx="100" cy="100" r="${R}" class="gauge-arc" id="gaugeArc"/>
      </svg>
      <div class="gauge-center">
        <div class="gauge-score-num" id="scoreNum">0</div>
        <div class="gauge-score-denom">/ 100</div>
      </div>
    </div>

    <div class="sev-msg">
      <div class="sev-icon">${esc(severityIcon_)}</div>
      <div class="sev-text">${esc(severityMsg)}</div>
    </div>

    <div class="score-pills">
      <div class="score-pill">
        <span class="score-pill-num" style="color:var(--healthy)">${totalNormal}</span>
        <span class="score-pill-lbl">Normal</span>
      </div>
      ${totalAbnormal > 0 ? `
      <div class="score-pill">
        <span class="score-pill-num" style="color:var(--monitor)">${totalAbnormal}</span>
        <span class="score-pill-lbl">Flagged</span>
      </div>` : ''}
      ${totalCritical > 0 ? `
      <div class="score-pill">
        <span class="score-pill-num" style="color:var(--attention)">${totalCritical}</span>
        <span class="score-pill-lbl">Critical</span>
      </div>` : ''}
    </div>
  </div>

  <!-- ── Profiles ── -->
  <section class="profiles-section">
    <div class="section-header">
      <div class="section-pip profiles-pip"></div>
      <h2 class="section-title">Test Profiles</h2>
    </div>
    ${profilesHtml}
  </section>

  ${recsHtml}

  <!-- ── Footer ── -->
  <footer class="footer">
    <div class="footer-logo-row">
      <img src="${esc(branding.logoUrl)}" class="footer-logo" alt="${esc(branding.labName)}" onerror="this.style.display='none'">
      <div class="footer-lab">${esc(branding.labName)}</div>
    </div>
    ${contactHtml ? `<div class="footer-contacts">${contactHtml}</div>` : ''}
    <div class="footer-divider"></div>
    <p class="footer-disc">
      This report is a summary of your laboratory results. Results should be interpreted
      by a qualified healthcare provider in the context of your personal medical history.
      This does not constitute medical advice, diagnosis, or treatment.
    </p>
    <div class="footer-powered">Powered by <strong>Smart Health Engine</strong></div>
  </footer>

</div><!-- /app -->

<script>
(function () {
  // ── Splash dismiss ──
  var SPLASH_MS = 1900;
  setTimeout(function () {
    var splash = document.getElementById('splash');
    var app    = document.getElementById('app');
    if (splash) splash.classList.add('splash-exit');
    if (app)    app.classList.add('app-visible');
    // Start score counter after splash dismisses
    animateScore(${overallScore}, 1400);
  }, SPLASH_MS);

  // ── Score counter animation ──
  function animateScore(target, duration) {
    var el = document.getElementById('scoreNum');
    if (!el) return;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(ease * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ── Profile accordion ──
  window.toggleProfile = function (idx) {
    var card   = document.getElementById('pcard-' + idx);
    var body   = document.getElementById('pbody-' + idx);
    var btn    = card && card.querySelector('.profile-header');
    if (!card) return;
    var isOpen = card.classList.contains('open');
    card.classList.toggle('open', !isOpen);
    if (btn)  btn.setAttribute('aria-expanded', String(!isOpen));
    if (body) body.setAttribute('aria-hidden',  String(isOpen));
  };

  // Auto-open profiles with abnormal results
  document.querySelectorAll('.profile-card').forEach(function (card) {
    if (card.querySelector('.meta-flag')) {
      var idx = card.id.replace('pcard-', '');
      // Small delay so content is visible after splash
      setTimeout(function () { window.toggleProfile(Number(idx)); }, SPLASH_MS + 100);
    }
  });
}());
</script>
</body>
</html>`;
}
