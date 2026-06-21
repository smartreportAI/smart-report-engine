import { config } from '../../core/config/config.service';
import type { Browser } from 'puppeteer-core';

/* ---------------------------------------------------------------
   Browser abstraction — routes to browser-lambda (Lambda) or
   browser-pool (local dev) based on the runtime environment.
   Using dynamic imports ensures esbuild does NOT statically pull
   'puppeteer' into the Lambda bundle at module-load time.
   --------------------------------------------------------------- */

const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

async function getBrowser(): Promise<Browser> {
  if (IS_LAMBDA) {
    const { launchBrowser } = await import('./browser-lambda');
    return launchBrowser();
  }
  const { browserPool } = await import('./browser-pool');
  return browserPool.getBrowser() as unknown as Browser;
}

async function releaseBrowser(browser: Browser): Promise<void> {
  if (IS_LAMBDA) {
    const { releaseBrowser: release } = await import('./browser-lambda');
    return release(browser);
  }
  const { browserPool } = await import('./browser-pool');
  return browserPool.releaseBrowser(browser as any);
}

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

/**
 * Default timeout for a single PDF pass.
 * Can be overridden via PDF_TIMEOUT_MS in the environment so that
 * cloud deployments (e.g. Render) can allow a slightly longer window
 * without changing application logic.
 */
const DEFAULT_TIMEOUT_MS = config.pdfTimeoutMs ?? 90_000; // 90s default — Railway Chrome needs more time

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
 *  - On Lambda: launches a fresh browser per invocation via browser-lambda
 *  - Locally: uses BrowserPool for warm browser reuse (no cold start per request)
 *  - Wrapped in Promise.race with configurable timeout (default 90s)
 *  - Browser is always released after use, even on error/timeout
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
    if (debug) console.log(`[pdf] Acquiring browser (lambda=${IS_LAMBDA})...`);

    const browser = await getBrowser();

    try {
        const pdfPromise = generateWithBrowser(
            browser,
            html,
            margin,
            debug,
            options.headerTemplate,
            options.footerTemplate,
        );

        // Race against timeout — clear timer on completion to prevent leak
        const { promise: timeoutPromise, clear: clearTimer } = createTimeout(timeoutMs);
        try {
            const result = await Promise.race([pdfPromise, timeoutPromise]);
            clearTimer();

            const elapsed = Date.now() - startMs;
            if (debug) console.log(`[pdf] Done in ${elapsed}ms — ${result.length} bytes`);

            return result;
        } catch (err) {
            clearTimer();
            throw err;
        }
    } finally {
        await releaseBrowser(browser);
    }
}

/**
 * Graceful pool shutdown — call when the local server is stopping.
 * On Lambda this is a no-op (containers are discarded by AWS).
 */
export async function shutdownPdfService(): Promise<void> {
    if (!IS_LAMBDA) {
        const { browserPool } = await import('./browser-pool');
        await browserPool.shutdown();
    }
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
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });

        if (debug) console.log('[pdf] Setting HTML content...');

        await page.emulateMediaType('print');

        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60_000 });

        if (debug) console.log('[pdf] Generating PDF...');

        const useHeaderFooter = !!(headerTemplate || footerTemplate);

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: false,
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

function createTimeout(ms: number): { promise: Promise<never>; clear: () => void } {
    let timer: ReturnType<typeof setTimeout>;
    const promise = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
            reject(new Error(`PDF generation timed out after ${ms}ms.`));
        }, ms);

        // Don't block Node.js from exiting
        if (timer.unref) {
            timer.unref();
        }
    });

    return {
        promise,
        clear: () => clearTimeout(timer),
    };
}
