/**
 * PDF Merge Utility
 *
 * Uses pdf-lib to merge multiple PDF buffers into a single document.
 * This enables the multi-pass rendering strategy:
 *   1. Cover page PDF — no headers/footers, margin: 0
 *   2. Content pages PDF — Puppeteer native headers/footers on every physical page
 *   3. Back page PDF — no headers/footers, margin: 0
 *
 * The merged PDF has correct page ordering with per-section header control.
 */

import { PDFDocument } from 'pdf-lib';

/**
 * Merges an array of PDF buffers into a single PDF document.
 * Pages from each buffer are appended in order.
 *
 * @param buffers - Array of PDF file buffers to merge
 * @returns A single merged PDF buffer
 */
export async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
    const merged = await PDFDocument.create();

    for (const buffer of buffers) {
        const source = await PDFDocument.load(buffer);
        const pages = await merged.copyPages(source, source.getPageIndices());
        for (const page of pages) {
            merged.addPage(page);
        }
    }

    const mergedBytes = await merged.save();
    return Buffer.from(mergedBytes);
}
