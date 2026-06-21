/**
 * Lambda-compatible browser launcher.
 *
 * On AWS Lambda, we use @sparticuz/chromium (a pre-compiled headless
 * Chrome built for the Lambda execution environment). On local dev,
 * we fall back to the system-installed Puppeteer/Chrome.
 *
 * Lambda Singleton Pattern:
 *   On Lambda, Chromium takes ~3–6s to launch. We launch it ONCE
 *   at container startup and cache the Browser instance. Every warm
 *   invocation reuses the same browser, saving the launch cost.
 *
 *   releaseBrowser() on Lambda is a no-op — the browser stays alive
 *   for the next invocation in the same warm container.
 *
 * Local dev uses a fresh browser per call (no caching needed).
 */

import puppeteerCore from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';

const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

let chromium: any;

// ─── Lambda browser singleton ─────────────────────────────────────────────────
// Shared across warm invocations within the same Lambda container.
let _lambdaBrowser: Browser | null = null;
let _browserLaunching: Promise<Browser> | null = null;

/**
 * Get or create the Lambda browser singleton.
 * Uses a shared promise to prevent concurrent launch races.
 */
async function getLambdaBrowser(): Promise<Browser> {
  // Return cached browser if still connected
  if (_lambdaBrowser) {
    try {
      // Quick health check — if disconnected, fall through to relaunch
      if (_lambdaBrowser.connected) return _lambdaBrowser;
    } catch {
      // Browser crashed — relaunch
    }
    _lambdaBrowser = null;
  }

  // If already launching (concurrent requests on cold start), wait for it
  if (_browserLaunching) return _browserLaunching;

  _browserLaunching = (async () => {
    if (!chromium) {
      chromium = (await import('@sparticuz/chromium')).default;
    }
    const browser = await puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    }) as unknown as Browser;

    // Remove from pool if it crashes
    browser.on('disconnected', () => {
      if (_lambdaBrowser === browser) {
        _lambdaBrowser = null;
      }
    });

    _lambdaBrowser = browser;
    _browserLaunching = null;
    return browser;
  })();

  return _browserLaunching;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Launch (or reuse) a browser for the current environment.
 * On Lambda: returns the cached singleton (launches once per container).
 * Locally: launches a fresh browser each time.
 */
export async function launchBrowser(): Promise<Browser> {
  if (IS_LAMBDA) {
    return getLambdaBrowser();
  }

  // Local development — fresh browser per call (pool handles reuse locally)
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
}

/**
 * Release a browser after use.
 * On Lambda: NO-OP — keeps the singleton alive for the next warm invocation.
 * Locally: closes the browser (pool handles lifecycle locally).
 */
export async function releaseBrowser(browser: Browser): Promise<void> {
  if (IS_LAMBDA) {
    // Do NOT close — keep the singleton warm for the next invocation
    return;
  }
  try {
    await browser.close();
  } catch {
    // Already closed or crashed — safe to ignore
  }
}

