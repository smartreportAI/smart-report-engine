/**
 * Lambda-compatible browser launcher.
 *
 * On AWS Lambda, we use @sparticuz/chromium (a pre-compiled headless
 * Chrome built for the Lambda execution environment). On local dev,
 * we fall back to the system-installed Puppeteer/Chrome.
 *
 * This module replaces the browser-pool for Lambda deployments.
 * Lambda handles concurrency at the function level (each invocation
 * gets its own container), so a pool is unnecessary.
 */

import puppeteerCore from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';

const IS_LAMBDA = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

let chromium: any;

/**
 * Launch a browser instance suitable for the current environment.
 */
export async function launchBrowser(): Promise<Browser> {
  if (IS_LAMBDA) {
    // Dynamic import — only loaded on Lambda (avoids bundling issues locally)
    if (!chromium) {
      chromium = (await import('@sparticuz/chromium')).default;
    }

    return puppeteerCore.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    }) as unknown as Browser;
  }

  // Local development — use system Puppeteer
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
