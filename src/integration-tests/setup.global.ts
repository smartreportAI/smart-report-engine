/**
 * Global setup for e2e tests.
 * Runs once before any test files in the e2e suite.
 * Purges the on-disk cache so all suites start cold.
 */
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

export default function setup() {
    try {
        rmSync(resolve(process.cwd(), 'cache'), { recursive: true, force: true });
    } catch {
        // OK if directory doesn't exist
    }
}
