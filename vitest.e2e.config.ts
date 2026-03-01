import { defineConfig } from 'vitest/config';

/**
 * Vitest config dedicated to e2e integration tests.
 *
 * Run with:
 *   npx vitest run --config vitest.e2e.config.ts
 *
 * Key differences from the default config:
 * - globalSetup: clears the on-disk cache before tests run
 * - pool: forks so each file gets an isolated module registry
 *   (metrics/rateLimiter singletons are fresh per worker)
 * - testTimeout: 60s to accommodate Puppeteer tests
 */
export default defineConfig({
    test: {
        include: ['src/integration-tests/**/*.e2e.test.ts'],
        exclude: ['src/integration-tests/pdf-integrity.e2e.test.ts', 'src/integration-tests/concurrency-pdf.e2e.test.ts'],
        globalSetup: ['src/integration-tests/setup.global.ts'],
        pool: 'forks',       // Each file = separate process → isolated singletons
        testTimeout: 60_000,
        reporters: ['verbose'],
    },
});
