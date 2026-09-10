const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function prepare() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found in .env');

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const clients = await db.collection('clients').find({}, { projection: { tenantId: 1 } }).toArray();
  const reports = await db.collection('reports').find({}, { projection: { _id: 1 } }).toArray();

  const clientIds = Array.from(new Set([
    ...clients.map(c => c.tenantId).filter(Boolean),
    'apollo-labs', 'rajagiri', 'medall-diagnostics', 'thyrocare',
    'srl-diagnostics', 'neuberg-diagnostics', 'vijaya-diagnostics', 'demo',
    '_placeholder'
  ]));

  const reportIds = Array.from(new Set([
    ...reports.map(r => r._id.toString()),
    '_placeholder'
  ]));

  await client.close();

  const outDir = path.join(__dirname, '..', 'portal-frontend', 'src', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const data = {
    clients: clientIds,
    reports: reportIds
  };

  fs.writeFileSync(path.join(outDir, 'static-params.json'), JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Generated static-params.json: ${clientIds.length} clients, ${reportIds.length} reports.`);
}

prepare().catch(err => {
  console.error('Error preparing static data:', err);
  process.exit(1);
});
