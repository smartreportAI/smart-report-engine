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
    if (!input.contentHtml) {
        return generatePdfFromHtml(input.html, {
            margin: getPdfMargins(tenant.branding, !!input.patient),
            headerTemplate: buildHeaderTemplate(tenant.branding, input.patient),
            footerTemplate: buildFooterTemplate(tenant.branding),
        });
    }

    const fullBleedMargin = { top: '0px', bottom: '0px', left: '0px', right: '0px' };

    // Run sequentially — not Promise.all — to avoid exhausting all 3 browser
    // pool slots with a single request, which causes queue timeouts when
    // concurrent requests arrive.
    const coverPdf  = input.coverHtml
        ? await generatePdfFromHtml(input.coverHtml, { margin: fullBleedMargin })
        : null;

    const contentPdf = await generatePdfFromHtml(input.contentHtml, {
        margin: getPdfMargins(tenant.branding, !!input.patient),
        headerTemplate: buildHeaderTemplate(tenant.branding, input.patient),
        footerTemplate: buildFooterTemplate(tenant.branding),
    });

    const backPdf = input.backHtml
        ? await generatePdfFromHtml(input.backHtml, { margin: fullBleedMargin })
        : null;

    const pdfSegments: Buffer[] = [];
    if (coverPdf) pdfSegments.push(coverPdf);
    pdfSegments.push(contentPdf);
    if (backPdf) pdfSegments.push(backPdf);

    if (pdfSegments.length === 1) {
        return pdfSegments[0];
    }

    return mergePdfBuffers(pdfSegments);
}