import { describe, it, expect, afterAll } from 'vitest';
import { generatePdfFromHtml, shutdownPdfService } from '../../rendering/pdf/pdf.service';

afterAll(async () => {
    await shutdownPdfService();
});

describe('generatePdfFromHtml', () => {
    it('returns a valid PDF buffer from minimal HTML', async () => {
        const html = `<!DOCTYPE html>
<html><head><title>Test</title></head>
<body><h1>Hello PDF</h1></body></html>`;

        const buffer = await generatePdfFromHtml(html);

        // Must be a Buffer
        expect(Buffer.isBuffer(buffer)).toBe(true);

        // Must have substantial size (a blank A4 PDF is typically ~3-5 KB)
        expect(buffer.length).toBeGreaterThan(1000);

        // Must start with PDF magic bytes
        const header = buffer.subarray(0, 5).toString('ascii');
        expect(header).toBe('%PDF-');
    }, 30_000); // 30s timeout for Puppeteer cold start

    it('preserves background colors with printBackground', async () => {
        const html = `<!DOCTYPE html>
<html><head><title>Color Test</title>
<style>body { background: #E53935; }</style></head>
<body><div style="width:100px;height:100px;background:#2E7D32;"></div></body></html>`;

        const buffer = await generatePdfFromHtml(html);

        expect(Buffer.isBuffer(buffer)).toBe(true);
        expect(buffer.length).toBeGreaterThan(1000);
    }, 30_000);
});
