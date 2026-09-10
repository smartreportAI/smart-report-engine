const fs = require('fs');
const path = require('path');

const base = path.join(process.cwd(), 'portal-frontend', 'src', 'app', 'admin');
const staticParamsPath = path.join(process.cwd(), 'portal-frontend', 'src', 'data', 'static-params.json');

let staticParams = { clients: ['_placeholder'], reports: ['_placeholder'] };
if (fs.existsSync(staticParamsPath)) {
  try {
    staticParams = JSON.parse(fs.readFileSync(staticParamsPath, 'utf-8'));
  } catch (e) {
    console.warn('Could not read static-params.json, using defaults.');
  }
}

// 1. clients/[tenantId]
const cDir = path.join(base, 'clients', '[tenantId]');
if (fs.existsSync(path.join(cDir, 'page.tsx')) && !fs.existsSync(path.join(cDir, 'client-view.tsx'))) {
  fs.renameSync(path.join(cDir, 'page.tsx'), path.join(cDir, 'client-view.tsx'));
}
fs.writeFileSync(path.join(cDir, 'page.tsx'),
`import ClientDetailPage from "./client-view";
import staticParams from "@/data/static-params.json";

export function generateStaticParams() {
  return staticParams.clients.map((tenantId: string) => ({ tenantId }));
}

export default function Page() {
  return <ClientDetailPage />;
}
`);

// 2. clients/[tenantId]/edit
const eDir = path.join(cDir, 'edit');
if (fs.existsSync(path.join(eDir, 'page.tsx')) && !fs.existsSync(path.join(eDir, 'edit-view.tsx'))) {
  fs.renameSync(path.join(eDir, 'page.tsx'), path.join(eDir, 'edit-view.tsx'));
}
fs.writeFileSync(path.join(eDir, 'page.tsx'),
`import ClientEditPage from "./edit-view";
import staticParams from "@/data/static-params.json";

export function generateStaticParams() {
  return staticParams.clients.map((tenantId: string) => ({ tenantId }));
}

export default function Page() {
  return <ClientEditPage />;
}
`);

// 3. reports/[id]
const rDir = path.join(base, 'reports', '[id]');
if (fs.existsSync(path.join(rDir, 'page.tsx')) && !fs.existsSync(path.join(rDir, 'report-view.tsx'))) {
  fs.renameSync(path.join(rDir, 'page.tsx'), path.join(rDir, 'report-view.tsx'));
}
fs.writeFileSync(path.join(rDir, 'page.tsx'),
`import ReportDetailPage from "./report-view";
import staticParams from "@/data/static-params.json";

export function generateStaticParams() {
  return staticParams.reports.map((id: string) => ({ id }));
}

export default function Page() {
  return <ReportDetailPage />;
}
`);

console.log(`Configured static export wrappers for ${staticParams.clients.length} clients and ${staticParams.reports.length} reports.`);
