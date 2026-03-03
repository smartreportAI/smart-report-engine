import { generatePdfFromHtml } from './pdf.service';
import { mergePdfBuffers } from './pdf-merge';
import { buildHeaderTemplate, buildFooterTemplate, getPdfMargins } from '../html-layout';
import type { PatientStripInfo } from '../html-layout';
import type { TenantConfig } from '../../modules/tenants/tenant.types';

export interface MultipassHtmlInput {
    /** Combined full HTML document (fallback if cover/content not separated) */
    html: string;
    /** Cover page HTML (full-bleed, no headers) */
    coverHtml?: string | null;
    /** Content pages HTML (will receive headers/footers) */
    contentHtml?: string | null;
    /** Back page HTML (full-bleed, no headers) */
    backHtml?: string | null;
    /** Metadata for the patient strip included in the header */
    patient?: PatientStripInfo;
}

/**
 * Generates a PDF using a multi-pass strategy to ensure cover and back pages
 * are printed full-bleed without headers or footers, while content pages
 * receive proper branded multi-page headers/footers via Puppeteer.
 */
export async function generateMultipassPdf(
    input: MultipassHtmlInput,
    tenant: TenantConfig,
): Promise<Buffer> {
    // If the input doesn't have split HTML (e.g., from an old cache), do a single pass
    if (!input.contentHtml) {
        return generatePdfFromHtml(input.html, {
            margin: getPdfMargins(tenant.branding, !!input.patient),
            headerTemplate: buildHeaderTemplate(tenant.branding, input.patient),
            footerTemplate: buildFooterTemplate(tenant.branding),
        });
    }

    const pdfSegments: Buffer[] = [];

    // Pass 1: Cover (full-bleed, no margin, no header/footer)
    if (input.coverHtml) {
        const coverPdf = await generatePdfFromHtml(input.coverHtml, {
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
        });
        pdfSegments.push(coverPdf);
    }

    // Pass 2: Content pages (with branded headers/footers + margins)
    const contentPdf = await generatePdfFromHtml(input.contentHtml, {
        margin: getPdfMargins(tenant.branding, !!input.patient),
        headerTemplate: buildHeaderTemplate(tenant.branding, input.patient),
        footerTemplate: buildFooterTemplate(tenant.branding),
    });
    pdfSegments.push(contentPdf);

    // Pass 3: Back page (full-bleed, no margin, no header/footer)
    if (input.backHtml) {
        const backPdf = await generatePdfFromHtml(input.backHtml, {
            margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' },
        });
        pdfSegments.push(backPdf);
    }

    // Single segment? Return it directly
    if (pdfSegments.length === 1) {
        return pdfSegments[0];
    }

    // Merge multiple segments
    return mergePdfBuffers(pdfSegments);
}