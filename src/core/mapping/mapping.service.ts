import type {
    RawReportInput,
    RawProfileInput,
    RawParameterInput,
} from '../../domain/types/input.types';
import type { TenantConfig } from '../../modules/tenants/tenant.types';
import type { MappingResult } from './mapping.types';
import { buildMappingIndex, findMappingEntry } from './mapping.utils';

/**
 * Applies tenant-scoped parameter mapping to a RawReportInput.
 *
 * For each parameter in the input:
 *   1. Look up by `externalCode` (case-insensitive) in the tenant's mapping table.
 *   2. If not found, look up by `externalDisplay` (case-insensitive).
 *   3. If matched:
 *        - Replace `testName` with `internalParameterId`
 *        - Move parameter under `internalProfileName`
 *        - Apply `unitOverride` if provided
 *        - Apply `rangeOverride` if provided
 *   4. If not matched:
 *        - If `strictMapping` is enabled → throw an error
 *        - Otherwise → keep parameter unchanged, record as unmapped
 *
 * This function is **pure** — no side effects, no env access.
 * Mapping is deterministic: same input always produces same output.
 *
 * @param raw          - The raw report input from any adapter (JSON/FHIR/HL7).
 * @param tenantConfig - Tenant configuration that may include mapping rules.
 * @returns MappingResult with the mapped report and list of unmapped parameters.
 *
 * @throws {Error} if `strictMapping` is true and any parameter has no mapping entry.
 */
export function mapRawReportInput(
    raw: RawReportInput,
    tenantConfig: TenantConfig,
): MappingResult {
    const mappingConfig = tenantConfig.mapping;

    // No mapping config → pass through unchanged
    if (!mappingConfig || mappingConfig.parameters.length === 0) {
        return { report: raw, unmappedParameters: [] };
    }

    const index = buildMappingIndex(mappingConfig.parameters);
    const unmappedParameters: string[] = [];

    // Collect parameters into target profile buckets
    const profileMap = new Map<string, RawParameterInput[]>();

    for (const profile of raw.profiles) {
        for (const param of profile.parameters) {
            const entry = findMappingEntry(param.testName, index);

            if (entry) {
                // Mapped parameter → apply transformations
                const mappedParam: RawParameterInput = {
                    testName: entry.internalParameterId,
                    value: param.value,
                    unit: entry.unitOverride ?? param.unit,
                    referenceRange: entry.rangeOverride ?? param.referenceRange,
                };

                const targetProfile = entry.internalProfileName;

                if (!profileMap.has(targetProfile)) {
                    profileMap.set(targetProfile, []);
                }

                profileMap.get(targetProfile)!.push(mappedParam);
            } else {
                // Unmapped parameter
                if (tenantConfig.strictMapping) {
                    throw new Error(
                        `Strict mapping enabled: parameter "${param.testName}" has no mapping entry for tenant "${tenantConfig.tenantId}".`,
                    );
                }

                unmappedParameters.push(param.testName);

                // Keep parameter in its original profile
                const targetProfile = profile.profileName;

                if (!profileMap.has(targetProfile)) {
                    profileMap.set(targetProfile, []);
                }

                profileMap.get(targetProfile)!.push(param);
            }
        }
    }

    // Rebuild profiles from the grouped map
    const profiles: RawProfileInput[] = [];

    for (const [profileName, parameters] of profileMap) {
        profiles.push({ profileName, parameters });
    }

    return {
        report: {
            patientId: raw.patientId,
            patientName: raw.patientName,
            age: raw.age,
            gender: raw.gender,
            profiles,
        },
        unmappedParameters,
    };
}
