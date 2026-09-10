const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const REGION = 'ap-south-1';
const APP_NAME = 'pragnya-admin-portal';
const BRANCH_NAME = 'main';
const ZIP_PATH = path.join(__dirname, '..', 'portal-frontend', 'deploy.zip');

function runAws(args) {
  return new Promise((resolve, reject) => {
    execFile('aws', args, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve(stdout);
        }
      }
    });
  });
}

function uploadZip(uploadUrl, zipFilePath) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(zipFilePath);
    const urlObj = new URL(uploadUrl);

    const options = {
      method: 'PUT',
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': fileData.length
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status code ${res.statusCode}`));
      }
    });

    req.on('error', reject);
    req.write(fileData);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('1. Checking caller identity...');
  const identity = await runAws(['sts', 'get-caller-identity']);
  console.log(`Using AWS Account: ${identity.Account} (${identity.Arn})`);

  console.log('2. Checking if Amplify app already exists...');
  const listApps = await runAws(['amplify', 'list-apps', '--region', REGION]);
  let app = (listApps.apps || []).find(a => a.name === APP_NAME);

  if (!app) {
    console.log(`Creating Amplify app "${APP_NAME}"...`);
    const customRules = JSON.stringify([
      {
        source: "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>",
        target: "/index.html",
        status: "200"
      },
      {
        source: "/<*>",
        target: "/index.html",
        status: "404-200"
      }
    ]);

    const created = await runAws([
      'amplify', 'create-app',
      '--name', APP_NAME,
      '--platform', 'WEB',
      '--region', REGION,
      '--custom-rules', customRules
    ]);
    app = created.app;
    console.log(`Created app! ID: ${app.appId}`);
  } else {
    console.log(`App already exists! ID: ${app.appId}`);
  }

  const appId = app.appId;

  console.log(`3. Checking branch "${BRANCH_NAME}"...`);
  try {
    await runAws(['amplify', 'get-branch', '--app-id', appId, '--branch-name', BRANCH_NAME, '--region', REGION]);
    console.log(`Branch "${BRANCH_NAME}" already exists.`);
  } catch {
    console.log(`Creating branch "${BRANCH_NAME}"...`);
    await runAws([
      'amplify', 'create-branch',
      '--app-id', appId,
      '--branch-name', BRANCH_NAME,
      '--stage', 'PRODUCTION',
      '--region', REGION
    ]);
    console.log(`Created branch "${BRANCH_NAME}".`);
  }

  console.log('4. Creating deployment session...');
  const deployment = await runAws([
    'amplify', 'create-deployment',
    '--app-id', appId,
    '--branch-name', BRANCH_NAME,
    '--region', REGION
  ]);

  const jobId = deployment.jobId;
  const zipUploadUrl = deployment.zipUploadUrl;
  console.log(`Deployment created! Job ID: ${jobId}`);

  console.log(`5. Uploading zip file (${(fs.statSync(ZIP_PATH).size / 1024 / 1024).toFixed(2)} MB)...`);
  await uploadZip(zipUploadUrl, ZIP_PATH);
  console.log('Upload complete.');

  console.log('6. Starting deployment...');
  await runAws([
    'amplify', 'start-deployment',
    '--app-id', appId,
    '--branch-name', BRANCH_NAME,
    '--job-id', jobId,
    '--region', REGION
  ]);

  console.log('7. Waiting for deployment to finish...');
  let status = 'PENDING';
  let attempts = 0;
  while (status !== 'SUCCEED' && status !== 'FAILED' && attempts < 30) {
    await sleep(4000);
    const jobRes = await runAws([
      'amplify', 'get-job',
      '--app-id', appId,
      '--branch-name', BRANCH_NAME,
      '--job-id', jobId,
      '--region', REGION
    ]);
    status = jobRes.job.summary.status;
    attempts++;
    console.log(`[Attempt ${attempts}] Status: ${status}`);
  }

  if (status === 'SUCCEED') {
    const liveUrl = `https://${BRANCH_NAME}.${app.defaultDomain}`;
    console.log('\n=============================================');
    console.log('🎉 DEPLOYMENT SUCCESSFUL!');
    console.log(`App ID: ${appId}`);
    console.log(`Live URL: ${liveUrl}`);
    console.log('=============================================\n');
  } else {
    throw new Error(`Deployment failed with status: ${status}`);
  }
}

main().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
