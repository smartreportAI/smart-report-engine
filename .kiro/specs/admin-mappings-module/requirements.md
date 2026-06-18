# Requirements — Admin Mappings Module

## Introduction

The Portal API already exposes a complete **test-mapping** backend (`portal-api/src/modules/admin/mapping.route.ts`) covering three concerns:

1. **Global mappings** — the canonical dictionary of standard test names, profiles, aliases, biomarker IDs, default units/ranges. Shared by all clients and read by the Report Engine's mapping pipeline.
2. **Client mappings** — per-tenant overrides that map a lab's own LIS observation codes to our standard names (plus optional unit/range/profile overrides).
3. **Unmapped log & monitoring** — every test name the engine could not resolve during report generation, aggregated so admins can discover gaps and fix them.

None of this is reachable from the admin dashboard today. There is no `/admin/mappings` page and no sidebar entry, even though the report-detail page already surfaces "Unmapped Parameters" with no way to act on them.

This module adds the **frontend** for all three concerns, wired to the existing endpoints, matching the established dashboard design system (Tailwind, framer-motion, shared components, TanStack Query). No backend changes are required except one optional gap noted below.

## Glossary

- **Global mapping**: A `GlobalTestMapping` document — system-wide standard test definition.
- **Client mapping**: A `ClientTestMapping` document — a tenant-specific external-code → standard-name override.
- **Unmapped entry**: An `UnmappedLogEntry` — a test the engine saw but could not map, with an occurrence count.
- **Standard name**: The canonical test name used throughout the engine (e.g. "Blood Sugar (Fasting)").
- **External code**: The raw `observationId` a client's LIS sends (e.g. "GLUF").
- **Profile**: The grouping a test belongs to (e.g. "Lipid Profile").
- **Map This**: A shortcut that converts an unmapped entry directly into a global or client mapping and removes it from the log.

## Requirements

### Requirement 1 — Mappings navigation & shell

**User Story:** As an admin, I want a dedicated Mappings area in the dashboard so I can manage global and client mappings and monitor unmapped tests from one place.

#### Acceptance Criteria

1. WHEN the admin views the sidebar THEN the system SHALL display a "Mappings" nav item (with a fitting icon) between "Reports" and "Users".
2. WHEN the admin navigates to `/admin/mappings` THEN the system SHALL render a tabbed page with three tabs: "Global", "Clients", and "Unmapped".
3. WHEN the admin clicks a tab THEN the system SHALL reflect the active tab in the URL (e.g. `?tab=global`) so the view is shareable and survives refresh.
4. WHEN the "Unmapped" tab has outstanding entries THEN the system SHALL show a count badge on that tab.
5. WHEN the page loads THEN the system SHALL apply the same layout, `PageHeader`, motion, and styling conventions used by existing admin pages.

### Requirement 2 — Global mappings: browse & search

**User Story:** As an admin, I want to browse and search the global test dictionary so I can verify and find standard mappings.

#### Acceptance Criteria

1. WHEN the Global tab loads THEN the system SHALL fetch `GET /admin/mappings/global` and display standard name, profile, biomarker ID, aliases, default unit/range, and active status in a table.
2. WHEN the admin types in the search box THEN the system SHALL query the endpoint with `search` (matching standard name, aliases, biomarker ID) and debounce input.
3. WHEN the admin selects a profile filter THEN the system SHALL pass `profileName`, with options loaded from `GET /admin/mappings/global/profiles`.
4. WHEN the admin toggles an active/inactive filter THEN the system SHALL pass `isActive`.
5. WHEN the list is loading THEN the system SHALL show the table skeleton; WHEN empty THEN an empty state.
6. WHEN there are more results than one page THEN the system SHALL provide pagination using the response `meta`.

### Requirement 3 — Global mappings: create & edit

**User Story:** As an admin, I want to add or edit a global mapping so the engine recognizes a test and its aliases.

#### Acceptance Criteria

1. WHEN the admin clicks "Add Mapping" THEN the system SHALL open a modal form for standard name, profile, biomarker ID, aliases, default unit, default range (min/max), and active flag.
2. WHEN the admin clicks Edit on a row THEN the system SHALL open the same modal pre-filled with that row's values.
3. WHEN the admin submits THEN the system SHALL POST to `/admin/mappings/global` (which upserts by standard name) and show a success toast.
4. IF the submission fails validation THEN the system SHALL surface the field errors returned by the API.
5. WHEN a save succeeds THEN the system SHALL invalidate and refetch the global list.
6. WHEN entering aliases THEN the system SHALL allow multiple values via a tag-style input and store them lowercase.

### Requirement 4 — Global mappings: deactivate

**User Story:** As an admin, I want to deactivate a global mapping so it is excluded from the pipeline without losing history.

#### Acceptance Criteria

1. WHEN the admin clicks Deactivate on a row THEN the system SHALL ask for confirmation before calling `DELETE /admin/mappings/global/:name`.
2. WHEN the deactivation succeeds THEN the system SHALL refresh the list and the row SHALL reflect inactive status (soft delete, not removed).
3. WHEN an item is already inactive THEN the system SHALL offer to re-activate it (re-save via upsert with `isActive: true`).

### Requirement 5 — Client mappings: select client & browse

**User Story:** As an admin, I want to pick a client and view their LIS code overrides so I can manage tenant-specific mappings.

#### Acceptance Criteria

1. WHEN the Clients tab loads THEN the system SHALL present a client selector populated from `GET /admin/clients` (searchable by tenantId/labName).
2. WHEN a client is selected THEN the system SHALL reflect it in the URL (e.g. `?tab=clients&tenant=acme-labs`) and fetch `GET /admin/mappings/clients/:tenantId`.
3. WHEN no client is selected THEN the system SHALL show a prompt to choose a client.
4. WHEN a client is selected THEN the system SHALL display external code, external display, internal standard name, profile override, unit override, range override, and active status in a table, with search and pagination.

### Requirement 6 — Client mappings: create, edit, delete

**User Story:** As an admin, I want to add, edit, and remove a client's code overrides so a lab's custom codes resolve correctly.

#### Acceptance Criteria

1. WHEN the admin clicks "Add Override" with a client selected THEN the system SHALL open a modal for external code, external display, internal standard name, profile override, unit override, range override, and active flag.
2. WHEN entering the internal standard name THEN the system SHALL offer suggestions from existing global mappings (typeahead) to reduce typos.
3. WHEN the admin submits THEN the system SHALL POST to `/admin/mappings/clients/:tenantId` (upsert by external code) and refresh the list.
4. WHEN the admin clicks Delete on a row THEN the system SHALL confirm, then call `DELETE /admin/mappings/clients/:tenantId/:code` (hard delete) and refresh.
5. WHEN the admin clicks Edit THEN the system SHALL open the modal pre-filled for that override.

### Requirement 7 — Unmapped monitor: global summary & per-client

**User Story:** As an admin, I want to see which tests are failing to map so I can prioritize fixes.

#### Acceptance Criteria

1. WHEN the Unmapped tab loads in "All clients" mode THEN the system SHALL fetch `GET /admin/mappings/unmapped/summary` and show each test name with total occurrences, number of affected tenants, and last-seen date, sorted by frequency.
2. WHEN the admin switches to a specific client THEN the system SHALL fetch `GET /admin/mappings/unmapped/:tenantId` and show that client's unmapped entries with occurrence count, first/last seen, and the raw observation ID.
3. WHEN the admin searches THEN the system SHALL pass `search` to filter by test name.
4. WHEN the list is empty THEN the system SHALL show a positive empty state ("No unmapped tests — everything is resolved").

### Requirement 8 — Unmapped monitor: resolve actions

**User Story:** As an admin, I want to resolve an unmapped test in one step so the gap is fixed and the entry clears.

#### Acceptance Criteria

1. WHEN the admin clicks "Map to Global" on an unmapped row THEN the system SHALL open a modal for standard name, profile, and aliases (pre-seeding aliases with the raw test name) and POST to `/admin/mappings/unmapped/:tenantId/:testName/map-global`.
2. WHEN the admin clicks "Map to Client" on an unmapped row THEN the system SHALL open a modal for the internal standard name (with global typeahead) and POST to `/admin/mappings/unmapped/:tenantId/:testName/map-client`.
3. WHEN either map action succeeds THEN the system SHALL show a toast, remove the entry from the list, and refresh the unmapped count badge.
4. WHEN the admin clicks "Dismiss" on a row THEN the system SHALL confirm, then call `DELETE /admin/mappings/unmapped/:tenantId/:testName`.
5. WHEN viewing a specific client's unmapped list THEN the system SHALL offer a "Notify Client" action that POSTs to `/admin/mappings/unmapped/:tenantId/notify` and shows the returned message.
6. WHEN a "Map to Global" action originates from the all-clients summary (no single tenant) THEN the system SHALL use a safe tenant placeholder accepted by the endpoint, since global mapping is tenant-agnostic.

### Requirement 9 — Cross-linking from existing screens

**User Story:** As an admin, I want to jump to mappings from where I notice problems so resolving gaps is fast.

#### Acceptance Criteria

1. WHEN the admin views a report with unmapped parameters on the report-detail page THEN the system SHALL offer a link to the Unmapped tab filtered to that report's client.
2. WHEN the admin views a client detail page THEN the system SHALL offer a link to that client's mappings (`/admin/mappings?tab=clients&tenant=<tenantId>`).

### Requirement 10 — Consistency, feedback, and resilience

**User Story:** As an admin, I want the mappings UI to behave like the rest of the dashboard so it feels reliable.

#### Acceptance Criteria

1. WHEN any mutation runs THEN the system SHALL disable the submit control and show a pending state until it resolves.
2. WHEN any request fails THEN the system SHALL show an error toast with the API message and leave existing data intact.
3. WHEN data is fetched THEN the system SHALL use TanStack Query with stable query keys and cache invalidation consistent with other admin pages.
4. WHEN the module is accessed THEN the system SHALL be protected by the existing `AuthGuard` admin layout (admin/superadmin only).
5. WHEN rendering tables, modals, badges, and empty/loading states THEN the system SHALL reuse the existing shared components (`PageHeader`, `Modal`, `StatusBadge`, `EmptyState`, `TableSkeleton`) and styling tokens.

## Out of Scope

- Backend route changes, except optionally implementing real email sending behind the existing `notify` endpoint (currently a TODO that only writes an audit log). The frontend will call it as-is.
- Bulk import/export of mappings (CSV) — can be a later enhancement.
- Editing the engine's mapping pipeline behavior.
