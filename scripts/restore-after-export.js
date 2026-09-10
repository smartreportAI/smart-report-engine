const fs = require('fs');
const path = require('path');

const base = path.join(process.cwd(), 'portal-frontend', 'src', 'app', 'admin');

// 1. clients/[tenantId]
const cDir = path.join(base, 'clients', '[tenantId]');
if (fs.existsSync(path.join(cDir, 'client-wrapper.tsx'))) {
  fs.unlinkSync(path.join(cDir, 'client-wrapper.tsx'));
}
if (fs.existsSync(path.join(cDir, 'client-view.tsx'))) {
  if (fs.existsSync(path.join(cDir, 'page.tsx'))) {
    fs.unlinkSync(path.join(cDir, 'page.tsx'));
  }
  fs.renameSync(path.join(cDir, 'client-view.tsx'), path.join(cDir, 'page.tsx'));
}

// 2. clients/[tenantId]/edit
const eDir = path.join(cDir, 'edit');
if (fs.existsSync(path.join(eDir, 'client-wrapper.tsx'))) {
  fs.unlinkSync(path.join(eDir, 'client-wrapper.tsx'));
}
if (fs.existsSync(path.join(eDir, 'edit-view.tsx'))) {
  if (fs.existsSync(path.join(eDir, 'page.tsx'))) {
    fs.unlinkSync(path.join(eDir, 'page.tsx'));
  }
  fs.renameSync(path.join(eDir, 'edit-view.tsx'), path.join(eDir, 'page.tsx'));
}

// 3. reports/[id]
const rDir = path.join(base, 'reports', '[id]');
if (fs.existsSync(path.join(rDir, 'client-wrapper.tsx'))) {
  fs.unlinkSync(path.join(rDir, 'client-wrapper.tsx'));
}
if (fs.existsSync(path.join(rDir, 'report-view.tsx'))) {
  if (fs.existsSync(path.join(rDir, 'page.tsx'))) {
    fs.unlinkSync(path.join(rDir, 'page.tsx'));
  }
  fs.renameSync(path.join(rDir, 'report-view.tsx'), path.join(rDir, 'page.tsx'));
}

console.log('Successfully restored original dynamic page components and removed wrappers.');
