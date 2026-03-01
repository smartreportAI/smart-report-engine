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

/**
 * Semi-circular speedometer for an overall score.
 * needle angle: score=0 → -90°, score=100 → +90°
 */
export function renderScoreGauge(opts: ScoreGaugeOptions): string {
    const { score, size = 160, label = 'Overall Score' } = opts;
    const clamped = Math.max(0, Math.min(100, score));
    const color = gaugeColor(clamped);

    // Needle angle: map 0–100 to -90°..+90°
    const needleAngle = -90 + (clamped / 100) * 180;

    const cx = size / 2;
    const cy = size * 0.65;   // gauge arc sits in upper 65%
    const r = size * 0.42;

    // Arc path: semi-circle from left (-180°) to right (0°) in SVG coords
    const arcStartX = cx - r;
    const arcStartY = cy;
    const arcEndX = cx + r;
    const arcEndY = cy;

    // Zone arcs (red, amber, green) — each covers 60° of the 180° span
    function arcSegment(fromDeg: number, toDeg: number, color: string): string {
        const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
        const x1 = cx + r * Math.cos(toRad(fromDeg));
        const y1 = cy + r * Math.sin(toRad(fromDeg));
        const x2 = cx + r * Math.cos(toRad(toDeg));
        const y2 = cy + r * Math.sin(toRad(toDeg));
        return `<path d="M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}"
                  fill="none" stroke="${color}" stroke-width="${size * 0.075}" stroke-linecap="butt"/>`;
    }

    // Needle tip point
    const needleRad = ((needleAngle - 90) * Math.PI) / 180;
    const needleTipX = cx + (r * 0.85) * Math.cos(needleRad);
    const needleTipY = cy + (r * 0.85) * Math.sin(needleRad);

    return `
<div class="speedometer" style="width:${size}px;margin:0 auto;text-align:center">
  <svg width="${size}" height="${size * 0.72}" viewBox="0 0 ${size} ${size * 0.72}">
    <!-- Background arc track -->
    <path d="M ${arcStartX} ${arcStartY} A ${r} ${r} 0 0 1 ${arcEndX} ${arcEndY}"
          fill="none" stroke="var(--color-border)" stroke-width="${size * 0.075}" stroke-linecap="butt"/>

    <!-- Zone arcs: red (0-40%), amber (40-70%), green (70-100%) -->
    ${arcSegment(-180, -108, 'var(--color-attention)')}
    ${arcSegment(-108, -54, 'var(--color-monitor)')}
    ${arcSegment(-54, 0, 'var(--color-healthy)')}

    <!-- Needle -->
    <line x1="${cx}" y1="${cy}"
          x2="${needleTipX}" y2="${needleTipY}"
          stroke="${color}" stroke-width="3" stroke-linecap="round"/>
    <!-- Pivot dot -->
    <circle cx="${cx}" cy="${cy}" r="${size * 0.04}"
            fill="${color}" stroke="var(--color-surface)" stroke-width="2"/>
  </svg>

  <!-- Score value -->
  <div class="speedometer__value" style="color:${color}">${score}</div>
  <div class="speedometer__label">${label}</div>
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
