/**
 * Shared value-formatting helpers used across page renderers.
 *
 * Consolidates duplicated safeValue / formatRange / safeUnit functions
 * from detail.page.ts into a single reusable module.
 */

import type { ParameterResult } from '../../domain/models/parameter.model';

/** Renders a value, returning 'Unknown' for missing / empty values. */
export function safeValue(v: number | string | undefined | null): string {
  if (v === undefined || v === null || v === '') return 'Unknown';
  const n = Number(v);
  if (typeof v === 'string' && isNaN(n)) return v; // text value (e.g. "ABSENT")
  if (isNaN(n)) return 'Unknown';
  return String(v);
}

/** Trims a unit string, returning '' for missing/blank. */
export function safeUnit(u: string | undefined): string {
  return (u && u.trim()) ? u.trim() : '';
}

/** Formats a reference range as a human-readable string. */
export function formatRange(param: ParameterResult): string {
  if (!param.range) return 'Unknown';
  const { min, max } = param.range;
  if (min === undefined && max === undefined) return 'Unknown';
  if (min === undefined || min === null) return `< ${max}`;
  if (max === undefined || max === null) return `> ${min}`;
  return `${min} – ${max}`;
}
