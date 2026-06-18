# Design — Admin Mappings Module

## Overview

A new `/admin/mappings` area in the Next.js admin dashboard that surfaces the existing Portal API mapping endpoints. It is a single route with three tabs — **Global**, **Clients**, **Unmapped** — driven by URL search params, built entirely with the project's existing conventions: client components, TanStack Query, framer-motion, Tailwind, and the shared UI primitives (`PageHeader`, `Modal`, `StatusBadge`, `EmptyState`, `TableSkeleton`).

No backend changes are required; every action maps to an endpoint already implemented in `mapping.route.ts`.

## Architecture

### Route & file layout

```
portal-frontend/src/
├── app/admin/mappings/
│   └── page.tsx                      # Tab shell, reads ?tab / ?tenant from URL
├── components/mappings/
│   ├── global-mappings-tab.tsx       # Global list + filters + pagination
│   ├── global-mapping-modal.tsx      # Add/Edit global mapping
│   ├── client-mappings-tab.tsx       # Client selector + override list
│   ├── client-mapping-modal.tsx      # Add/Edit client override
│   ├── unmapped-tab.tsx              # Summary (all) + per-client monitor
│   ├── map-to-global-modal.tsx       # Resolve unmapped → global
│   ├── map-to-client-modal.tsx       # Resolve unmapped → client
│   ├── client-combobox.tsx           # Reusable searchable client picker
│   ├── standard-name-combobox.tsx    # Typeahead over global standard names
│   ├── aliases-input.tsx             # Tag-style multi-value input
│   └── tabs.tsx                      # Lightweight underline tab bar
└── lib/api/mappings.ts               # Typed endpoint wrappers + query keys
```

### Why a single route with tabs

The three concerns are tightly related (resolving an unmapped entry creates a global/client mapping). Keeping them on one route with URL-synced tabs lets us cross-link and preserve context (`?tab=clients&tenant=acme-labs`) without remounting the shell. This matches Requirement 1.3 and the cross-linking in Requirement 9.

### Data flow

```
page.tsx (reads useSearchParams: tab, tenant)
   │
   ├── <Tabs> ── updates URL via router.replace (shallow)
   │
   ├── tab=global   → <GlobalMappingsTab>   → useQuery(["mappings","global",filters])
   ├── tab=clients  → <ClientMappingsTab>   → useQuery(["mappings","client",tenant,filters])
   └── tab=unmapped → <UnmappedTab>         → useQuery(["mappings","unmapped",...])

Mutations → apiClient POST/DELETE → onSuccess: queryClient.invalidateQueries + toast
```

All fetching uses the existing `apiClient` from `lib/api/client.ts` (Bearer injection + refresh already handled). A thin `lib/api/mappings.ts` centralizes endpoint URLs, query-key factories, and response typing so components stay clean.

## Components and Interfaces

### `lib/api/mappings.ts`

Centralized, typed access layer.

```ts
// Query key factory — stable keys for cache control
export const mappingKeys = {
  all: ["mappings"] as const,
  global: (f: GlobalFilters) => ["mappings", "global", f] as const,
  globalProfiles: () => ["mappings", "global", "profiles"] as const,
  client: (tenantId: string, f: ClientFilters) => ["mappings", "client", tenantId, f] as const,
  unmappedSummary: () => ["mappings", "unmapped", "summary"] as const,
  unmappedByTenant: (tenantId: string, f: ListFilters) => ["mappings", "unmapped", tenantId, f] as const,
};

// Response shapes mirror shared types (client-safe, no ObjectId/Date — strings)
export interface GlobalMappingRow {
  _id: string;
  biomarkerId: string | null;
  standardName: string;
  profileName: string;
  aliases: string[];
  defaultUnit?: string | null;
  defaultRange?: { min?: number; max?: number } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
// ClientMappingRow, UnmappedRow, UnmappedSummaryRow similarly.

// Thin wrappers
export const fetchGlobalMappings = (qs: string) => apiClient<Paginated<GlobalMappingRow>>(`/admin/mappings/global?${qs}`);
export const upsertGlobalMapping = (body: GlobalMappingInput) => apiClient(`/admin/mappings/global`, { method: "POST", body: JSON.stringify(body) });
export const deactivateGlobalMapping = (name: string) => apiClient(`/admin/mappings/global/${encodeURIComponent(name)}`, { method: "DELETE" });
// ... client + unmapped wrappers
```

A shared `Paginated<T>` type matches `{ success, data: T[], meta }` from `buildPaginationMeta`.

### `page.tsx` (tab shell)

- `"use client"`. Reads `tab` (default `global`) and `tenant` from `useSearchParams`.
- Renders `PageHeader title="Mappings" subtitle="Standard test dictionary, client overrides, and unmapped monitoring"`.
- Renders `<Tabs>` with the three items; the Unmapped tab shows a count badge from a lightweight `unmappedSummary` query (sum of `totalCount`, or entry count).
- Switching tabs calls `router.replace("/admin/mappings?tab=...", { scroll: false })` preserving `tenant` when relevant.
- Wraps tab content in a `motion.div` keyed by tab for a subtle fade/slide on change.

### `tabs.tsx`

Small presentational underline tab bar (no external dep): a flex row of buttons, active item gets `text-blue-600` with an animated underline via framer-motion `layoutId`. Accepts `items: {key,label,badge?}[]`, `active`, `onChange`. Keeps look consistent with the blue accent used across the dashboard.

### Global tab — `global-mappings-tab.tsx`

- Filter row (matches `reports/page.tsx` styling): search input (debounced ~300ms), profile `<select>` (from `globalProfiles` query), active `<select>` (All / Active / Inactive), and "Add Mapping" primary button on the right.
- Table columns: Standard Name (bold), Profile, Biomarker ID (mono, `—` if null), Aliases (first 3 as chips + "+N"), Default Unit, Range (`min–max`), Status (`StatusBadge` active/inactive), Actions (Edit, Deactivate/Reactivate).
- Loading → `TableSkeleton`; empty → `EmptyState` (icon `Database`/`FlaskConical`).
- Pagination footer: Prev/Next + "Page X of Y" using `meta`. Simple page state in the component.
- Opens `GlobalMappingModal` for add/edit.

### `global-mapping-modal.tsx`

- Built on shared `Modal` (`maxWidth="max-w-lg"`).
- Fields: Standard Name (required; read-only when editing since it is the upsert key), Profile (required; combobox over existing profiles allowing free text), Biomarker ID, Aliases (`AliasesInput`), Default Unit, Default Range min/max (two number inputs), Active toggle.
- Client-side validation with a small zod schema mirroring `GlobalMappingSchema`; show inline errors and map API `fieldErrors` onto fields.
- Submit → `upsertGlobalMapping` → toast + invalidate `["mappings","global"]` and profiles.

### Clients tab — `client-mappings-tab.tsx`

- Top: `ClientCombobox` (searchable). Selection updates URL `tenant` param.
- If no tenant: `EmptyState` ("Select a client to view overrides") with the combobox prominent.
- If tenant: search input + "Add Override" button; table columns: External Code (mono), External Display, → Internal Standard Name (bold), Profile Override, Unit Override, Range Override, Status, Actions (Edit, Delete).
- Delete confirms inline (a small confirm popover or window.confirm-equivalent modal) then `DELETE`.
- Opens `ClientMappingModal`.

### `client-mapping-modal.tsx`

- Shared `Modal`. Fields: External Code (required; read-only on edit), External Display, Internal Standard Name (`StandardNameCombobox` typeahead → reduces typos, Req 6.2), Internal Profile Override, Unit Override, Range Override min/max, Active toggle.
- Submit → `upsertClientMapping(tenantId, body)` → toast + invalidate client list.

### Unmapped tab — `unmapped-tab.tsx`

- Mode switch at top: a segmented control "All Clients" vs a `ClientCombobox`. Mirrors the global/per-tenant split in the API.
- **All Clients mode** → `unmappedSummary` query. Columns: Test Name (bold), Total Occurrences (badge), Affected Clients (count), Last Seen, Actions (Map to Global, Dismiss). Map-to-Global from summary uses tenant placeholder `"_global"` (Req 8.6) — the endpoint ignores tenant for global upsert and deletes the log by testName.
- **Per-client mode** → `unmappedByTenant` query. Columns: Test Name, Observation ID (mono), Occurrences, First Seen, Last Seen, Actions (Map to Global, Map to Client, Dismiss). Header shows a "Notify Client" button.
- Search box filters by test name. Empty state is positive ("No unmapped tests — everything is resolved", icon `CheckCircle2`).
- Opens `MapToGlobalModal` / `MapToClientModal`.

### `map-to-global-modal.tsx` / `map-to-client-modal.tsx`

- Map to Global: Standard Name (required), Profile (combobox), Aliases (`AliasesInput`, pre-seeded with the raw `testName` lowercased). POST to `.../map-global`.
- Map to Client: Internal Standard Name (`StandardNameCombobox`, required). POST to `.../map-client`.
- On success: toast, close, invalidate the relevant unmapped query + the tab badge query, and the corresponding mappings list.

### Reusable sub-components

- **`client-combobox.tsx`**: wraps a search query against `GET /admin/clients?search=`; renders a button + dropdown list (using existing Radix popover already in deps, or a simple controlled dropdown). Returns `{tenantId, labName}`.
- **`standard-name-combobox.tsx`**: typeahead querying `GET /admin/mappings/global?search=` (limited), suggests `standardName` values; allows free text fallback.
- **`aliases-input.tsx`**: tag input — type + Enter adds a chip, Backspace removes last, each chip removable; normalizes to lowercase, dedupes.

## Data Models

Frontend mirrors of the shared types, with `ObjectId`/`Date` serialized as strings (the API returns JSON). Defined in `lib/api/mappings.ts`:

- `GlobalMappingRow` ↔ `GlobalTestMapping`
- `ClientMappingRow` ↔ `ClientTestMapping`
- `UnmappedRow` ↔ `UnmappedLogEntry`
- `UnmappedSummaryRow`: `{ testName, totalCount, tenantCount, tenants: string[], lastSeen }` (matches the summary aggregation projection)

Input types (`GlobalMappingInput`, `ClientMappingInput`, `MapGlobalInput`, `MapClientInput`) mirror the zod schemas in `mapping.route.ts` so payloads validate server-side on the first try.

## Endpoint mapping (coverage check)

| UI action | Endpoint | Method |
|---|---|---|
| Global list / search / filter | `/admin/mappings/global` | GET |
| Profile filter options | `/admin/mappings/global/profiles` | GET |
| Add/Edit global | `/admin/mappings/global` | POST |
| Deactivate global | `/admin/mappings/global/:name` | DELETE |
| Client override list | `/admin/mappings/clients/:tenantId` | GET |
| Add/Edit client override | `/admin/mappings/clients/:tenantId` | POST |
| Delete client override | `/admin/mappings/clients/:tenantId/:code` | DELETE |
| Unmapped summary (all) | `/admin/mappings/unmapped/summary` | GET |
| Unmapped per client | `/admin/mappings/unmapped/:tenantId` | GET |
| Map unmapped → global | `/admin/mappings/unmapped/:tenantId/:testName/map-global` | POST |
| Map unmapped → client | `/admin/mappings/unmapped/:tenantId/:testName/map-client` | POST |
| Dismiss unmapped | `/admin/mappings/unmapped/:tenantId/:testName` | DELETE |
| Notify client | `/admin/mappings/unmapped/:tenantId/notify` | POST |
| Client picker source | `/admin/clients` | GET |

Every endpoint in `mapping.route.ts` is now exercised by the UI. (`GET /admin/mappings/unmapped` flat list is covered implicitly; the all-clients view uses the richer `summary`.)

## Design System & Visual Details

To satisfy the emphasis on design, the module follows these rules pulled from existing pages:

- **Containers**: `bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden`, entered with `motion.div` `initial={{opacity:0,y:8}}` `animate={{opacity:1,y:0}}` `transition={{delay:0.1}}`.
- **Tables**: `w-full text-sm`, header row `bg-slate-50 border-b border-slate-200` with `font-medium text-slate-600`; rows `border-b border-slate-100 hover:bg-slate-50` and staggered `transition={{delay:i*0.03}}`.
- **Inputs/selects**: `border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600`.
- **Primary button**: `bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-blue-600/20` with a `Plus` icon (matches the Topbar "Quick Onboard").
- **Status**: reuse `StatusBadge` (`active`/`inactive` already styled).
- **Chips** (aliases/profiles): `px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono`.
- **Tabs**: underline indicator animated with framer-motion `layoutId="mapTabUnderline"`, active `text-blue-600`, inactive `text-slate-500 hover:text-slate-800`.
- **Icons**: `lucide-react` — `Database`/`FlaskConical` (global), `Building2` (clients), `AlertTriangle` (unmapped), `Wand2` (Map This), `CheckCircle2` (resolved empty state).
- **Counts/metrics**: small pill badges consistent with the report abnormal-count style (`bg-amber-50 text-amber-600` for unmapped counts, `bg-blue-50 text-blue-600` for neutral counts).

## Error Handling

- All mutations wrap `apiClient` in try/catch, show `toast.error(err.message)`, and keep the modal open so the admin can correct input.
- Validation errors (`code: VALIDATION_ERROR`) carrying `fieldErrors` are mapped onto the relevant form fields; a generic toast covers the rest.
- Queries rely on TanStack Query defaults already configured in `providers.tsx`; failed lists render an inline error row with a Retry button rather than a blank table.
- Destructive actions (deactivate global, delete client override, dismiss unmapped) require an explicit confirm step.

## Cross-linking (Requirement 9)

- **Report detail** (`app/admin/reports/[id]/page.tsx`): in the existing "Unmapped Parameters" block, add a link/button → `/admin/mappings?tab=unmapped&tenant=<report.tenantId>`.
- **Client detail** (`app/admin/clients/[tenantId]/page.tsx`): add a "Manage Mappings" action → `/admin/mappings?tab=clients&tenant=<tenantId>`.

These are additive edits to existing pages; no behavior of those pages changes otherwise.

## Testing Strategy

This project has no test runner configured (no test script in `portal-frontend/package.json`), so verification is build- and type-based, consistent with the rest of the codebase:

1. **Type safety**: `npx tsc --noEmit` (or rely on `next build`) passes for all new files.
2. **Build**: `npm run build` in `portal-frontend` succeeds.
3. **Lint**: `npm run lint` passes for new files.
4. **Manual smoke (documented in tasks)**: load each tab, run a search, open each modal, perform one create and one delete against the running API (admin@smartreport.com), and confirm the unmapped badge updates after a resolve.

Automated tests are intentionally out of scope to match the existing project setup; if a runner is added later, component tests for the modals and the api layer would be the priority.

## Assumptions

- The API's pagination response is `{ success, data, meta: { total, page, limit, totalPages } }` per `buildPaginationMeta`; the UI reads `meta.totalPages`/`meta.total`.
- The `notify` endpoint remains a stub (audit-log only) and the UI presents its returned message as-is; wiring real email is out of scope.
- `react-hook-form` + `zod` (already in deps) are used for modal forms to stay consistent with the onboarding form.
- Existing Radix popover/select packages in deps are available for the comboboxes; if friction arises, a minimal controlled dropdown is an acceptable fallback.
