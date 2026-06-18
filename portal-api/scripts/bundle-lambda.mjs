/**
 * Bundle the Portal API for AWS Lambda using esbuild.
 *
 * Produces a single file `dist/lambda/index.mjs` that contains all code
 * and dependencies (tree-shaken). This keeps the Lambda package small
 * (typically 5-10 MB vs 65 MB of raw node_modules).
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
  // Tree-shake unused exports
  treeShaking: true,
  // Mark these as external (available in Lambda runtime or layers)
  external: [
    // AWS SDK v3 is available in the Lambda Node.js 20 runtime by default
    '@aws-sdk/*',
    '@smithy/*',
  ],
  // Handle dynamic requires in mongodb driver
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
  // Resolve .ts imports
  resolveExtensions: ['.ts', '.js', '.mjs', '.json'],
  // Don't try to bundle native addons
  loader: { '.node': 'file' },
  // Log bundle stats
  metafile: true,
  logLevel: 'info',
});

console.log('✅ Portal API Lambda bundle complete → dist/lambda/index.mjs');
