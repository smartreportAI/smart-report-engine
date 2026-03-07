/**
 * Shared Components — Speedometer / Gauge
 *
 * An SVG semi-circular gauge used to visualise a score (0–100)
 * or a single parameter's position within its reference range.
 *
 * Zones (left → right):
 *   0–40   → red (attention)
 *   40–70  → amber (monitor)
 *   70–100 → green (healthy)
 *
 * The needle rotates -90° (far left) to +90° (far right).
 */

import type { ParameterStatus } from '../../../domain/models/parameter.model';

/* ----------------------------------------------------------------
   Colour helpers
   ---------------------------------------------------------------- */

function gaugeColor(value: number): string {
    if (value >= 70) return 'var(--color-healthy)';
    if (value >= 40) return 'var(--color-monitor)';
    return 'var(--color-attention)';
}

function statusToGaugeValue(status: ParameterStatus, value: number, min: number, max: number): number {
    if (status === 'normal') return 85;
    const span = max - min || 1;
    const pct = ((value - min) / span) * 100;
    // Out-of-range values map to low/high zones
    if (status === 'critical') return pct < 50 ? 5 : 95;
    if (status === 'low') return Math.max(5, Math.min(39, pct));
    if (status === 'high') return Math.max(61, Math.min(95, pct));
    return 50;
}

/* ----------------------------------------------------------------
   Score Speedometer — for overall score (0‒100)
   ---------------------------------------------------------------- */

export interface ScoreGaugeOptions {
    /** Value 0–100 */
    score: number;
    /** Size in px (default 160) */
    size?: number;
    /** Label shown below the needle value */
    label?: string;
}

function gaugeLabel(value: number): string {
    if (value >= 70) return 'HEALTHY';
    if (value >= 40) return 'MONITOR';
    return 'ATTENTION';
}

/**
 * Semi-circular speedometer for an overall score.
 * A modern half-donut gauge with a dynamic, rounded progress bar and a sleek needle.
 */
export function renderScoreGauge(opts: ScoreGaugeOptions): string {
    const { score, size = 160, label = 'Overall Score' } = opts;
    const clamped = Math.max(0, Math.min(100, score));
    const activeColor = gaugeColor(clamped);
    const activeLabel = gaugeLabel(clamped);

    // Geometry
    const strokeWidth = size * 0.12;
    const r = (size - strokeWidth) / 2;
    const cx = size / 2;
    const cy = size * 0.7; // Pivot is slightly lower
    const needleAngle = -90 + (clamped / 100) * 180;

    /** Helper to generate ARC path */
    function getArcPath(startDeg: number, endDeg: number): string {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const x1 = cx + r * Math.cos(toRad(startDeg));
        const y1 = cy + r * Math.sin(toRad(startDeg));
        const x2 = cx + r * Math.cos(toRad(endDeg));
        const y2 = cy + r * Math.sin(toRad(endDeg));
        return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
    }

    // 3 distinct phases (Red, Amber, Green)
    const d1 = getArcPath(-175, -125);
    const d2 = getArcPath(-115, -65);
    const d3 = getArcPath(-55, -5);

    // Pure SVG Face (to avoid browser-specific emoji rendering issues)
    const faceScale = (size * 0.07) / 12; // Base features were designed for r=12
    let faceSvg = '';

    if (clamped >= 70) {
        // Happy Face
        faceSvg = `
          <circle cx="-3.5" cy="-2.5" r="1.5" fill="rgba(0,0,0,0.6)"/>
          <circle cx="3.5" cy="-2.5" r="1.5" fill="rgba(0,0,0,0.6)"/>
          <path d="M -4 2 Q 0 5 4 2" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="1.5" stroke-linecap="round"/>
        `;
    } else if (clamped >= 40) {
        // Neutral Face
        faceSvg = `
          <circle cx="-3.5" cy="-2" r="1.5" fill="rgba(0,0,0,0.6)"/>
          <circle cx="3.5" cy="-2" r="1.5" fill="rgba(0,0,0,0.6)"/>
          <line x1="-3.5" y1="3" x2="3.5" y2="3" stroke="rgba(0,0,0,0.6)" stroke-width="1.5" stroke-linecap="round"/>
        `;
    } else {
        // Worried Face
        faceSvg = `
          <circle cx="-3.5" cy="-1.5" r="1.5" fill="rgba(0,0,0,0.6)"/>
          <circle cx="3.5" cy="-1.5" r="1.5" fill="rgba(0,0,0,0.6)"/>
          <path d="M -4 4 Q 0 1 4 4" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="-5.5" y1="-4.5" x2="-2" y2="-3" stroke="rgba(0,0,0,0.6)" stroke-width="1" stroke-linecap="round"/>
          <line x1="5.5" y1="-4.5" x2="2" y2="-3" stroke="rgba(0,0,0,0.6)" stroke-width="1" stroke-linecap="round"/>
        `;
    }

    return `
<div class="speedometer" style="width:${size}px; margin:0 auto; text-align:center; position:relative;">
  <svg width="100%" height="auto" viewBox="0 -20 ${size} ${size * 0.85 + 20}" style="overflow:visible; display:block;">
    <defs>
      <filter id="shadowTip">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
      </filter>
    </defs>

    <!-- Top Label Pill -->
    <g transform="translate(${cx}, ${cy - r - strokeWidth - 5})">
        <rect x="-44" y="-12" width="88" height="24" rx="12" fill="${activeColor}" />
        <text x="0" y="4" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle" letter-spacing="0.5">${activeLabel}</text>
    </g>

    <!-- Base Solid Zones -->
    <path d="${d1}" fill="none" stroke="#f87171" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <path d="${d2}" fill="none" stroke="#fbbf24" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    <path d="${d3}" fill="none" stroke="#4ade80" stroke-width="${strokeWidth}" stroke-linecap="round"/>

    <!-- Scale labels pushed further out so needle doesn't overlap them at 0 or 100 -->
    <text x="${cx - r - 8}" y="${cy + 25}" fill="#9ca3af" font-size="14" font-weight="500" text-anchor="middle">0</text>
    <text x="${cx + r + 8}" y="${cy + 25}" fill="#9ca3af" font-size="14" font-weight="500" text-anchor="middle">100</text>

    <!-- The Needle Group -->
    <g transform="translate(${cx}, ${cy}) rotate(${needleAngle})">
        <!-- Needle Arm -->
        <line x1="0" y1="0" x2="0" y2="-${r - strokeWidth * 0.3}" stroke="#334155" stroke-width="${size * 0.025}" stroke-linecap="round"/>
        <!-- Pivot base (hollow donut) -->
        <circle cx="0" cy="0" r="${size * 0.04}" fill="#ffffff" stroke="#334155" stroke-width="${size * 0.025}"/>
        <!-- Tip circle sitting on the arc -->
        <circle cx="0" cy="-${r}" r="${size * 0.07}" fill="${activeColor}" stroke="#ffffff" stroke-width="${size * 0.012}" filter="url(#shadowTip)"/>
        <!-- SVG Face inside the tip circle! Note: counter-rotate it so it stays upright! -->
        <g transform="translate(0, -${r}) rotate(${-needleAngle}) scale(${faceScale})">
             ${faceSvg}
        </g>
    </g>
  </svg>
  
  <div style="margin-top: -2px;">
      <div class="speedometer__value" style="color:#374151; font-size:${size * 0.22}px; font-weight:800; line-height: 1;">${score}</div>
      ${label ? `<div class="speedometer__label" style="font-size:12px; margin-top:2px; color:#6b7280; font-weight:500;">${label}</div>` : ''}
  </div>
</div>`;
}

/* ----------------------------------------------------------------
   Parameter Gauge — for a single test parameter
   ---------------------------------------------------------------- */

export interface ParamGaugeOptions {
    value: number;
    min: number;
    max: number;
    status: ParameterStatus;
    unit?: string;
    size?: number;
}

/**
 * Mini gauge for a single parameter's position in its reference range.
 */
export function renderParamGauge(opts: ParamGaugeOptions): string {
    const { value, min, max, status, unit = '', size = 100 } = opts;
    const gaugeVal = statusToGaugeValue(status, value, min, max);
    return renderScoreGauge({
        score: gaugeVal,
        size,
        label: unit ? `${value} ${unit}` : String(value),
    });
}
