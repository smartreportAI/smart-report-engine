/**
 * Shared Components — Exact-Width Segmented Health Slider (v3)
 *
 * Design matches the requested segmented health slider style:
 *   - 3 equal-width track segments: Low (Red) | Normal (Green) | High (Red)
 *   - Floating speech-bubble marker above track: inline SVG icon + measured value
 *   - 3 equal-width zone labels below centered under segments
 *   - Clean SVG icons instead of emojis
 *   - Reference range printed below the labels
 *   - Value is mathematically interpolated into its correct segment.
 */

import type { ParameterStatus } from '../../../domain/models/parameter.model';

export interface SmartSliderOptions {
  value: number;
  min: number;
  max: number;
  normalMin?: number;
  normalMax?: number;
  unit: string;
  status: ParameterStatus;
}

const svgNormal = `<svg viewBox="0 0 24 24" width="16" height="16">
  <defs>
    <radialGradient id="gradNormal" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="60%" stop-color="#FACC15"/>
      <stop offset="100%" stop-color="#CA8A04"/>
    </radialGradient>
    <filter id="shadowNormal" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#CA8A04" flood-opacity="0.5"/>
    </filter>
  </defs>
  <circle cx="12" cy="12" r="11" fill="url(#gradNormal)" filter="url(#shadowNormal)"/>
  <circle cx="8" cy="10" r="1.8" fill="#713F12"/>
  <circle cx="16" cy="10" r="1.8" fill="#713F12"/>
  <path d="M7 14.5 Q12 18 17 14.5" stroke="#713F12" stroke-width="2" stroke-linecap="round" fill="none"/>
  <!-- Highlight -->
  <path d="M5 7 A 8 8 0 0 1 12 3 A 8 8 0 0 0 5 7" fill="#ffffff" opacity="0.6"/>
</svg>`;

const svgLow = `<svg viewBox="0 0 24 24" width="16" height="16">
  <defs>
    <radialGradient id="gradLow" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#E0F2FE"/>
      <stop offset="60%" stop-color="#7DD3FC"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </radialGradient>
    <filter id="shadowLow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#0284C7" flood-opacity="0.5"/>
    </filter>
  </defs>
  <circle cx="12" cy="12" r="11" fill="url(#gradLow)" filter="url(#shadowLow)"/>
  <circle cx="8" cy="10" r="1.8" fill="#082F49"/>
  <circle cx="16" cy="10" r="1.8" fill="#082F49"/>
  <!-- Jagged shivering mouth -->
  <path d="M6 15 L8.5 13.5 L12 15 L15.5 13.5 L18 15" stroke="#082F49" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- Highlight -->
  <path d="M5 7 A 8 8 0 0 1 12 3 A 8 8 0 0 0 5 7" fill="#ffffff" opacity="0.7"/>
</svg>`;

const svgHigh = `<svg viewBox="0 0 24 24" width="16" height="16">
  <defs>
    <radialGradient id="gradHigh" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#FECACA"/>
      <stop offset="60%" stop-color="#F87171"/>
      <stop offset="100%" stop-color="#B91C1C"/>
    </radialGradient>
    <filter id="shadowHigh" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#B91C1C" flood-opacity="0.5"/>
    </filter>
    <radialGradient id="sweat" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#DBEAFE"/>
      <stop offset="100%" stop-color="#3B82F6"/>
    </radialGradient>
  </defs>
  <circle cx="12" cy="12" r="11" fill="url(#gradHigh)" filter="url(#shadowHigh)"/>
  <!-- Distressed eyes -->
  <path d="M7 9 L10 11" stroke="#450A0A" stroke-width="2" stroke-linecap="round"/>
  <path d="M17 9 L14 11" stroke="#450A0A" stroke-width="2" stroke-linecap="round"/>
  <circle cx="8" cy="11.5" r="1.5" fill="#450A0A"/>
  <circle cx="16" cy="11.5" r="1.5" fill="#450A0A"/>
  <!-- Open mouth -->
  <ellipse cx="12" cy="16" rx="2.5" ry="3.5" fill="#450A0A"/>
  <!-- Sweat drop -->
  <path d="M18 4 C18 4, 21 8.5, 21 10.5 C21 12.4 19.6 14 18 14 C16.4 14 15 12.4 15 10.5 C15 8.5, 18 4, 18 4 Z" fill="url(#sweat)"/>
  <!-- Highlight -->
  <path d="M5 7 A 8 8 0 0 1 12 3 A 8 8 0 0 0 5 7" fill="#ffffff" opacity="0.5"/>
</svg>`;

function getBubbleStyle(status: ParameterStatus) {
  if (status === 'normal') return { bg: '#22C55E', icon: svgNormal };
  if (status === 'low') return { bg: '#F97316', icon: svgLow };
  if (status === 'critical') return { bg: '#DC2626', icon: svgHigh };
  return { bg: '#EF4444', icon: svgHigh };
}

export function renderSmartSlider(opts: SmartSliderOptions): string {
  const { value, min, max, normalMin: nMin, normalMax: nMax, unit, status } = opts;

  // Linear mapping into exactly one of three 33.33% bands
  let markerPct = 50;
  if (nMin != null && nMax != null) {
    if (value <= nMin) {
      const span = nMin - min || 1;
      markerPct = Math.max(0, (value - min) / span) * 33.33;
    } else if (value <= nMax) {
      const span = nMax - nMin || 1;
      markerPct = 33.33 + Math.max(0, (value - nMin) / span) * 33.33;
    } else {
      const span = max - nMax || 1;
      markerPct = 66.66 + Math.min(1, (value - nMax) / span) * 33.33;
    }
  } else if (nMax != null) {
    if (value <= nMax) {
      const span = nMax - min || 1;
      markerPct = 33.33 + Math.max(0, (value - min) / span) * 33.33;
    } else {
      const span = max - nMax || 1;
      markerPct = 66.66 + Math.min(1, (value - nMax) / span) * 33.33;
    }
  } else if (nMin != null) {
    if (value <= nMin) {
      const span = nMin - min || 1;
      markerPct = Math.max(0, (value - min) / span) * 33.33;
    } else {
      const span = max - nMin || 1;
      markerPct = 33.33 + Math.min(1, (value - nMin) / span) * 33.33;
    }
  } else {
    const span = max - min || 1;
    markerPct = Math.max(0, Math.min(1, (value - min) / span)) * 100;
  }

  // Keep bubble from overflowing container edges
  const bubblePct = Math.min(Math.max(markerPct, 8), 92);
  const { bg: bubbleBg, icon: bubbleIcon } = getBubbleStyle(status);
  const displayUnit = (unit ?? '').trim();

  // Format range strings for labels
  let lowR = '-', normR = '-', highR = '-';
  if (nMin != null && nMax != null) {
    lowR = `< ${nMin}`;
    normR = `${nMin} – ${nMax}`;
    highR = `> ${nMax}`;
  } else if (nMax != null) {
    normR = `< ${nMax}`;
    highR = `> ${nMax}`;
  } else if (nMin != null) {
    lowR = `< ${nMin}`;
    normR = `> ${nMin}`;
  }

  return `
<div class="hsl-slider">
  <div class="hsl-slider__area">
    <div class="hsl-bpos" style="left:${bubblePct}%;">
      <div class="hsl-bubble" style="background:${bubbleBg}; box-shadow: 0 4px 12px ${bubbleBg}66;">
        <span class="hsl-bubble__icon">${bubbleIcon}</span>
        <span class="hsl-bubble__val">${value}</span>
        ${displayUnit ? `<span class="hsl-bubble__unit">${displayUnit}</span>` : ''}
      </div>
      <div class="hsl-bubble__tip" style="border-top-color:${bubbleBg};"></div>
    </div>
    <div class="hsl-track">
      <div class="hsl-seg" style="background:#EF4444; border-radius:12px 0 0 12px;"></div>
      <div class="hsl-seg" style="background:#10B981;"></div>
      <div class="hsl-seg" style="background:#EF4444; border-radius:0 12px 12px 0;"></div>
    </div>
  </div>
  <div class="hsl-labels">
    <div class="hsl-label">
      <div class="hsl-label__icon">${svgLow}</div>
      <span class="hsl-label__text" style="color:#EF4444;">Low</span>
      <span class="hsl-label__range">${lowR}</span>
    </div>
    <div class="hsl-label">
      <div class="hsl-label__icon">${svgNormal}</div>
      <span class="hsl-label__text" style="color:#10B981;">Normal</span>
      <span class="hsl-label__range">${normR}</span>
    </div>
    <div class="hsl-label">
      <div class="hsl-label__icon">${svgHigh}</div>
      <span class="hsl-label__text" style="color:#EF4444;">High</span>
      <span class="hsl-label__range">${highR}</span>
    </div>
  </div>
</div>`;
}
