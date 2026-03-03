/**
 * InDepth — Cover Page
 *
 * Full-bleed branded first page of the in-depth report using the standalone
 * HTML template. It uses `@page :first { margin: 0; }` to hide the Puppeteer
 * header and footer exclusively on the first page.
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';
import type { TenantBrandingConfig } from '../../modules/tenants/tenant.types';

/* ------------------------------------------------------------------ */

function hexToRgb(hex: string): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return '0 0 0';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export const inDepthCoverPage: ReportPage = {
  name: 'indepth-cover',

  generate(ctx: PageRenderContext): string {
    const report = ctx.data as NormalizedReport;
    const branding = ctx.branding;

    // Use distinct cover color if configured, otherwise primary
    const brandColor = branding.coverColor ?? branding.primaryColor;
    const brandRgb = hexToRgb(brandColor);

    const today = new Date().toLocaleDateString('en-US', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    // Cover page — no header/footer because this page skips renderLayout()
    return `
<style>
/* 
  Cover Page CSS Variables & Reset
*/
.cover-wrapper {
  --brand:     ${brandColor};
  --brand-rgb: ${brandRgb};
  
  /* Full-bleed cover — no renderLayout wrapper means no header/footer */
  position: relative;
  display: block;
  width: 210mm;
  height: 297mm;
  background: white;
  z-index: 1000;
  overflow: hidden;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.cover-wrapper *, .cover-wrapper *::before, .cover-wrapper *::after {
  box-sizing: border-box;
}

/* ── Background Layers ─────────────────────────────────────────── */
.cv-bg-tint {
  position: absolute; inset: 0; z-index: 0;
  background-color: rgb(var(--brand-rgb) / 0.045);
}
.cv-bg-dots {
  position: absolute; inset: 0; z-index: 1;
  background-image: radial-gradient(circle, rgb(var(--brand-rgb) / 0.14) 1px, transparent 1px);
  background-size: 9mm 9mm;
}
.cv-bg-stripes {
  position: absolute; inset: 0; z-index: 2;
  background-image: repeating-linear-gradient(
    -45deg, transparent, transparent 18px,
    rgb(var(--brand-rgb) / 0.018) 18px,
    rgb(var(--brand-rgb) / 0.018) 19px
  );
}

/* ── Top-right Arcs ────────────────────────────────────────────── */
.cv-deco-arcs {
  position: absolute; top: 0; right: 0;
  width: 130mm; height: 130mm; z-index: 3; pointer-events: none;
}
.cv-deco-arcs svg { width: 100%; height: 100%; }
.cv-arc-1 { stroke: rgb(var(--brand-rgb) / 0.055); stroke-width: 42; fill: none; }
.cv-arc-2 { stroke: rgb(var(--brand-rgb) / 0.07);  stroke-width: 32; fill: none; }
.cv-arc-3 { stroke: rgb(var(--brand-rgb) / 0.09);  stroke-width: 24; fill: none; }
.cv-arc-4 { stroke: rgb(var(--brand-rgb) / 0.12);  stroke-width: 16; fill: none; }
.cv-arc-5 { stroke: rgb(var(--brand-rgb) / 0.16);  stroke-width: 10; fill: none; }

/* ── Bottom-left Circles ───────────────────────────────────────── */
.cv-deco-circles {
  position: absolute; bottom: 0; left: 0;
  width: 90mm; height: 90mm; z-index: 3;
  pointer-events: none; overflow: hidden;
}
.cv-deco-circles svg { width: 100%; height: 100%; }
.cv-circ-1 { stroke: rgb(var(--brand-rgb) / 0.06); stroke-width: 30; fill: none; }
.cv-circ-2 { stroke: rgb(var(--brand-rgb) / 0.08); stroke-width: 20; fill: none; }
.cv-circ-3 { stroke: rgb(var(--brand-rgb) / 0.10); stroke-width: 14; fill: none; }

/* ── Bottom Wave Sweep ─────────────────────────────────────────── */
.cv-deco-waves {
  position: absolute; bottom: 0; left: 0; right: 0;
  height: 115mm; z-index: 4; pointer-events: none;
}
.cv-deco-waves svg { width: 100%; height: 100%; }
.cv-wave-1 { fill: rgb(var(--brand-rgb) / 0.06); }
.cv-wave-2 { fill: rgb(var(--brand-rgb) / 0.10); }
.cv-wave-3 { fill: rgb(var(--brand-rgb) / 0.07); }

/* ── Side Bars ─────────────────────────────────────────────────── */
.cv-left-bar {
  position: absolute; top: 0; left: 0; bottom: 0; width: 7mm; z-index: 10;
  background: linear-gradient(to bottom, var(--brand), rgb(var(--brand-rgb) / 0.65));
}
.cv-right-line {
  position: absolute; top: 0; right: 0; bottom: 0; width: 1.5mm; z-index: 10;
  background: linear-gradient(
    to bottom, transparent 10%,
    rgb(var(--brand-rgb) / 0.18) 40%,
    rgb(var(--brand-rgb) / 0.25) 70%,
    transparent 95%
  );
}

/* ── Content Wrapper ───────────────────────────────────────────── */
.cv-content {
  position: absolute; inset: 0; z-index: 20;
  display: flex; flex-direction: column;
  padding: 14mm 16mm 0 18mm;
}

/* ── Header ────────────────────────────────────────────────────── */
.cv-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.cv-header-left { display: flex; align-items: center; gap: 12px; }
.cv-lab-info { display: flex; flex-direction: column; gap: 2px; }
.cv-lab-name {
  font-size: 15pt; font-weight: 800; color: #0f172a;
  line-height: 1.2; letter-spacing: -0.02em;
}
.cv-lab-tagline {
  font-size: 7.5pt; color: #64748b;
  letter-spacing: 0.18em; font-weight: 600; text-transform: uppercase;
}
.cv-lab-underline {
  height: 2.5px; width: 32mm; border-radius: 2px; margin-top: 3px;
  background: linear-gradient(to right, var(--brand), rgb(var(--brand-rgb) / 0.3));
}

.cv-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
.cv-iso-badge {
  border: 1.5px solid rgb(var(--brand-rgb) / 0.3);
  border-radius: 8px; padding: 5px 10px; text-align: center;
  background: rgb(var(--brand-rgb) / 0.05);
}
.cv-iso-num { font-size: 7pt; color: var(--brand); font-weight: 800; letter-spacing: 0.12em; }
.cv-iso-sub { font-size: 6pt; color: #94a3b8; font-weight: 600; letter-spacing: 0.08em; }
.cv-established { font-size: 6.5pt; color: #94a3b8; font-weight: 500; letter-spacing: 0.06em; }

/* ── Separator Line ────────────────────────────────────────────── */
.cv-separator {
  margin-top: 8mm; height: 1.5px; border-radius: 2px;
  background: linear-gradient(to right, var(--brand), rgb(var(--brand-rgb) / 0.4), rgb(var(--brand-rgb) / 0.1), transparent);
}

/* ── Title Block ───────────────────────────────────────────────── */
.cv-title-block {
  margin-top: 10mm;
  display: flex; flex-direction: column;
  align-items: center; text-align: center;
}
.cv-ornament {
  display: flex; align-items: center; gap: 10px; margin-bottom: 5mm;
}
.cv-ornament-line-l { width: 28px; height: 1.5px; background: linear-gradient(to left,  var(--brand), transparent); }
.cv-ornament-line-r { width: 28px; height: 1.5px; background: linear-gradient(to right, var(--brand), transparent); }
.cv-ornament-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgb(var(--brand-rgb) / 0.3);
  border: 1.5px solid var(--brand);
}
.cv-ornament-text { font-size: 7.5pt; color: var(--brand); letter-spacing: 0.28em; font-weight: 700; }

.cv-title-main {
  font-size: 40pt; font-weight: 900; color: #0f172a;
  letter-spacing: -0.03em; line-height: 1; text-transform: uppercase;
}
.cv-title-accent {
  font-size: 40pt; font-weight: 900; color: var(--brand);
  letter-spacing: -0.03em; line-height: 1.05; text-transform: uppercase;
}
.cv-title-rule {
  margin-top: 5mm; width: 50mm; height: 3px; border-radius: 3px;
  background: linear-gradient(to right, transparent, var(--brand), transparent);
}
.cv-title-sub1 {
  margin-top: 4mm; font-size: 10.5pt; color: #475569;
  letter-spacing: 0.06em; line-height: 1.5;
}
.cv-title-sub2 { margin-top: 2mm; font-size: 8.5pt; color: #94a3b8; letter-spacing: 0.04em; }
.cv-report-badge {
  margin-top: 5mm; display: inline-block;
  background: rgb(var(--brand-rgb) / 0.08);
  border: 1px solid rgb(var(--brand-rgb) / 0.22);
  border-radius: 30px; padding: 5px 16px;
}
.cv-report-badge span {
  font-size: 8pt; color: var(--brand); font-weight: 700; letter-spacing: 0.1em;
}

/* ── ECG Wave ──────────────────────────────────────────────────── */
.cv-ecg-wrap { margin-top: 8mm; opacity: 0.55; }
.cv-ecg-wrap svg { width: 100%; height: 38px; }
.cv-ecg-line {
  stroke: var(--brand); stroke-width: 2.2; fill: none;
  stroke-linecap: round; stroke-linejoin: round;
}

/* ── Spacer ────────────────────────────────────────────────────── */
.cv-spacer { flex: 1; }

/* ── Patient Section ───────────────────────────────────────────── */
.cv-patient-section { margin-bottom: 14mm; }
.cv-patient-label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 3mm; }
.cv-patient-label-pip {
  width: 3.5px; height: 14px; border-radius: 2px; background: var(--brand);
}
.cv-patient-label-text {
  font-size: 7pt; color: var(--brand); font-weight: 800;
  letter-spacing: 0.25em; text-transform: uppercase;
}
.cv-patient-label-line {
  flex: 1; height: 1px;
  background: linear-gradient(to right, rgb(var(--brand-rgb) / 0.3), transparent);
}

/* ── Patient Card ──────────────────────────────────────────────── */
.cv-patient-card {
  background: rgba(255,255,255,0.92);
  border-radius: 14px;
  border: 1.5px solid rgb(var(--brand-rgb) / 0.18);
  padding: 14px 18px 14px 22px;
  box-shadow: 0 8px 32px rgb(var(--brand-rgb) / 0.1), 0 2px 8px rgba(0,0,0,0.06),
              inset 0 1px 0 rgba(255,255,255,0.8);
  position: relative; overflow: hidden;
}
.cv-card-strip {
  position: absolute; top: 0; left: 0; width: 5px; height: 100%;
  background: linear-gradient(to bottom, var(--brand), rgb(var(--brand-rgb) / 0.6));
  border-radius: 14px 0 0 14px;
}
.cv-card-glow {
  position: absolute; top: 0; right: 0; bottom: 0; width: 50%;
  background: linear-gradient(to left, rgb(var(--brand-rgb) / 0.03), transparent);
  border-radius: 0 14px 14px 0; pointer-events: none;
}
.cv-card-top {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 10px; padding-left: 4px;
}
.cv-pname-label { font-size: 8pt; color: #94a3b8; font-weight: 600; letter-spacing: 0.1em; margin-bottom: 2px; }
.cv-pname       { font-size: 18pt; font-weight: 800; color: #0f172a; line-height: 1.1; letter-spacing: -0.02em; }
.cv-pid         { font-size: 7.5pt; color: #64748b; margin-top: 3px; letter-spacing: 0.06em; }
.cv-pid span    { color: var(--brand); font-weight: 700; }
.cv-qr-col      { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.cv-qr-box {
  padding: 6px; border-radius: 8px;
  border: 1px solid rgb(var(--brand-rgb) / 0.15); background: white;
}
.cv-qr-label    { font-size: 5.5pt; color: #94a3b8; letter-spacing: 0.12em; font-weight: 600; }

.cv-card-divider {
  height: 1px; margin-bottom: 10px; margin-left: 4px;
  background: linear-gradient(to right, rgb(var(--brand-rgb) / 0.25), rgb(var(--brand-rgb) / 0.1), transparent);
}

/* ── Details Grid ──────────────────────────────────────────────── */
.cv-details-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 6px 8px; padding-left: 4px;
}
.cv-detail-col { border-right: 1px solid rgb(var(--brand-rgb) / 0.1); padding-right: 8px; }
.cv-detail-col:last-child { border-right: none; }
.cv-d-label { font-size: 6pt; color: #94a3b8; font-weight: 700; letter-spacing: 0.14em; margin-bottom: 2px; white-space: nowrap; }
.cv-d-value { font-size: 9pt; color: #1e293b; font-weight: 700; white-space: nowrap; }

/* ── Doctor Footer Row ─────────────────────────────────────────── */
.cv-doctor-row {
  margin-top: 10px; margin-left: 4px; padding-top: 8px;
  border-top: 1px dashed rgb(var(--brand-rgb) / 0.14);
  display: flex; justify-content: space-between; align-items: center;
}
.cv-dr-ref    { font-size: 6.5pt; color: #94a3b8; font-weight: 600; letter-spacing: 0.1em; }
.cv-dr-name   { font-size: 8.5pt; color: #334155; font-weight: 700; }
.cv-verified  { display: flex; align-items: center; gap: 4px; font-size: 6.5pt; color: #94a3b8; font-weight: 600; letter-spacing: 0.06em; }
.cv-v-dot     { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }

/* ── Bottom Accent Strip ───────────────────────────────────────── */
.cv-bottom-strip {
  position: absolute; bottom: 0; left: 0; right: 0; height: 5.5mm; z-index: 30;
  background: linear-gradient(to right, var(--brand) 0%, rgb(var(--brand-rgb) / 0.75) 60%, var(--brand) 100%);
  display: flex; align-items: center; justify-content: center;
}
.cv-strip-text {
  font-size: 5.5pt; color: rgba(255,255,255,0.7);
  letter-spacing: 0.25em; font-weight: 600; text-transform: uppercase;
}
</style>

<div class="cover-wrapper">
  <!-- ── Layer 0: Background tint ── -->
  <div class="cv-bg-tint"></div>
  <!-- ── Layer 1: Dot grid ── -->
  <div class="cv-bg-dots"></div>
  <!-- ── Layer 2: Diagonal stripes ── -->
  <div class="cv-bg-stripes"></div>

  <!-- ── Layer 3: Top-right radiating arcs ── -->
  <div class="cv-deco-arcs">
    <svg viewBox="0 0 370 370" fill="none">
      <circle cx="370" cy="0" r="280" class="cv-arc-1"/>
      <circle cx="370" cy="0" r="210" class="cv-arc-2"/>
      <circle cx="370" cy="0" r="145" class="cv-arc-3"/>
      <circle cx="370" cy="0" r="85"  class="cv-arc-4"/>
      <circle cx="370" cy="0" r="42"  class="cv-arc-5"/>
    </svg>
  </div>

  <!-- ── Layer 4: Bottom-left circles ── -->
  <div class="cv-deco-circles">
    <svg viewBox="0 0 256 256" fill="none">
      <circle cx="0" cy="256" r="180" class="cv-circ-1"/>
      <circle cx="0" cy="256" r="120" class="cv-circ-2"/>
      <circle cx="0" cy="256" r="70"  class="cv-circ-3"/>
    </svg>
  </div>

  <!-- ── Layer 5: Multi-layer bottom wave ── -->
  <div class="cv-deco-waves">
    <svg viewBox="0 0 210 115" preserveAspectRatio="none">
      <path d="M -5 38 C 18 22, 48 46, 78 32 Q 108 18, 140 34 Q 172 50, 215 22 L 215 120 L -5 120 Z" class="cv-wave-1"/>
      <path d="M -5 58 C 22 44, 52 65, 85 54 Q 118 43, 152 58 Q 180 68, 215 50 L 215 120 L -5 120 Z" class="cv-wave-2"/>
      <path d="M -5 76 C 30 64, 62 80, 98 72 Q 130 64, 162 76 Q 188 84, 215 72 L 215 120 L -5 120 Z" class="cv-wave-3"/>
    </svg>
  </div>

  <!-- ── Layer 6: Left bar ── -->
  <div class="cv-left-bar"></div>
  <!-- ── Layer 7: Right accent line ── -->
  <div class="cv-right-line"></div>

  <!-- ══════════════════ CONTENT ══════════════════ -->
  <div class="cv-content">

    <!-- ═══ HEADER ═══ -->
    <div class="cv-header">
      <div class="cv-header-left">
        <img src="${branding.logoUrl}" height="62" style="object-fit:contain;border-radius:6px" />
        <div class="cv-lab-info">
          <div class="cv-lab-name">${branding.labName}</div>
          <div class="cv-lab-tagline">Diagnostics &amp; Health Sciences</div>
          <div class="cv-lab-underline"></div>
        </div>
      </div>

      <div class="cv-header-right">
        <div class="cv-iso-badge">
          <div class="cv-iso-num">ISO 15189</div>
          <div class="cv-iso-sub">ACCREDITED</div>
        </div>
        <div class="cv-established">ESTABLISHED 2012</div>
      </div>
    </div>

    <!-- ═══ TITLE BLOCK ═══ -->
    <div class="cv-title-block">
      <div class="cv-ornament">
        <div class="cv-ornament-line-l"></div>
        <div class="cv-ornament-dot"></div>
        <div class="cv-ornament-text">CONFIDENTIAL MEDICAL DOCUMENT</div>
        <div class="cv-ornament-dot"></div>
        <div class="cv-ornament-line-r"></div>
      </div>
      <div class="cv-title-main">SMART HEALTH</div>
      <div class="cv-title-accent">REPORT</div>
      <div class="cv-title-rule"></div>
      <div class="cv-title-sub1">Personalized Health Intelligence Summary</div>
      <div class="cv-title-sub2">Comprehensive Analysis &amp; Clinical Insights</div>
      <div class="cv-report-badge">
        <span>Complete Blood Count (CBC)</span>
      </div>
    </div>

    <!-- ECG Wave -->
    <div class="cv-ecg-wrap">
      <svg viewBox="0 0 520 60" preserveAspectRatio="xMidYMid meet">
        <path d="M0 30 L70 30 L80 30 L92 8 L100 52 L108 4 L116 56 L124 22 L132 30 L155 30 L200 30 L230 30 L242 30 L254 10 L262 50 L270 6 L278 54 L286 24 L294 30 L315 30 L360 30 L375 30 L385 12 L393 50 L401 7 L409 53 L417 25 L425 30 L450 30 L520 30" class="cv-ecg-line"/>
      </svg>
    </div>

    <div class="cv-spacer"></div>

    <!-- ═══ PATIENT SECTION ═══ -->
    <div class="cv-patient-section">
      <div class="cv-patient-label-row">
        <div class="cv-patient-label-pip"></div>
        <div class="cv-patient-label-text">Patient Information</div>
        <div class="cv-patient-label-line"></div>
      </div>

      <div class="cv-patient-card">
        <div class="cv-card-strip"></div>
        <div class="cv-card-glow"></div>

        <div class="cv-card-top">
          <div>
            <div class="cv-pname-label">FULL NAME</div>
            <div class="cv-pname">${report.patientName || 'Confidential Patient'}</div>
            <div class="cv-pid">Patient ID: <span>${report.patientId}</span></div>
          </div>
          <div class="cv-qr-col">
            <div class="cv-qr-box">
               <svg width="58" height="58" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="3" stroke="#0f172a" stroke-width="2.5" fill="none"/>
                  <rect x="7" y="7" width="10" height="10" rx="1.5" fill="#0f172a"/>
                  <rect x="42" y="2" width="20" height="20" rx="3" stroke="#0f172a" stroke-width="2.5" fill="none"/>
                  <rect x="47" y="7" width="10" height="10" rx="1.5" fill="#0f172a"/>
                  <rect x="2" y="42" width="20" height="20" rx="3" stroke="#0f172a" stroke-width="2.5" fill="none"/>
                  <rect x="7" y="47" width="10" height="10" rx="1.5" fill="#0f172a"/>
                  <rect x="26" y="2" width="4" height="4" fill="#0f172a"/>
                  <rect x="32" y="2" width="4" height="4" fill="#0f172a"/>
                  <rect x="38" y="2" width="4" height="4" fill="#0f172a"/>
                  <rect x="26" y="8" width="4" height="4" fill="#0f172a"/>
                  <rect x="34" y="8" width="4" height="4" fill="#0f172a"/>
                  <rect x="26" y="14" width="4" height="4" fill="#0f172a"/>
                  <rect x="32" y="14" width="4" height="4" fill="#0f172a"/>
                  <rect x="38" y="14" width="4" height="4" fill="#0f172a"/>
                  <rect x="2" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="10" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="18" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="2" y="32" width="4" height="4" fill="#0f172a"/>
                  <rect x="18" y="32" width="4" height="4" fill="#0f172a"/>
                  <rect x="2" y="38" width="4" height="4" fill="#0f172a"/>
                  <rect x="10" y="38" width="4" height="4" fill="#0f172a"/>
                  <rect x="26" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="34" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="42" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="54" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="62" y="26" width="4" height="4" fill="#0f172a"/>
                  <rect x="26" y="34" width="4" height="4" fill="#0f172a"/>
                  <rect x="42" y="34" width="4" height="4" fill="#0f172a"/>
                  <rect x="50" y="34" width="4" height="4" fill="#0f172a"/>
                  <rect x="62" y="34" width="4" height="4" fill="#0f172a"/>
                  <rect x="30" y="38" width="4" height="4" fill="#0f172a"/>
                  <rect x="38" y="38" width="4" height="4" fill="#0f172a"/>
                  <rect x="46" y="38" width="4" height="4" fill="#0f172a"/>
                  <rect x="26" y="42" width="4" height="4" fill="#0f172a"/>
                  <rect x="34" y="42" width="4" height="4" fill="#0f172a"/>
                  <rect x="50" y="42" width="4" height="4" fill="#0f172a"/>
                  <rect x="58" y="42" width="4" height="4" fill="#0f172a"/>
                  <rect x="26" y="50" width="4" height="4" fill="#0f172a"/>
                  <rect x="42" y="50" width="4" height="4" fill="#0f172a"/>
                  <rect x="54" y="50" width="4" height="4" fill="#0f172a"/>
                  <rect x="62" y="50" width="4" height="4" fill="#0f172a"/>
                  <rect x="30" y="54" width="4" height="4" fill="#0f172a"/>
                  <rect x="38" y="54" width="4" height="4" fill="#0f172a"/>
                  <rect x="46" y="54" width="4" height="4" fill="#0f172a"/>
                  <rect x="58" y="58" width="4" height="4" fill="#0f172a"/>
                  <rect x="62" y="58" width="4" height="4" fill="#0f172a"/>
               </svg>
            </div>
            <div class="cv-qr-label">SCAN TO VERIFY</div>
          </div>
        </div>

        <div class="cv-card-divider"></div>

        <div class="cv-details-grid">
          <div class="cv-detail-col">
            <div class="cv-d-label">AGE</div>
            <div class="cv-d-value">${report.age} Yrs</div>
          </div>
          <div class="cv-detail-col">
            <div class="cv-d-label">GENDER</div>
            <div class="cv-d-value">${report.gender}</div>
          </div>
          <div class="cv-detail-col">
            <div class="cv-d-label">REPORT DATE</div>
            <div class="cv-d-value">${today}</div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /content -->

  <!-- Bottom Accent Strip -->
  <div class="cv-bottom-strip">
    <span class="cv-strip-text">${branding.labName} &middot; Smart Health Report &middot; ${today} &middot; Confidential</span>
  </div>

</div><!-- /wrapper -->
`;
  },
};
