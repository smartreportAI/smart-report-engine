const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const frontendDir = path.join(rootDir, 'portal-frontend');

console.log('=== Step 1: Preparing static data from MongoDB Atlas ===');
execSync('node scripts/prepare-static-data.js', { cwd: rootDir, stdio: 'inherit' });

runPipeline();

function runPipeline() {
  console.log('\n=== Step 2: Wrapping dynamic routes for static export ===');
  execSync('node scripts/setup-static-export.js', { cwd: rootDir, stdio: 'inherit' });

  let buildSucceeded = false;
  try {
    console.log('\n=== Step 3: Running next build with NEXT_EXPORT=true ===');
    execSync('npm run build', {
      cwd: frontendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NEXT_EXPORT: 'true'
      }
    });
    buildSucceeded = true;
    console.log('\nBuild succeeded!');
  } catch (err) {
    console.error('\nBuild failed:', err.message);
  } finally {
    console.log('\n=== Step 4: Restoring original dynamic components ===');
    execSync('node scripts/restore-after-export.js', { cwd: rootDir, stdio: 'inherit' });
  }

  if (!buildSucceeded) {
    process.exit(1);
  }

  console.log('\n=== Step 5: Packaging deploy.zip with Linux forward slashes ===');
  execSync('powershell -ExecutionPolicy Bypass -File scripts/create-zip.ps1', { cwd: rootDir, stdio: 'inherit' });

  const zipPath = path.join(frontendDir, 'deploy.zip');
  if (!fs.existsSync(zipPath)) {
    console.error('Error: deploy.zip was not created!');
    process.exit(1);
  }
  console.log(`deploy.zip size: ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n=== Step 6: Deploying to AWS Amplify ===');
  execSync('node scripts/deploy-amplify.js', { cwd: rootDir, stdio: 'inherit' });
}
