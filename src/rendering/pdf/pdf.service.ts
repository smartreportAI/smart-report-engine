import puppeteer from 'puppeteer';

/* ---------------------------------------------------------------
   PDF Generation Options
   --------------------------------------------------------------- */

export interface PdfOptions {
    /**
     * Puppeteer margin settings for A4 output.
     * Defaults match standard medical report conventions.
     */
    margin?: {
        top?: string;
        bottom?: string;
        left?: string;
        right?: string;
    };
    /**
     * Pass true to emit detailed timing logs. Defaults to false.
     */
    debug?: boolean;
}

const DEFAULT_MARGINS = {
    top: '20mm',
    bottom: '20mm',
    left: '15mm',
    right: '15mm',
} as const;

/* ---------------------------------------------------------------
   Core PDF Generation
   --------------------------------------------------------------- */

/**
 * Converts a complete HTML string into a print-ready A4 PDF buffer.
 *
 * Design guarantees:
 *  - A4 portrait, 300 DPI equivalent via Puppeteer defaults
 *  - printBackground: true — preserves colors, SVG fills, sliders
 *  - setContent with networkidle0 — waits for all web fonts / images
 *  - Does NOT write to disk; caller decides what to do with the buffer
 *  - Browser is always closed, even on error (try/finally)
 *
 * Lambda notes:
 *  - Uses --no-sandbox for Lambda/container environments
 *  - --disable-setuid-sandbox complementary flag
 *  - --disable-dev-shm-usage uses /tmp instead of /dev/shm (small RAM)
 *  - --single-process removed (causes crashes in some Lambda builds)
 */
export async function generatePdfFromHtml(
    html: string,
    options: PdfOptions = {},
): Promise<Buffer> {
    const margin = { ...DEFAULT_MARGINS, ...options.margin };
    const debug = options.debug ?? false;

    const startMs = Date.now();
    if (debug) console.log('[pdf] Launching Puppeteer...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--font-render-hinting=none', // crisp text rendering in headless
        ],
    });

    try {
        const page = await browser.newPage();

        // A4 viewport — matches the 210mm width in CSS
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

        if (debug) console.log('[pdf] Setting HTML content...');

        // networkidle0: wait until no more than 0 network connections for 500ms
        // This ensures web fonts and any CDN-hosted logos have fully loaded
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });

        if (debug) console.log('[pdf] Generating PDF...');

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,  // required: preserves colors, fills, SVG strokes
            margin,
        });

        const elapsed = Date.now() - startMs;
        if (debug) console.log(`[pdf] Done in ${elapsed}ms — ${pdfBuffer.length} bytes`);

        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
}
