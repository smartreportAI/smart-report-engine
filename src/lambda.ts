/**
 * Lambda Handler — Smart Report Engine
 *
 * Wraps the Fastify report generation server for AWS Lambda.
 * Uses @sparticuz/chromium (provided via Lambda Layer) for PDF rendering.
 *
 * Required Lambda Layers:
 *   - chromium-layer: @sparticuz/chromium binary
 *
 * Environment variables:
 *   - MONGODB_URI
 *   - AWS_REGION (auto-set by Lambda)
 *   - S3_BUCKET
 *   - NODE_ENV=production
 */

import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from './app';
import { seedPageRegistry } from './core/page-registry/seed-registry';

let proxy: ReturnType<typeof awsLambdaFastify>;
let initialized = false;

const app = buildApp();

async function init() {
  if (initialized) return;
  seedPageRegistry();
  initialized = true;
}

proxy = awsLambdaFastify(app, {
  callbackWaitsForEmptyEventLoop: false,
});

export const handler = async (event: any, context: any) => {
  await init();
  return proxy(event, context);
};
