/**
 * S3 Storage Service
 *
 * Handles uploading input JSONs and generated PDFs to the Pragnya S3 bucket.
 * Uses the structured path convention:
 *   clients/{tenantId}/inputs/{YYYY}/{MM}/{labNo}.json
 *   clients/{tenantId}/reports/{YYYY}/{MM}/{labNo}.pdf
 *
 * Credentials are picked up from the environment (IAM role on Lambda,
 * or local ~/.aws/credentials for dev).
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = process.env.S3_BUCKET || 'pragnya-smart-reports';
const REGION = process.env.AWS_REGION || 'ap-south-1';

const s3 = new S3Client({ region: REGION });

/**
 * Build the S3 key path for a given type, tenant, and labNo.
 * Uses current date for year/month partitioning.
 */
function buildKey(type: 'inputs' | 'reports', tenantId: string, labNo: string, ext: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `clients/${tenantId}/${type}/${year}/${month}/${labNo}${ext}`;
}

/**
 * Upload the client's input JSON to S3.
 * Returns the S3 key (path) for storage in MongoDB.
 */
export async function uploadInputJson(
  tenantId: string,
  labNo: string,
  jsonBody: unknown,
): Promise<string> {
  const key = buildKey('inputs', tenantId, labNo, '.json');
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: JSON.stringify(jsonBody, null, 2),
      ContentType: 'application/json',
    }),
  );
  return key;
}

/**
 * Upload a generated PDF to S3.
 * Returns the S3 key (path) for storage in MongoDB.
 */
export async function uploadReportPdf(
  tenantId: string,
  labNo: string,
  pdfBuffer: Buffer,
): Promise<string> {
  const key = buildKey('reports', tenantId, labNo, '.pdf');
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    }),
  );
  return key;
}
