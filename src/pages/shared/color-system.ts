/**
 * Shared colour system — single source of truth for all status/severity
 * colours used across page renderers (summary, detail, cover, back, etc.).
 *
 * Consolidates 5+ duplicate colour lookup functions into reusable maps.
 */

import type { ParameterStatus } from '../../domain/models/parameter.model';

/* ── Parameter Status Colours ─────────────────────────────────── */

export interface StatusStyle {
  color: string;
  bg: string;
  border: string;
  accent: string;
  label: string;
}

const STATUS_MAP: Record<ParameterStatus, StatusStyle> = {
  normal:   { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', accent: '#16A34A', label: '✔ NORMAL' },
  low:      { color: '#c0392b', bg: '#fff8f8', border: '#fcd5d5', accent: '#f87171', label: '▼ LOW' },
  high:     { color: '#c0392b', bg: '#fff8f8', border: '#fcd5d5', accent: '#f87171', label: '▲ HIGH' },
  critical: { color: '#c0392b', bg: '#fff1f1', border: '#fca5a5', accent: '#f87171', label: '‼ CRITICAL' },
};

export function getStatusStyle(status: ParameterStatus): StatusStyle {
  return STATUS_MAP[status];
}

/* ── Profile Severity Colours ─────────────────────────────────── */

export interface SeverityStyle {
  color: string;
  bg: string;
  border: string;
  dot: string;
  label: string;
}

const SEVERITY_MAP: Record<string, SeverityStyle> = {
  healthy: { color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC', dot: '#10b981', label: 'Healthy' },
  normal:  { color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC', dot: '#10b981', label: 'Healthy' },
  monitor: { color: '#c0392b', bg: '#fff8f8', border: '#fcd5d5', dot: '#f59e0b', label: 'Monitor' },
  medium:  { color: '#f59e0b', bg: '#fffbeb', border: '#fcd34d', dot: '#f59e0b', label: 'Monitor' },
  low:     { color: '#3b82f6', bg: '#eff6ff', border: '#93c5fd', dot: '#3b82f6', label: 'Low' },
};

const DEFAULT_SEVERITY: SeverityStyle = {
  color: '#c0392b', bg: '#fff1f1', border: '#fca5a5', dot: '#f87171', label: 'Attention',
};

export function getSeverityStyle(sev: string): SeverityStyle {
  return SEVERITY_MAP[sev] ?? DEFAULT_SEVERITY;
}

/* ── hex → RGB conversion ─────────────────────────────────────── */

export function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '0 0 0';
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
}
