/**
 * Shared Components — Segmented Health Slider (v4 – Clinical)
 *
 * Clean, emoji-free design:
 *   - 3-segment track: Low (soft rose) | Normal (soft green) | High (soft rose)
 *   - Floating pill marker above track with value + unit, no emoji faces
 *   - Simple text zone labels with minimal arrow indicators below
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

function getBubbleColor(status: ParameterStatus): string {
  if (status === 'normal') return '#22C55E';
  return '#f87171';
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
  const bubbleColor = getBubbleColor(status);
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
      <div class="hsl-bubble" style="background:${bubbleColor}; box-shadow: 0 2px 8px ${bubbleColor}55;">
        <span class="hsl-bubble__val">${value}</span>
        ${displayUnit ? `<span class="hsl-bubble__unit">${displayUnit}</span>` : ''}
      </div>
      <div class="hsl-bubble__tip" style="border-top-color:${bubbleColor};"></div>
    </div>
    <div class="hsl-track">
      <div class="hsl-seg" style="background:#fca5a5; border-radius:12px 0 0 12px;"></div>
      <div class="hsl-seg" style="background:#86efac;"></div>
      <div class="hsl-seg" style="background:#fca5a5; border-radius:0 12px 12px 0;"></div>
    </div>
  </div>
  <div class="hsl-labels">
    <div class="hsl-label">
      <span class="hsl-label__text" style="color:#f87171;">&#8595; Low</span>
      <span class="hsl-label__range">${lowR}</span>
    </div>
    <div class="hsl-label">
      <span class="hsl-label__text" style="color:#16A34A;">&#10003; Normal</span>
      <span class="hsl-label__range">${normR}</span>
    </div>
    <div class="hsl-label">
      <span class="hsl-label__text" style="color:#f87171;">&#8593; High</span>
      <span class="hsl-label__range">${highR}</span>
    </div>
  </div>
</div>`;
}
