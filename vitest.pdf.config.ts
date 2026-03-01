import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the slow PDF integration tests (require Puppeteer).
 *
 * Run with:
 *   npx vitest run --config vitest.pdf.config.ts
 */
export default defineConfig({
    test: {
        include: [
            'src/integration-tests/pdf-integrity.e2e.test.ts',
            'src/integration-tests/concurrency-pdf.e2e.test.ts',
        ],
        globalSetup: ['src/integration-tests/setup.global.ts'],
        pool: 'forks',
        testTimeout: 120_000,
        reporters: ['verbose'],
    },
});
