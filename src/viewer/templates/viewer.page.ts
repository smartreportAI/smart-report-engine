import type { ViewerPayload, ViewerProfile, ViewerParameter } from '../viewer.types';

// ---------------------------------------------------------------------------
// Helpers  (logic unchanged)
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

function severityEmoji(s: string): string {
    if (s === 'healthy' || s === 'stable') return '💚';
    if (s === 'monitor')                   return '🔶';
    return '🔴';
}

function severityDesc(s: string, name: string): string {
    const first = (name ?? 'Patient').split(' ')[0];
    if (s === 'healthy' || s === 'stable') return `Great news, ${first}! Your results are within healthy ranges. Keep up the good work with your current lifestyle.`;
    if (s === 'monitor') return `${first}, some of your results need attention. Please review the flagged parameters below and consider discussing them with your doctor.`;
    return `${first}, some results require immediate medical attention. Please consult your healthcare provider as soon as possible.`;
}

function profileSeverityBadge(s: string, branding: ViewerPayload['branding']): string {
    const col = severityColor(s, branding);
    const label = s === 'healthy' ? 'Healthy' : s === 'monitor' ? 'Monitor' : 'Attention';
    const icon  = s === 'healthy' ? '✓' : s === 'monitor' ? '⚠' : '!';
    return `<span class="sev-badge" style="background:${col}14;color:${col};border:1px solid ${col}30">${icon} ${label}</span>`;
}

function statusBadge(s: string): string {
    const map: Record<string, [string, string]> = {
        normal:   ['#16A34A', 'Normal'],
        low:      ['#d97706', 'Low'],
        high:     ['#d97706', 'High'],
        critical: ['#dc2626', 'Critical'],
    };
    const [col, label] = map[s] ?? ['#64748b', s];
    return `<span class="status-badge" style="background:${col}14;color:${col};border:1px solid ${col}30">${label}</span>`;
}

function getInitials(name?: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
}

function nameToGradient(name?: string): string {
    let hash = 0;
    for (const c of (name ?? 'P')) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${h},72%,58%), hsl(${(h+40)%360},68%,48%))`;
}

// ---------------------------------------------------------------------------
// Slider  (3-segment clinical design with equal-width labels)
// ---------------------------------------------------------------------------

function renderSlider(param: ViewerParameter): string {
    const val = typeof param.value === 'number' ? param.value : parseFloat(String(param.value));
    const r = param.range;
    if (isNaN(val) || !r || (r.min === undefined && r.max === undefined)) return '';

    const rMin = r.min ?? 0;
    const rMax = r.max ?? 200;
    const span = rMax - rMin || 1;
    const pad = span * 0.35;
    const wMin = rMin - pad;
    const wMax = rMax + pad;
    const wSpan = wMax - wMin || 1;

    // 3-segment positions
    const nStart = Math.round(((rMin - wMin) / wSpan) * 100);
    const nEnd   = Math.round(((rMax - wMin) / wSpan) * 100);

    // Marker position
    const clamped = Math.max(wMin, Math.min(wMax, val));
    let markerPct = Math.round(((clamped - wMin) / wSpan) * 100);
    const bubblePct = Math.min(Math.max(markerPct, 6), 94);

    const isNormal = param.status === 'normal';
    const bubbleCol = isNormal ? '#16A34A' : param.status === 'critical' ? '#dc2626' : '#d97706';
    const unit = (param.unit ?? '').trim();

    // Label strings
    let lowR = `< ${rMin}`, normR = `${rMin} – ${rMax}`, highR = `> ${rMax}`;
    if (r.min === undefined) { lowR = '-'; normR = `< ${rMax}`; }
    if (r.max === undefined) { highR = '-'; normR = `> ${rMin}`; }

    return `
<div class="sl-wrap">
  <div class="sl-area">
    <div class="sl-bub-pos" style="left:${bubblePct}%">
      <div class="sl-bubble" style="background:${bubbleCol}"><span class="sl-bub-val">${val}</span>${unit ? `<span class="sl-bub-unit">${unit}</span>` : ''}</div>
      <div class="sl-bub-tip" style="border-top-color:${bubbleCol}"></div>
    </div>
    <div class="sl-track">
      <div class="sl-seg sl-seg-low" style="width:${nStart}%"></div>
      <div class="sl-seg sl-seg-norm" style="width:${nEnd - nStart}%"></div>
      <div class="sl-seg sl-seg-high" style="width:${100 - nEnd}%"></div>
    </div>
  </div>
  <div class="sl-labels">
    <div class="sl-label"><span class="sl-lbl-text sl-lbl-low">↓ Low</span><span class="sl-lbl-range">${lowR}</span></div>
    <div class="sl-label"><span class="sl-lbl-text sl-lbl-norm">✓ Normal</span><span class="sl-lbl-range">${normR}</span></div>
    <div class="sl-label"><span class="sl-lbl-text sl-lbl-high">↑ High</span><span class="sl-lbl-range">${highR}</span></div>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Parameter row
// ---------------------------------------------------------------------------

function renderParameter(param: ViewerParameter, idx: number): string {
    const valStr = `${esc(param.value)}${param.unit ? ` <span class="param-unit">${esc(param.unit)}</span>` : ''}`;
    const isAbnormal = param.status !== 'normal';
    // Only show sliders for abnormal parameters
    const slider = isAbnormal ? renderSlider(param) : '';

    return `
<div class="param-row ${isAbnormal ? 'param-abnormal' : 'param-normal'}">
  <div class="param-top">
    <span class="param-name">${esc(param.name)}</span>
    <div class="param-right">
      <span class="param-value">${valStr}</span>
      ${statusBadge(param.status)}
    </div>
  </div>
  ${slider}
</div>`;
}

// ---------------------------------------------------------------------------
// Profile card
// ---------------------------------------------------------------------------

function renderProfile(profile: ViewerProfile, idx: number, branding: ViewerPayload['branding']): string {
    const abnormal = profile.parameters.filter(p => p.status !== 'normal');
    const normal   = profile.parameters.filter(p => p.status === 'normal');

    const abnParams = abnormal.map((p, i) => renderParameter(p, i)).join('');
    const normParams = normal.map((p, i) => renderParameter(p, i)).join('');

    const normSection = normal.length > 0 ? `
<div class="norm-group">
  <div class="norm-header">
    <span class="norm-dot"></span>
    <span class="norm-title">Normal Parameters (${normal.length})</span>
  </div>
  ${normParams}
</div>` : '';

    const totalCount = profile.parameters.length;
    const normPct = totalCount > 0 ? Math.round((normal.length / totalCount) * 100) : 100;
    const col = severityColor(profile.severity, branding);

    return `
<div class="profile-card reveal" id="pcard-${idx}">

  <button class="profile-header" onclick="toggleProfile(${idx})" aria-expanded="false" aria-controls="pbody-${idx}">
    <div class="profile-left">
      <div class="profile-ring-wrap">
        <svg class="profile-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" stroke-width="2.5"/><circle cx="18" cy="18" r="15.9" fill="none" stroke="${col}" stroke-width="2.5" stroke-dasharray="${normPct} ${100-normPct}" stroke-dashoffset="25" stroke-linecap="round"/></svg>
        <span class="profile-ring-pct">${normPct}%</span>
      </div>
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

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function renderRecommendations(recs: string[]): string {
    const items = recs.map((r, i) => `
<div class="rec-card reveal" style="animation-delay:${i * 80}ms">
  <div class="rec-num">${i + 1}</div>
  <p class="rec-text">${esc(r)}</p>
</div>`).join('');

    return `
<section class="recs-section" id="sec-insights">
  <div class="section-header reveal">
    <div class="section-pip recs-pip"></div>
    <h2 class="section-title">AI Recommendations</h2>
  </div>
  <div class="recs-list">${items}</div>
  <div class="recs-disclaimer reveal">
    <span class="disc-icon">⚕</span>
    <span>AI-generated suggestions. Always consult your physician before making health decisions.</span>
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
    const C   = 2 * Math.PI * R;
    const arc = (270 / 360) * C;
    const fill = (overallScore / 100) * arc;

    // Profile sections
    const profilesHtml = profiles.map((p, i) => renderProfile(p, i, branding)).join('');
    const recsHtml = recommendations && recommendations.length > 0
        ? renderRecommendations(recommendations)
        : '';

    const contactHtml = [
        branding.contactPhone ? `<a href="tel:${esc(branding.contactPhone)}" class="contact-btn">📞 ${esc(branding.contactPhone)}</a>` : '',
        branding.contactEmail ? `<a href="mailto:${esc(branding.contactEmail)}" class="contact-btn">✉ ${esc(branding.contactEmail)}</a>` : '',
    ].filter(Boolean).join('');

    const initials = getInitials(payload.patientName);
    const avatarGrad = nameToGradient(payload.patientName);
    const descText = severityDesc(overallSeverity, payload.patientName ?? 'Patient');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="${primary}">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <title>${esc(branding.labName)} — Health Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --primary:${primary};--healthy:${branding.accentHealthy??'#16A34A'};--monitor:${branding.accentMonitor??'#d97706'};--attention:${branding.accentAttention??'#dc2626'};--score:${scoreColor};
      --bg:#f0f2f5;--card:#ffffff;--text:#0f172a;--sub:#64748b;--muted:#94a3b8;--border:#e8ecf1;
      --radius:20px;--shadow:0 4px 24px rgba(0,0,0,.06);--font:'Inter',system-ui,-apple-system,sans-serif;
    }
    html{font-family:var(--font);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
    body{min-height:100vh;min-height:100dvh;overflow-x:hidden}
    a{text-decoration:none}button{font-family:var(--font);cursor:pointer}img{display:block}

    /* ── Splash ─────────────────────────────────── */
    #splash{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(160deg,${primary} 0%,${primary}dd 50%,${primary}bb 100%);overflow:hidden}
    #splash.splash-exit{animation:splashOut .7s cubic-bezier(.65,0,.35,1) forwards}
    @keyframes splashOut{0%{clip-path:circle(150% at 50% 50%);opacity:1}100%{clip-path:circle(0% at 50% 50%);opacity:0}}
    .splash-orb{position:absolute;border-radius:50%;filter:blur(60px);opacity:.3;animation:orbFloat 4s ease-in-out infinite alternate}
    .splash-orb:nth-child(1){width:200px;height:200px;background:#fff;top:10%;left:-20%;animation-delay:0s}
    .splash-orb:nth-child(2){width:160px;height:160px;background:${primary};top:60%;right:-15%;animation-delay:1s;filter:blur(40px)}
    .splash-orb:nth-child(3){width:120px;height:120px;background:#fff;bottom:5%;left:30%;animation-delay:.5s}
    @keyframes orbFloat{0%{transform:translateY(0) scale(1)}100%{transform:translateY(-30px) scale(1.1)}}
    .splash-center{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center}
    .splash-logo-ring{width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.12);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);display:flex;align-items:center;justify-content:center;margin-bottom:24px;border:1.5px solid rgba(255,255,255,.2);animation:logoReveal .8s cubic-bezier(.16,1,.3,1) both;box-shadow:0 8px 32px rgba(0,0,0,.12)}
    @keyframes logoReveal{0%{transform:scale(.5);opacity:0;filter:blur(10px)}100%{transform:scale(1);opacity:1;filter:blur(0)}}
    .splash-logo{width:56px;height:56px;object-fit:contain;border-radius:14px}
    .splash-lab{font-size:24px;font-weight:800;color:#fff;letter-spacing:-.5px;opacity:0;animation:fadeUp .6s .4s cubic-bezier(.16,1,.3,1) forwards}
    .splash-sub{font-size:14px;color:rgba(255,255,255,.7);margin-top:6px;opacity:0;animation:fadeUp .6s .6s cubic-bezier(.16,1,.3,1) forwards}
    @keyframes fadeUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
    .splash-bar-wrap{width:180px;height:3px;background:rgba(255,255,255,.15);border-radius:99px;overflow:hidden;margin-top:32px;opacity:0;animation:fadeUp .4s .8s ease forwards}
    .splash-bar{height:100%;background:#fff;border-radius:99px;animation:loadBar 1.8s 1s cubic-bezier(.4,0,.2,1) forwards}
    @keyframes loadBar{0%{width:0}30%{width:40%}70%{width:70%}100%{width:100%}}

    /* ── App Shell ──────────────────────────────── */
    #app{max-width:480px;margin:0 auto;padding-bottom:calc(24px + env(safe-area-inset-bottom));opacity:0;transform:translateY(20px);transition:opacity .6s ease,transform .6s ease}
    #app.app-visible{opacity:1;transform:translateY(0)}

    /* ── Reveal animation ──────────────────────── */
    .reveal{opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s ease}
    .reveal.visible{opacity:1;transform:translateY(0)}

    /* ── Header ─────────────────────────────────── */
    .header{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:12px;padding:12px 16px;background:rgba(255,255,255,.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid rgba(0,0,0,.06);transition:box-shadow .3s ease}
    .header.scrolled{box-shadow:0 4px 20px rgba(0,0,0,.08)}
    .header-logo{width:34px;height:34px;object-fit:contain;border-radius:10px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .header-name{flex:1;font-size:15px;font-weight:700;color:var(--text);letter-spacing:-.2px}
    .header-badge{font-size:11px;font-weight:700;color:#fff;background:${primary};border-radius:20px;padding:5px 12px;letter-spacing:.2px}

    /* ── Patient Card ───────────────────────────── */
    .patient-card{margin:12px 12px 0;background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:20px;overflow:hidden;position:relative}
    .patient-card::before{content:'';position:absolute;top:-40px;right:-40px;width:140px;height:140px;border-radius:50%;background:${primary}08}
    .patient-top{display:flex;align-items:center;gap:14px;position:relative;z-index:1}
    .patient-avatar{width:48px;height:48px;border-radius:16px;background:${primary};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;box-shadow:0 4px 12px ${primary}30}
    .patient-info{flex:1;min-width:0}
    .patient-greeting{font-size:12px;color:var(--sub);font-weight:500;margin-bottom:2px}
    .patient-name{font-size:18px;font-weight:800;color:var(--text);letter-spacing:-.3px}
    .patient-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;position:relative;z-index:1}
    .patient-chip{font-size:11px;color:var(--sub);background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:5px 10px;font-weight:500}
    .patient-chip-id{font-family:'SF Mono',ui-monospace,monospace;font-size:10px;color:var(--primary);background:${primary}08;border-color:${primary}20}

    /* ── Description Card ──────────────────────── */
    .desc-card{margin:10px 12px 0;background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px;display:flex;gap:14px;align-items:flex-start}
    .desc-emoji{font-size:28px;flex-shrink:0;line-height:1}
    .desc-body{}
    .desc-title{font-size:14px;font-weight:700;color:var(--text);margin-bottom:4px}
    .desc-text{font-size:13px;color:var(--sub);line-height:1.6}

    /* ── Hero Score ──────────────────────────────── */
    .hero{background:var(--card);margin:10px 12px 0;border-radius:var(--radius);box-shadow:var(--shadow);padding:28px 20px 24px;display:flex;flex-direction:column;align-items:center;position:relative;overflow:hidden}
    .hero::before{content:'';position:absolute;top:-80px;right:-80px;width:220px;height:220px;border-radius:50%;background:${primary}08}
    .hero::after{content:'';position:absolute;bottom:-60px;left:-60px;width:180px;height:180px;border-radius:50%;background:var(--score)08}
    .gauge-wrap{position:relative;width:200px;height:200px;z-index:1}
    .gauge-svg{width:200px;height:200px;transform:rotate(-225deg)}
    .gauge-track{fill:none;stroke:#e8ecf1;stroke-width:12;stroke-linecap:round;stroke-dasharray:${arc.toFixed(1)} ${C.toFixed(1)}}
    .gauge-arc{fill:none;stroke:${scoreColor};stroke-width:13;stroke-linecap:round;stroke-dasharray:0 ${C.toFixed(1)};transition:stroke-dasharray 2s cubic-bezier(.4,0,.2,1);filter:drop-shadow(0 2px 8px ${scoreColor}40)}
    .gauge-arc.animated{stroke-dasharray:${fill.toFixed(1)} ${C.toFixed(1)}}
    .gauge-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
    .gauge-score-num{font-size:56px;font-weight:900;color:var(--text);line-height:1;letter-spacing:-3px}
    .gauge-score-denom{font-size:14px;color:var(--muted);font-weight:500;margin-top:2px}
    .sev-msg{display:flex;align-items:center;gap:10px;margin-top:20px;z-index:1}
    .sev-icon{width:38px;height:38px;border-radius:50%;background:${scoreColor}12;color:${scoreColor};font-size:18px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sev-text{font-size:17px;font-weight:700;color:var(--text)}
    .score-pills{display:flex;gap:8px;margin-top:20px;flex-wrap:wrap;justify-content:center;z-index:1}
    .score-pill{display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 18px;border-radius:14px;background:var(--bg);min-width:76px;border:1px solid var(--border)}
    .score-pill-num{font-size:24px;font-weight:800}
    .score-pill-lbl{font-size:10px;color:var(--sub);font-weight:600;text-transform:uppercase;letter-spacing:.5px}

    /* ── Section Headers ─────────────────────────── */
    .section-header{display:flex;align-items:center;gap:10px;padding:22px 16px 12px}
    .section-pip{width:4px;height:22px;border-radius:2px}
    .profiles-pip{background:var(--primary)}.recs-pip{background:#6366f1}
    .section-title{font-size:17px;font-weight:800;color:var(--text);letter-spacing:-.3px}

    /* ── Profile Cards ──────────────────────────── */
    .profiles-section{padding:0 12px}
    .profile-card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);margin-bottom:12px;overflow:hidden;position:relative;transition:box-shadow .3s ease}
    .profile-header{width:100%;background:none;border:none;padding:18px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}
    .profile-left{display:flex;align-items:center;gap:14px;flex:1;min-width:0}
    .profile-ring-wrap{position:relative;width:44px;height:44px;flex-shrink:0}
    .profile-ring{width:44px;height:44px;transform:rotate(-90deg)}
    .profile-ring-pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:var(--text)}
    .profile-info{min-width:0}
    .profile-name{font-size:15px;font-weight:700;color:var(--text);line-height:1.3}
    .profile-meta{display:flex;align-items:center;gap:6px;margin-top:4px}
    .meta-flag{font-size:12px;font-weight:600}
    .meta-ok{font-size:12px;color:var(--healthy);font-weight:600}
    .meta-sep{color:var(--muted);font-size:12px}
    .meta-total{font-size:12px;color:var(--sub)}
    .profile-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .sev-badge{font-size:11px;font-weight:700;padding:5px 12px;border-radius:20px;white-space:nowrap}
    .chevron{color:var(--sub);flex-shrink:0;transition:transform .35s cubic-bezier(.34,1.56,.64,1)}
    .profile-card.open .chevron{transform:rotate(180deg)}
    .profile-body{max-height:0;overflow:hidden;transition:max-height .45s cubic-bezier(.4,0,.2,1)}
    .profile-card.open .profile-body{max-height:5000px}
    .profile-body-inner{padding:0 18px 18px}

    /* ── Parameters ──────────────────────────────── */
    .flag-group{margin-bottom:10px}
    .norm-group{}
    .norm-header{display:flex;align-items:center;gap:8px;padding:14px 0 10px;border-top:1px solid var(--border);margin-top:10px}
    .norm-dot{width:7px;height:7px;border-radius:50%;background:var(--healthy)}
    .norm-title{font-size:13px;font-weight:700;color:var(--healthy)}
    .param-row{padding:14px 0;border-bottom:1px solid var(--border)}
    .param-row:last-child{border-bottom:none}
    .param-normal{opacity:.85}
    .param-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
    .param-name{font-size:14px;font-weight:600;color:var(--text);flex:1;line-height:1.4}
    .param-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .param-value{font-size:14px;font-weight:700;color:var(--text)}
    .param-unit{font-size:11px;color:var(--sub);font-weight:500}
    .status-badge{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap}

    /* ── Slider (abnormal params only) ─────────── */
    .sl-wrap{margin-top:12px}
    .sl-area{position:relative;padding-top:30px}
    .sl-bub-pos{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;z-index:2}
    .sl-bubble{display:flex;align-items:baseline;gap:3px;padding:5px 12px;border-radius:20px;color:#fff;font-weight:700;box-shadow:0 3px 10px rgba(0,0,0,.15)}
    .sl-bub-val{font-size:13px}
    .sl-bub-unit{font-size:10px;opacity:.85}
    .sl-bub-tip{width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5px solid transparent;margin-top:-1px}
    .sl-track{display:flex;height:7px;border-radius:99px;overflow:hidden}
    .sl-seg{height:100%}
    .sl-seg-low{background:#fecaca;border-radius:99px 0 0 99px}
    .sl-seg-norm{background:#bbf7d0}
    .sl-seg-high{background:#fecaca;border-radius:0 99px 99px 0}
    .sl-labels{display:flex;margin-top:8px}
    .sl-label{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px}
    .sl-lbl-text{font-size:11px;font-weight:700}
    .sl-lbl-low,.sl-lbl-high{color:#ef4444}
    .sl-lbl-norm{color:#16a34a}
    .sl-lbl-range{font-size:10px;color:var(--muted);font-weight:500}

    /* ── Recommendations ────────────────────────── */
    .recs-section{padding:0 12px}
    .recs-list{display:flex;flex-direction:column;gap:10px}
    .rec-card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px;display:flex;gap:14px;align-items:flex-start}
    .rec-num{width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .rec-text{font-size:13px;color:var(--text);line-height:1.7;flex:1}
    .recs-disclaimer{margin-top:10px;display:flex;align-items:flex-start;gap:10px;background:linear-gradient(135deg,#ede9fe,#e0e7ff);border-radius:14px;padding:12px 14px;font-size:12px;color:#6366f1;line-height:1.5}
    .disc-icon{font-size:16px;flex-shrink:0}

    /* ── Footer ──────────────────────────────────── */
    .footer{margin:16px 12px 0;background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:24px 20px;position:relative;overflow:hidden}
    .footer::before{content:'';position:absolute;top:0;left:20px;right:20px;height:3px;border-radius:2px;background:linear-gradient(90deg,${primary},${primary}40,${primary})}
    .footer-logo-row{display:flex;align-items:center;gap:12px;margin-top:8px;margin-bottom:16px}
    .footer-logo{width:36px;height:36px;object-fit:contain;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .footer-lab{font-size:16px;font-weight:800;color:var(--text);letter-spacing:-.3px}
    .footer-contacts{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
    .contact-btn{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--primary);font-weight:600;background:${primary}08;border:1px solid ${primary}18;border-radius:12px;padding:10px 14px;transition:background .2s}
    .footer-divider{height:1px;background:var(--border);margin-bottom:14px}
    .footer-disc{font-size:11px;color:var(--sub);line-height:1.7;background:var(--bg);border-radius:12px;padding:14px}
    .footer-powered{font-size:11px;color:var(--muted);text-align:center;margin-top:14px}
    .footer-powered strong{color:var(--primary);font-weight:700}

    /* ── Reduced motion ─────────────────────────── */
    @media(prefers-reduced-motion:reduce){
      *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
    }
  </style>
</head>
<body>

<!-- ══════════════════ SPLASH ══════════════════ -->
<div id="splash">
  <div class="splash-orb"></div><div class="splash-orb"></div><div class="splash-orb"></div>
  <div class="splash-center">
    <div class="splash-logo-ring">
      <img src="${esc(branding.logoUrl)}" class="splash-logo" alt="${esc(branding.labName)}" onerror="this.style.display='none'">
    </div>
    <div class="splash-lab">${esc(branding.labName)}</div>
    <div class="splash-sub">Preparing your health report…</div>
    <div class="splash-bar-wrap"><div class="splash-bar"></div></div>
  </div>
</div>

<!-- ══════════════════ APP ══════════════════ -->
<div id="app">

  <!-- ── Header ── -->
  <header class="header" id="mainHeader">
    <img src="${esc(branding.logoUrl)}" class="header-logo" alt="${esc(branding.labName)}" onerror="this.style.display='none'">
    <div class="header-name">${esc(branding.labName)}</div>
    <div class="header-badge">${esc(severityMsg)}</div>
  </header>

  <!-- ── Patient Card ── -->
  <div class="patient-card reveal">
    <div class="patient-top">
      <div class="patient-avatar" style="background:${avatarGrad}">${initials}</div>
      <div class="patient-info">
        <div class="patient-greeting">Hello,</div>
        <div class="patient-name">${esc(payload.patientName ?? 'Confidential Patient')}</div>
      </div>
    </div>
    <div class="patient-chips">
      <span class="patient-chip">${esc(payload.age)} years</span>
      <span class="patient-chip">${esc(payload.gender.charAt(0).toUpperCase() + payload.gender.slice(1))}</span>
      <span class="patient-chip">${esc(payload.reportDate)}</span>
      <span class="patient-chip patient-chip-id">${esc(payload.reportId)}</span>
    </div>
  </div>

  <!-- ── Description ── -->
  <div class="desc-card reveal">
    <div class="desc-emoji">${severityEmoji(overallSeverity)}</div>
    <div class="desc-body">
      <div class="desc-title">${esc(severityMsg)}</div>
      <div class="desc-text">${esc(descText)}</div>
    </div>
  </div>

  <!-- ── Score Hero ── -->
  <div class="hero reveal" id="sec-overview">
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
  <section class="profiles-section" id="sec-results">
    <div class="section-header reveal">
      <div class="section-pip profiles-pip"></div>
      <h2 class="section-title">Test Profiles</h2>
    </div>
    ${profilesHtml}
  </section>

  ${recsHtml}

  <!-- ── Footer ── -->
  <footer class="footer reveal">
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
(function(){
  var SPLASH_MS=2600;
  setTimeout(function(){
    var splash=document.getElementById('splash');
    var app=document.getElementById('app');
    if(splash)splash.classList.add('splash-exit');
    setTimeout(function(){if(splash)splash.style.display='none'},700);
    if(app)app.classList.add('app-visible');
    animateScore(${overallScore},1400);
    // Trigger gauge arc animation
    setTimeout(function(){var arc=document.getElementById('gaugeArc');if(arc)arc.classList.add('animated')},200);
    // Reveal sections with stagger
    var reveals=document.querySelectorAll('.reveal');
    reveals.forEach(function(el,i){
      setTimeout(function(){el.classList.add('visible')},150+(i*80));
    });
  },SPLASH_MS);

  // Score counter
  function animateScore(target,duration){
    var el=document.getElementById('scoreNum');
    if(!el)return;
    var start=null;
    function step(ts){
      if(!start)start=ts;
      var progress=Math.min((ts-start)/duration,1);
      var ease=1-Math.pow(1-progress,3);
      el.textContent=Math.round(ease*target);
      if(progress<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Scroll-linked header shadow
  var hdr=document.getElementById('mainHeader');
  if(hdr){window.addEventListener('scroll',function(){hdr.classList.toggle('scrolled',window.scrollY>10)},{passive:true})}

  // Profile accordion
  window.toggleProfile=function(idx){
    var card=document.getElementById('pcard-'+idx);
    var body=document.getElementById('pbody-'+idx);
    var btn=card&&card.querySelector('.profile-header');
    if(!card)return;
    var isOpen=card.classList.contains('open');
    card.classList.toggle('open',!isOpen);
    if(btn)btn.setAttribute('aria-expanded',String(!isOpen));
    if(body)body.setAttribute('aria-hidden',String(isOpen));
  };

  // Auto-open flagged profiles after splash
  document.querySelectorAll('.profile-card').forEach(function(card){
    if(card.querySelector('.meta-flag')){
      var idx=card.id.replace('pcard-','');
      setTimeout(function(){window.toggleProfile(Number(idx))},SPLASH_MS+300);
    }
  });
}());
</script>
</body>
</html>`;
}
