/**
 * InDepth — Back Page
 *
 * The final page of the report:
 *   - Thank-you / closing message
 *   - Lab contact details
 *   - QR code placeholder (SVG)
 *   - Legal disclaimer
 *   - "Powered by" badge (strategy-gated)
 *   - Full-bleed branded footer strip
 *
 * Receives: NormalizedReport (for tenant branding access via strategy)
 */

import type { ReportPage, PageRenderContext } from '../../core/page-registry/page.types';
import type { NormalizedReport } from '../../domain/models/report.model';
import type { TenantBrandingConfig } from '../../modules/tenants/tenant.types';

/* ------------------------------------------------------------------ */

/** Placeholder QR code SVG (replace with real QR generation if needed) */
function renderQrPlaceholder(primaryColor: string): string {
  return `
<svg class="back-qr" width="90" height="90" viewBox="0 0 90 90"
     xmlns="http://www.w3.org/2000/svg" aria-label="QR Code placeholder">
  <!-- Outer border -->
  <rect x="1" y="1" width="88" height="88" rx="6" fill="none"
        stroke="${primaryColor}" stroke-width="2"/>
  <!-- Top-left finder -->
  <rect x="8"  y="8"  width="24" height="24" rx="3" fill="${primaryColor}"/>
  <rect x="13" y="13" width="14" height="14" rx="1" fill="white"/>
  <rect x="17" y="17" width="6"  height="6"  rx="1" fill="${primaryColor}"/>
  <!-- Top-right finder -->
  <rect x="58" y="8"  width="24" height="24" rx="3" fill="${primaryColor}"/>
  <rect x="63" y="13" width="14" height="14" rx="1" fill="white"/>
  <rect x="67" y="17" width="6"  height="6"  rx="1" fill="${primaryColor}"/>
  <!-- Bottom-left finder -->
  <rect x="8"  y="58" width="24" height="24" rx="3" fill="${primaryColor}"/>
  <rect x="13" y="63" width="14" height="14" rx="1" fill="white"/>
  <rect x="17" y="67" width="6"  height="6"  rx="1" fill="${primaryColor}"/>
  <!-- Data dots (decorative) -->
  <rect x="40" y="8"  width="5" height="5" rx="1" fill="${primaryColor}"/>
  <rect x="48" y="8"  width="5" height="5" rx="1" fill="${primaryColor}"/>
  <rect x="40" y="16" width="5" height="5" rx="1" fill="${primaryColor}"/>
  <rect x="40" y="40" width="5" height="5" rx="1" fill="${primaryColor}"/>
  <rect x="48" y="48" width="5" height="5" rx="1" fill="${primaryColor}"/>
  <rect x="56" y="40" width="5" height="5" rx="1" fill="${primaryColor}"/>
  <rect x="56" y="56" width="5" height="5" rx="1" fill="${primaryColor}"/>
  <rect x="40" y="56" width="5" height="5" rx="1" fill="${primaryColor}"/>
</svg>`;
}

function renderContactBlock(branding: TenantBrandingConfig): string {
  const lines: string[] = [];
  if (branding.contactPhone) lines.push(`<div class="back-contact__line">☎ ${branding.contactPhone}</div>`);
  if (branding.contactEmail) lines.push(`<div class="back-contact__line">✉ ${branding.contactEmail}</div>`);
  if (lines.length === 0) return '';

  return `
<div class="back-contact">
  <div class="back-contact__heading">Contact Us</div>
  ${lines.join('\n')}
</div>`;
}

/* ------------------------------------------------------------------ */

export const inDepthBackPage: ReportPage = {
  name: 'indepth-back',

  generate(ctx: PageRenderContext): string {
    const report = ctx.data as NormalizedReport;
    const strategy = ctx.strategy;
    void report;

    // Use actual CSS variable so it responds dynamically to the tenant's primary UI color
    const primaryColor = 'var(--color-primary)';
    // Passing the CSS variable so the QR code adopts the dynamic tenant color natively in the SVG
    const qr = renderQrPlaceholder(primaryColor);

    const poweredBy = strategy.allowRecommendations
      ? `<div class="back-powered-by">Powered by <strong>Smart Health Engine</strong></div>`
      : '';

    return `
<style>
.back-wrapper {
  /* True full-bleed background */
  width: 210mm;
  height: 297mm;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Very thin top edge accent border */
.back-top-strip {
  height: 10px;
  width: 100%;
  background: ${primaryColor};
}

.back-hero {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0 35mm;
  text-align: center;
}

.back-hero__headline {
  font-size: 38px;
  font-weight: 300;
  color: #111827;
  margin: 0 0 12px 0;
  letter-spacing: 4px;
  text-transform: uppercase;
}

.back-hero__sub {
  font-size: 20px;
  color: ${primaryColor};
  margin: 0 0 40px 0;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.back-divider {
  width: 80px;
  height: 4px;
  background: ${primaryColor};
  margin: 0 auto 40px auto;
  border-radius: 2px;
}

.back-hero__message {
  font-size: 16px;
  color: #4b5563;
  line-height: 1.8;
  max-width: 500px;
}

/* Subtle grey section that bleeds to left and right edges */
.back-footer-area {
  background: #f8fafc;
  padding: 25mm 25mm 15mm 25mm;
  display: flex;
  flex-direction: column;
  border-top: 1px solid #e2e8f0;
}

.back-footer-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 30px;
  align-items: end;
}

.back-disclaimer-box {
  background: #ffffff;
  border-left: 5px solid ${primaryColor};
  padding: 22px 25px;
  font-size: 12px;
  color: #4b5563;
  line-height: 1.6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  border-radius: 0 4px 4px 0;
  margin-bottom: 25px;
}

.back-disclaimer-box strong {
  color: #111827;
  font-weight: 700;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
}

.back-qr-card {
  background: #ffffff;
  padding: 16px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.back-qr-card svg {
  margin-bottom: 12px;
}

.back-qr-label {
  font-size: 10px;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.back-contact-info h3 {
  font-size: 14px;
  color: #111827;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 700;
}

.back-contact-info p {
  font-size: 13px;
  color: #4b5563;
  margin: 0;
  line-height: 1.6;
  max-width: 320px;
}

.back-footer-bottom {
  display: flex;
  justify-content: center;
  padding-top: 15px;
  margin-top: 20px;
  border-top: 1px solid #e2e8f0;
}

.back-powered-by {
  font-size: 11px;
  color: #94a3b8;
}

.back-powered-by strong {
  color: #4b5563;
  font-weight: 600;
}

.back-bottom-strip {
  height: 12px;
  width: 100%;
  background: ${primaryColor};
}
</style>
<div class="back-wrapper">
  <div class="back-top-strip"></div>
  
  <div class="back-hero">
    <div class="back-hero__headline">End of Report</div>
    <div class="back-hero__sub">Thank you for choosing us</div>
    <div class="back-divider"></div>
    <div class="back-hero__message">
      Your health is our priority. If you have any questions regarding these findings, 
      please consult your physician or our support team.
    </div>
  </div>

  <div class="back-footer-area">
    <div class="back-disclaimer-box">
      <strong>Disclaimer:</strong> This report is intended as a summary of laboratory findings 
      and is generated by Smart Health Engine. Results must be interpreted by a qualified 
      healthcare provider in the context of the patient's clinical history. This report does 
      not constitute medical advice, diagnosis, or treatment recommendations.
    </div>
    
    <div class="back-footer-grid">
      <div class="back-contact-info">
        <h3>Contact Info</h3>
        <p>For queries about this report, please reach out directly to the issuing laboratory.</p>
      </div>
      
      <div class="back-qr-card">
        ${qr}
        <div class="back-qr-label">Scan to verify</div>
      </div>
    </div>
    
    <div class="back-footer-bottom">
      ${poweredBy}
    </div>
  </div>
  
  <div class="back-bottom-strip"></div>
</div>`;
  },
};
