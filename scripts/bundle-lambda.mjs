/**
 * Bundle the Smart Report Engine for AWS Lambda using esbuild.
 *
 * Heavy packages (@sparticuz/chromium, puppeteer-core) are externalized
 * and provided via Lambda Layers. This keeps the function bundle small.
 *
 * Run: node scripts/bundle-lambda.mjs
 */

import { build } from 'esbuild';
import { rmSync, mkdirSync } from 'fs';

const OUT_DIR = 'dist/lambda';

// Clean
try { rmSync(OUT_DIR, { recursive: true }); } catch {}
mkdirSync(OUT_DIR, { recursive: true });

await build({
  entryPoints: ['src/lambda.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: `${OUT_DIR}/index.mjs`,
  minify: true,
  sourcemap: false,
  treeShaking: true,
  external: [
    // Provided inside the Docker image via package-lambda.json npm install
    '@sparticuz/chromium',
    'puppeteer-core',
    // AWS SDK is available natively in the Lambda runtime
    '@aws-sdk/*',
    '@smithy/*',
    // 'puppeteer' is intentionally NOT externalized here.
    // browser-pool.ts (which imports puppeteer) is only reachable via a
    // dynamic import() when IS_LAMBDA is false, so esbuild bundles it
    // inside an async chunk — it is never evaluated at Lambda boot time.
  ],
  banner: {
    js: `
      import { createRequire } from 'module';
      import { fileURLToPath } from 'url';
      import { dirname } from 'path';
      const require = createRequire(import.meta.url);
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
    `,
  },
  resolveExtensions: ['.ts', '.js', '.mjs', '.json'],
  loader: { '.node': 'file' },
  metafile: true,
  logLevel: 'info',
});

console.log('✅ Smart Report Engine Lambda bundle complete → dist/lambda/index.mjs');
