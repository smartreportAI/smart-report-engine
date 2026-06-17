export { getDb, closeDb } from './connection';
export { saveReport, saveFailedReport } from './report.service';
export { getClient, validateClient, decrementCredits, seedDemoClient } from './client.service';
export {
  ensureMappingIndexes,
  getAllGlobalMappings,
  getGlobalMappingById,
  getGlobalMappingByName,
  listGlobalMappings,
  upsertGlobalMapping,
  deactivateGlobalMapping,
  getGlobalProfileNames,
  getClientMappings,
  getClientMapping,
  upsertClientMapping,
  deactivateClientMapping,
  buildClientIdOverrides,
  buildClientProfileOverrides,
  logUnmappedParameter,
  listUnmappedLog,
  deleteUnmappedEntry,
} from './mapping.service';
export type { GlobalTestMapping, ClientTestMapping, UnmappedLogEntry } from './mapping.service';
export type { ReportDocument, ClientDocument } from '@smart-report/shared-types';
