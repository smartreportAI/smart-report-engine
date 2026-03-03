import { classifyParameter } from './classification';
import type { RawReportInput, RawProfileInput, RawParameterInput } from '../types/input.types';
import type { NormalizedReport, OverallSeverity } from '../models/report.model';
import type { ProfileResult, ProfileSeverity } from '../models/profile.model';
import type { ParameterResult } from '../models/parameter.model';

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Produces a stable, lowercase, hyphen-separated identifier from a name.
 * e.g. "Haemoglobin A1c" → "haemoglobin-a1c"
 */
function toId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Parameter normalization
// ---------------------------------------------------------------------------

function normalizeParameter(raw: RawParameterInput): ParameterResult {
  const numericValue =
    typeof raw.value === 'number' ? raw.value : parseFloat(raw.value);

  const range =
    raw.referenceRange !== undefined && raw.referenceRange !== null &&
      (raw.referenceRange.min != null || raw.referenceRange.max != null)
      ? { min: raw.referenceRange.min ?? undefined, max: raw.referenceRange.max ?? undefined }
      : undefined;

  const canClassifyNumeric = !isNaN(numericValue) && range !== undefined;

  const { status, signalScore } = canClassifyNumeric
    ? classifyParameter(numericValue, range?.min, range?.max)
    : { status: 'normal' as const, signalScore: 100 };

  return {
    id: toId(raw.testName),
    name: raw.testName,
    value: raw.value,
    unit: raw.unit ?? undefined,
    range,
    status,
    signalScore,
  };
}

// ---------------------------------------------------------------------------
// Profile normalization
// ---------------------------------------------------------------------------

function deriveProfileSeverity(parameters: ParameterResult[]): ProfileSeverity {
  const total = parameters.length;
  if (total === 0) return 'healthy';

  const hasCritical = parameters.some((p) => p.status === 'critical');
  if (hasCritical) return 'attention';

  const abnormalRatio =
    parameters.filter((p) => p.status !== 'normal').length / total;

  if (abnormalRatio >= 0.4) return 'attention';
  if (abnormalRatio >= 0.15) return 'monitor';
  return 'healthy';
}

function normalizeProfile(raw: RawProfileInput): ProfileResult {
  const parameters = raw.parameters.map(normalizeParameter);

  const abnormalCount = parameters.filter((p) => p.status !== 'normal').length;
  const normalCount = parameters.length - abnormalCount;

  const profileScore =
    parameters.length > 0
      ? Math.round(
        parameters.reduce((sum, p) => sum + p.signalScore, 0) / parameters.length,
      )
      : 100;

  const severity = deriveProfileSeverity(parameters);

  return {
    id: toId(raw.profileName),
    name: raw.profileName,
    parameters,
    abnormalCount,
    normalCount,
    profileScore,
    severity,
  };
}

// ---------------------------------------------------------------------------
// Overall severity derivation
// ---------------------------------------------------------------------------

function deriveOverallSeverity(profiles: ProfileResult[]): OverallSeverity {
  if (profiles.some((p) => p.severity === 'attention')) return 'critical';
  if (profiles.some((p) => p.severity === 'monitor')) return 'monitor';
  return 'stable';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a raw, unnormalized lab report into the canonical NormalizedReport
 * domain model.
 *
 * This is the single entry point for all data entering the report engine.
 * The function is pure — it produces no side effects and returns a new object.
 */
export function normalizeReport(raw: RawReportInput): NormalizedReport {
  const profiles = raw.profiles.map(normalizeProfile);

  const overallScore = raw.aiAssessment?.healthScore ?? (
    profiles.length > 0
      ? Math.round(
        profiles.reduce((sum, p) => sum + p.profileScore, 0) / profiles.length,
      )
      : 100
  );

  const overallSeverity = deriveOverallSeverity(profiles);

  return {
    patientId: raw.patientId,
    patientName: raw.patientName,
    age: raw.age,
    gender: raw.gender,
    profiles,
    overallScore,
    overallSeverity,
    aiAssessment: raw.aiAssessment,
  };
}
