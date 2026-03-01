/**
 * In-memory Prometheus-compatible metrics registry.
 *
 * Supports counters and duration observations (summaries).
 * All metric names are prefixed with "sre_" (Smart Report Engine).
 *
 * This is a lightweight, zero-dependency implementation suitable for
 * single-process deployments. For multi-instance, replace with
 * prom-client or OpenTelemetry.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Labels = Record<string, string>;

interface CounterEntry {
    value: number;
}

interface DurationEntry {
    count: number;
    sum: number;
    min: number;
    max: number;
}

// ---------------------------------------------------------------------------
// Internal storage
// ---------------------------------------------------------------------------

const counters = new Map<string, CounterEntry>();
const durations = new Map<string, DurationEntry>();

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

function labelsToKey(name: string, labels?: Labels): string {
    if (!labels || Object.keys(labels).length === 0) return name;
    const sorted = Object.entries(labels)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
    return `${name}{${sorted}}`;
}

function keyToPrometheus(key: string): string {
    return key;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Increments a counter metric by 1 (or a custom amount).
 *
 * @param name   - Metric name (e.g. "sre_ingestion_total").
 * @param labels - Optional key-value labels.
 * @param amount - Increment amount (default: 1).
 */
export function incrementCounter(
    name: string,
    labels?: Labels,
    amount: number = 1,
): void {
    const key = labelsToKey(name, labels);
    const entry = counters.get(key);
    if (entry) {
        entry.value += amount;
    } else {
        counters.set(key, { value: amount });
    }
}

/**
 * Records a duration observation for a metric.
 *
 * @param name       - Metric name (e.g. "sre_pdf_duration_ms").
 * @param durationMs - Duration in milliseconds.
 * @param labels     - Optional key-value labels.
 */
export function observeDuration(
    name: string,
    durationMs: number,
    labels?: Labels,
): void {
    const key = labelsToKey(name, labels);
    const entry = durations.get(key);
    if (entry) {
        entry.count++;
        entry.sum += durationMs;
        entry.min = Math.min(entry.min, durationMs);
        entry.max = Math.max(entry.max, durationMs);
    } else {
        durations.set(key, {
            count: 1,
            sum: durationMs,
            min: durationMs,
            max: durationMs,
        });
    }
}

/**
 * Returns all metrics in Prometheus text exposition format.
 *
 * Format:
 *   # HELP <name> <help text>
 *   # TYPE <name> counter|summary
 *   <name>{labels} <value>
 */
export function getMetricsText(): string {
    const lines: string[] = [];

    // Group counters by base name for HELP/TYPE headers
    const counterNames = new Set<string>();
    for (const key of counters.keys()) {
        const baseName = key.split('{')[0];
        counterNames.add(baseName);
    }

    for (const baseName of counterNames) {
        lines.push(`# HELP ${baseName} ${METRIC_HELP[baseName] ?? baseName}`);
        lines.push(`# TYPE ${baseName} counter`);

        for (const [key, entry] of counters) {
            if (key.split('{')[0] === baseName) {
                lines.push(`${keyToPrometheus(key)} ${entry.value}`);
            }
        }
        lines.push('');
    }

    // Duration metrics (as summary-style)
    const durationNames = new Set<string>();
    for (const key of durations.keys()) {
        const baseName = key.split('{')[0];
        durationNames.add(baseName);
    }

    for (const baseName of durationNames) {
        lines.push(`# HELP ${baseName} ${METRIC_HELP[baseName] ?? baseName}`);
        lines.push(`# TYPE ${baseName} summary`);

        for (const [key, entry] of durations) {
            if (key.split('{')[0] === baseName) {
                const promKey = keyToPrometheus(key);
                lines.push(`${promKey}_count ${entry.count}`);
                lines.push(`${promKey}_sum ${entry.sum.toFixed(1)}`);
                lines.push(`${promKey}_min ${entry.min.toFixed(1)}`);
                lines.push(`${promKey}_max ${entry.max.toFixed(1)}`);
                lines.push(`${promKey}_avg ${(entry.sum / entry.count).toFixed(1)}`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Retrieves the current value of a counter.
 * Useful for testing and internal inspection.
 */
export function getCounterValue(name: string, labels?: Labels): number {
    const key = labelsToKey(name, labels);
    return counters.get(key)?.value ?? 0;
}

/**
 * Retrieves duration statistics for a metric.
 */
export function getDurationStats(
    name: string,
    labels?: Labels,
): DurationEntry | null {
    const key = labelsToKey(name, labels);
    return durations.get(key) ?? null;
}

/**
 * Resets all metrics. Useful for testing.
 */
export function resetMetrics(): void {
    counters.clear();
    durations.clear();
}

// ---------------------------------------------------------------------------
// Metric name constants
// ---------------------------------------------------------------------------

/** Standard metric names used throughout the application. */
export const METRIC = {
    INGESTION_TOTAL: 'sre_ingestion_total',
    CACHE_HIT_TOTAL: 'sre_cache_hit_total',
    CACHE_MISS_TOTAL: 'sre_cache_miss_total',
    PDF_GENERATION_TOTAL: 'sre_pdf_generation_total',
    PDF_DURATION_MS: 'sre_pdf_duration_ms',
    REPORT_DURATION_MS: 'sre_report_duration_ms',
    SEVERITY_TOTAL: 'sre_severity_total',
    MAPPING_WARNING_TOTAL: 'sre_mapping_warning_total',
    AUDIT_TOTAL: 'sre_audit_total',
    ERROR_TOTAL: 'sre_error_total',
} as const;

/** Human-readable help text for each metric. */
const METRIC_HELP: Record<string, string> = {
    [METRIC.INGESTION_TOTAL]: 'Total number of report ingestion requests',
    [METRIC.CACHE_HIT_TOTAL]: 'Total number of cache hits',
    [METRIC.CACHE_MISS_TOTAL]: 'Total number of cache misses',
    [METRIC.PDF_GENERATION_TOTAL]: 'Total number of PDF generations',
    [METRIC.PDF_DURATION_MS]: 'PDF generation duration in milliseconds',
    [METRIC.REPORT_DURATION_MS]: 'Total report generation duration in milliseconds',
    [METRIC.SEVERITY_TOTAL]: 'Report severity distribution',
    [METRIC.MAPPING_WARNING_TOTAL]: 'Total mapping warnings encountered',
    [METRIC.AUDIT_TOTAL]: 'Total audit records saved',
    [METRIC.ERROR_TOTAL]: 'Total errors by type',
};
