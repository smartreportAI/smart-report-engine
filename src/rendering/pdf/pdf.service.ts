import { browserPool } from './browser-pool';
import type { Browser } from 'puppeteer';

/* ---------------------------------------------------------------
   PDF Generation Options
   --------------------------------------------------------------- */

export interface PdfOptions {
    /**
     * Puppeteer margin settings for A4 output.
     * top/bottom MUST leave room for Puppeteer's native header/footer
     * templates when displayHeaderFooter is enabled.
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
    /**
     * Timeout in milliseconds for the entire PDF generation.
     * Defaults to 30_000 (30 seconds).
     */
    timeoutMs?: number;

    /**
     * HTML string for Puppeteer's native header, printed at the
     * top of every physical page. Uses inline CSS only.
     * Puppeteer provides .pageNumber and .totalPages classes.
     */
    headerTemplate?: string;

    /**
     * HTML string for Puppeteer's native footer, printed at the
     * bottom of every physical page. Uses inline CSS only.
     * Puppeteer provides .pageNumber and .totalPages classes.
     */
    footerTemplate?: string;
}

/**
 * Default margins leave room at the top for the colored strip +
 * branded header, and at the bottom for the branded footer.
 * Left/right are 0 because horizontal padding lives in the CSS.
 */
const DEFAULT_MARGINS = {
    top: '60px',
    bottom: '50px',
    left: '0px',
    right: '0px',
} as const;

const DEFAULT_TIMEOUT_MS = 30_000;

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
 *  - Uses BrowserPool for warm browser reuse (no cold start per request)
 *  - Wrapped in Promise.race with configurable timeout (default 30s)
 *  - Browser is always released back to pool, even on error/timeout
 *  - displayHeaderFooter: Puppeteer prints the header/footer on
 *    every physical page automatically (even when content overflows)
 */
export async function generatePdfFromHtml(
    html: string,
    options: PdfOptions = {},
): Promise<Buffer> {
    const margin = { ...DEFAULT_MARGINS, ...options.margin };
    const debug = options.debug ?? false;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const startMs = Date.now();
    if (debug) console.log('[pdf] Acquiring browser from pool...');

    const browser = await browserPool.getBrowser();

    try {
        const pdfPromise = generateWithBrowser(
            browser,
            html,
            margin,
            debug,
            options.headerTemplate,
            options.footerTemplate,
        );

        // Race against timeout
        const result = await Promise.race([
            pdfPromise,
            createTimeout(timeoutMs),
        ]);

        const elapsed = Date.now() - startMs;
        if (debug) console.log(`[pdf] Done in ${elapsed}ms — ${result.length} bytes`);

        return result;
    } finally {
        await browserPool.releaseBrowser(browser);
    }
}

/**
 * Graceful pool shutdown — call when server is stopping.
 */
export async function shutdownPdfService(): Promise<void> {
    await browserPool.shutdown();
}

/* ---------------------------------------------------------------
   Internal helpers
   --------------------------------------------------------------- */

async function generateWithBrowser(
    browser: Browser,
    html: string,
    margin: { top: string; bottom: string; left: string; right: string },
    debug: boolean,
    headerTemplate?: string,
    footerTemplate?: string,
): Promise<Buffer> {
    const page = await browser.newPage();

    try {
        // A4 viewport — matches the 210mm width in CSS
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

        if (debug) console.log('[pdf] Setting HTML content...');

        // networkidle0: wait until no more than 0 network connections for 500ms
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });

        if (debug) console.log('[pdf] Generating PDF...');

        // When templates are provided, Puppeteer paints them on every
        // physical page automatically — guaranteed bottom-of-page footer
        // even when content overflows to additional physical pages.
        const useHeaderFooter = !!(headerTemplate || footerTemplate);

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin,
            displayHeaderFooter: useHeaderFooter,
            headerTemplate: headerTemplate ?? '<span></span>',
            footerTemplate: footerTemplate ?? '<span></span>',
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await page.close();
    }
}

function createTimeout(ms: number): Promise<never> {
    return new Promise((_resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`PDF generation timed out after ${ms}ms.`));
        }, ms);

        // Don't block Node.js from exiting
        if (timer.unref) {
            timer.unref();
        }
    });
}
