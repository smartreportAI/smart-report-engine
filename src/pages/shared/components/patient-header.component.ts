/**
 * Shared Components — Patient Details Header
 *
 * A horizontal bar showing patient demographic data.
 * Used near the top of the Summary, Detail, and Overview pages.
 *
 * Only the fields present in NormalizedReport are shown.
 * Missing fields are omitted cleanly (no "undefined" text).
 */

import type { NormalizedReport } from '../../../domain/models/report.model';

export interface PatientHeaderOptions {
    report: NormalizedReport;
    /** Primary color for the left accent bar */
    primaryColor: string;
    /** Optional report date string (ISO or formatted) */
    reportDate?: string;
}

/**
 * Renders a compact patient demographics bar:
 *
 *   | Patient ID  |  Age  |  Gender  |  Report Date  |
 */
export function renderPatientHeader(opts: PatientHeaderOptions): string {
    const { report, primaryColor, reportDate } = opts;

    const items: Array<{ label: string; value: string }> = [
        { label: 'Patient ID', value: report.patientId ?? '—' },
        { label: 'Age', value: report.age !== undefined ? `${report.age} yrs` : '—' },
        { label: 'Gender', value: report.gender ?? '—' },
    ];

    if (reportDate) {
        items.push({ label: 'Report Date', value: reportDate });
    }

    const cells = items
        .map(
            (item) => `
      <div class="ph-cell">
        <div class="ph-cell__label">${item.label}</div>
        <div class="ph-cell__value">${item.value}</div>
      </div>`,
        )
        .join('<div class="ph-divider"></div>');

    return `
<div class="patient-header" style="border-left-color:${primaryColor}">
  ${cells}
</div>`;
}
