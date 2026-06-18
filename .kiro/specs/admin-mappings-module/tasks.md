# Implementation Plan — Admin Mappings Module

- [x] 1. Build the API access layer and shared types
  - Create `portal-frontend/src/lib/api/mappings.ts` with the `Paginated<T>` type, row types (`GlobalMappingRow`, `ClientMappingRow`, `UnmappedRow`, `UnmappedSummaryRow`), input types, the `mappingKeys` query-key factory, and thin `apiClient` wrappers for every mapping endpoint plus the client list.
  - _Requirements: 2, 3, 4, 5, 6, 7, 8, 10.3_

- [x] 2. Create reusable sub-components
- [x] 2.1 Tab bar component
  - Create `components/mappings/tabs.tsx` — underline tab bar with framer-motion `layoutId` indicator, supporting `items` with optional badge counts, `active`, and `onChange`.
  - _Requirements: 1.2, 1.4_
- [x] 2.2 Aliases tag input
  - Create `components/mappings/aliases-input.tsx` — chip-style multi-value input (Enter to add, Backspace/× to remove), lowercases and dedupes values.
  - _Requirements: 3.6, 8.1_
- [x] 2.3 Client combobox
  - Create `components/mappings/client-combobox.tsx` — searchable client picker backed by `GET /admin/clients?search=`, returns `{tenantId, labName}`.
  - _Requirements: 5.1, 7.2_
- [x] 2.4 Standard-name combobox
  - Create `components/mappings/standard-name-combobox.tsx` — typeahead over `GET /admin/mappings/global?search=` suggesting `standardName`, with free-text fallback.
  - _Requirements: 6.2, 8.2_

- [x] 3. Build the page shell with URL-synced tabs
  - Create `app/admin/mappings/page.tsx` — `PageHeader`, `<Tabs>`, read/write `tab` and `tenant` via `useSearchParams`/`router.replace`, lazy-render the active tab in a keyed `motion.div`, and feed the unmapped badge count from a summary query.
  - _Requirements: 1.2, 1.3, 1.5, 10.4_

- [x] 4. Implement the Global mappings tab
- [x] 4.1 List, filters, pagination
  - Create `components/mappings/global-mappings-tab.tsx` — debounced search, profile filter (from profiles query), active filter, styled table, `TableSkeleton`/`EmptyState`, and Prev/Next pagination from `meta`.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
- [x] 4.2 Add/Edit modal
  - Create `components/mappings/global-mapping-modal.tsx` using shared `Modal`; standard name read-only on edit; wire `upsertGlobalMapping`, map `fieldErrors`, toast + invalidate on success.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 10.1, 10.2_
- [x] 4.3 Deactivate / reactivate
  - Add confirm-guarded Deactivate (`DELETE`) and Reactivate (upsert `isActive:true`) actions to rows; refresh list after.
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Implement the Client mappings tab
- [x] 5.1 Selector + list
  - Create `components/mappings/client-mappings-tab.tsx` — `ClientCombobox` synced to URL `tenant`, prompt state when none selected, search + table + pagination when selected.
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
- [x] 5.2 Add/Edit + delete
  - Create `components/mappings/client-mapping-modal.tsx` (external code read-only on edit, `StandardNameCombobox` for internal name); wire upsert, confirm-guarded delete, toast + invalidate.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2_

- [x] 6. Implement the Unmapped monitor tab
- [x] 6.1 All-clients summary + per-client views
  - Create `components/mappings/unmapped-tab.tsx` — mode switch (All Clients vs `ClientCombobox`), summary table and per-client table per design, search, positive empty state, and per-client "Notify Client" action.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.5_
- [x] 6.2 Resolve modals
  - Create `map-to-global-modal.tsx` (aliases pre-seeded with test name; `_global` tenant placeholder when from summary) and `map-to-client-modal.tsx`; wire the two map endpoints + confirm-guarded Dismiss; on success toast, remove entry, refresh badge and lists.
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.6_

- [x] 7. Add the sidebar navigation entry
  - Edit `components/ui/sidebar.tsx` — insert a "Mappings" item (icon `Database`, `match: "mappings"`) into `adminNav` between Reports and Users.
  - _Requirements: 1.1_

- [x] 8. Cross-link from existing screens
  - Edit `app/admin/reports/[id]/page.tsx` to link the Unmapped Parameters block to `/admin/mappings?tab=unmapped&tenant=<tenantId>`, and `app/admin/clients/[tenantId]/page.tsx` to add a "Mappings" link to `/admin/mappings?tab=clients&tenant=<tenantId>`.
  - _Requirements: 9.1, 9.2_

- [x] 9. Verify build, types, and lint
  - Ran `npm run build` in `portal-frontend`; fixed a pre-existing recharts v3 formatter type error in `day-distribution-chart.tsx` and `top-clients-chart.tsx` that was blocking the build. Build now compiles, type-checks, and `/admin/mappings` is in the route table.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
