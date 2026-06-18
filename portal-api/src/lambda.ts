/**
 * Lambda Handler — Portal API
 *
 * Wraps the Fastify application for AWS Lambda + API Gateway.
 * This file is the bundled entry point for the Lambda function.
 *
 * Environment variables required on the Lambda:
 *   - MONGODB_URI
 *   - JWT_SECRET
 *   - AWS_REGION (automatically set by Lambda)
 *   - S3_BUCKET
 *   - CORS_ORIGIN (comma-separated allowed origins)
 *   - NODE_ENV=production
 */

import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app';
import { ensureIndexes } from './database/indexes';
import { seedSuperAdmin } from './scripts/seed';

let proxy: ReturnType<typeof awsLambdaFastify>;
let initialized = false;

const app = buildApp();

/**
 * One-time initialization: ensure DB indexes and seed superadmin.
 * Runs once per cold start, then reuses the connection for warm invocations.
 */
async function init() {
  if (initialized) return;
  try {
    await ensureIndexes();
    await seedSuperAdmin();
    initialized = true;
  } catch (err) {
    // Log but don't crash — the readiness guard in app.ts will return 503
    // for DB-dependent routes until the next invocation succeeds.
    console.error('Lambda init: DB setup failed (will retry next invocation)', err);
  }
}

proxy = awsLambdaFastify(app, {
  callbackWaitsForEmptyEventLoop: false,
});

export const handler = async (event: any, context: any) => {
  // Run DB init on first invocation (cold start)
  await init();
  return proxy(event, context);
};
