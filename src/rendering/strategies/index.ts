import type { ReportStrategy } from './report-strategy.types';
import type { ReportType } from '../../modules/tenants/tenant.types';
import { essentialStrategy } from './essential.strategy';
import { inDepthStrategy } from './indepth.strategy';

/**
 * Resolves the correct ReportStrategy from a ReportType.
 * Pure function — no tenant-ID branching.
 */
export function resolveStrategy(reportType: ReportType): ReportStrategy {
    switch (reportType) {
        case 'essential':
            return essentialStrategy;
        case 'inDepth':
            return inDepthStrategy;
        default: {
            // Exhaustive check — TypeScript will error here if a new ReportType is added
            // without handling it in this switch.
            const _exhaustive: never = reportType;
            throw new Error(`Unknown reportType: ${String(_exhaustive)}`);
        }
    }
}

export type { ReportStrategy } from './report-strategy.types';
