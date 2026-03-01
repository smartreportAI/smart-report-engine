/**
 * Shared helpers and fixtures for integration tests.
 *
 * All e2e tests use buildApp() + app.inject() — no real HTTP server,
 * no external dependencies.
 */

import { pageRegistry } from '../core/page-registry/page.registry';
import { masterOverviewPage } from '../pages/master-overview.page';
import { profileDetailPage } from '../pages/profile-detail.page';
import type { PageRenderContext } from '../core/page-registry/page.types';

// ---------------------------------------------------------------------------
// Page registry (idempotent — safe to call from each test file)
// ---------------------------------------------------------------------------

/**
 * Seeds the page registry if not already done.
 * Guards against double-registration (pageRegistry throws if name exists).
 */
export function seedPages(): void {
    if (!pageRegistry.has('master-overview')) pageRegistry.register(masterOverviewPage);
    if (!pageRegistry.has('profile-detail')) pageRegistry.register(profileDetailPage);

    const placeholders = [
        'cover', 'summary', 'executiveSummary', 'bloodPanel',
        'lipidProfile', 'thyroidPanel', 'vitaminAnalysis', 'recommendations', 'appendix',
    ];
    for (const name of placeholders) {
        if (!pageRegistry.has(name)) {
            pageRegistry.register({
                name,
                generate(_ctx: PageRenderContext): string {
                    return `<div>[${name} — placeholder]</div>`;
                },
            });
        }
    }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid JSON report body for tenant-alpha. */
export const JSON_REPORT_BODY = {
    tenantId: 'tenant-alpha',
    output: 'html',
    reportData: {
        patientId: 'PAT-E2E-001',
        age: 35,
        gender: 'male',
        profiles: [
            {
                profileName: 'Lipid Profile',
                parameters: [
                    {
                        testName: 'Total Cholesterol',
                        value: 185,
                        unit: 'mg/dL',
                        referenceRange: { min: 0, max: 200 },
                    },
                    {
                        testName: 'LDL',
                        value: 130,
                        unit: 'mg/dL',
                        referenceRange: { min: 0, max: 130 },
                    },
                    {
                        testName: 'HDL',
                        value: 45,
                        unit: 'mg/dL',
                        referenceRange: { min: 40, max: 60 },
                    },
                ],
            },
        ],
    },
};

/** Minimal valid FHIR Bundle with Patient + Observation. */
export const FHIR_INGEST_BODY = {
    tenantId: 'tenant-alpha',
    output: 'html',
    fhirBundle: {
        resourceType: 'Bundle',
        type: 'collection',
        entry: [
            {
                resource: {
                    resourceType: 'Patient',
                    id: 'fhir-pat-001',
                    name: [{ text: 'FHIR Patient' }],
                    birthDate: '1988-06-15',
                    gender: 'male',
                },
            },
            {
                resource: {
                    resourceType: 'Observation',
                    id: 'fhir-obs-001',
                    status: 'final',
                    code: {
                        coding: [{ code: '2093-3', display: 'Total Cholesterol' }],
                        text: 'Total Cholesterol',
                    },
                    valueQuantity: { value: 195, unit: 'mg/dL' },
                    referenceRange: [{ low: { value: 0 }, high: { value: 200 } }],
                },
            },
        ],
    },
};

/** Minimal valid HL7 v2 ORU^R01 message. */
export const HL7_INGEST_BODY = {
    tenantId: 'tenant-alpha',
    output: 'html',
    hl7Message: [
        'MSH|^~\\&|LAB|HOSP|APP|DEST|20240101120000||ORU^R01|MSG001|P|2.5',
        'PID|1||E2E-HL7-001|||E2EPatient^Test||19890315|M',
        'OBR|1|||Lipid Panel',
        'OBX|1|NM|2093-3^Total Cholesterol||190|mg/dL|0^200|N|||F',
    ].join('\r'),
};

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

export interface JsonApiResponse {
    success: boolean;
    data?: {
        html?: string;
        overallScore?: number;
        overallSeverity?: string;
        renderedPages?: string[];
        skippedPages?: string[];
    };
    error?: { code: string; message: string };
}

export function parseApiResponse(body: string): JsonApiResponse {
    return JSON.parse(body) as JsonApiResponse;
}
